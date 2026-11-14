import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { ADMIN_USERNAME, adminMiddleware } from '../middleware/admin.js'
import { hashPassword, verifyPassword } from '../utils/password.js'
import { deleteClassData, deleteUserData, DEMO_CLASS_ID } from '../utils/adminCleanup.js'
import { normalizeVipRow } from './vip.js'
import { generateAdminPanelToken, PANEL_TTL_MS } from '../utils/adminPanelToken.js'
import { loginRateLimit } from '../middleware/rateLimit.js'
import { resetDemoData } from '../demo-seed.js'
import { DEFAULT_TIMEZONE, getMillisecondsUntilNextMidnight } from '../utils/demoResetScheduler.js'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function getDemoResetTimezone() {
  return process.env.DEMO_RESET_TIMEZONE || DEFAULT_TIMEZONE
}

function getStartOfTodayMs(timeZone, now = Date.now()) {
  return now - (ONE_DAY_MS - getMillisecondsUntilNextMidnight(timeZone, now))
}

async function countTeacherRegistrationsSince(sinceMs) {
  const row = await db.prepare(`
    SELECT COUNT(*) AS count
    FROM users
    WHERE is_guest = 0 AND LOWER(username) != LOWER(?)
      AND created_at >= ?
  `).get(ADMIN_USERNAME, sinceMs)
  return row?.count || 0
}

async function buildOperationsOverview() {
  const now = Date.now()
  const timeZone = getDemoResetTimezone()
  const startOfToday = getStartOfTodayMs(timeZone, now)
  const startOf7Days = startOfToday - 6 * ONE_DAY_MS

  const [
    registrationsToday,
    registrations7Days,
    totalClassesRow,
    activeClassesRow,
    evaluationRow,
    vipActiveRow,
    vipExpiringSoon,
  ] = await Promise.all([
    countTeacherRegistrationsSince(startOfToday),
    countTeacherRegistrationsSince(startOf7Days),
    db.prepare('SELECT COUNT(*) AS total_classes FROM classes').get(),
    db.prepare(`
      SELECT COUNT(DISTINCT s.class_id) AS active_classes
      FROM students s
      JOIN classes c ON c.id = s.class_id
      WHERE c.id != ?
    `).get(DEMO_CLASS_ID),
    db.prepare('SELECT COUNT(*) AS count FROM evaluation_records').get(),
    db.prepare(`
      SELECT COUNT(*) AS count
      FROM class_vip_subscriptions
      WHERE status = 'active' AND expires_at > ?
        AND class_id != ?
    `).get(now, DEMO_CLASS_ID),
    db.prepare(`
      SELECT c.id, c.name, v.expires_at AS expires_at, v.plan
      FROM class_vip_subscriptions v
      JOIN classes c ON c.id = v.class_id
      WHERE v.class_id != ?
        AND v.status = 'active'
        AND v.expires_at > ?
        AND v.expires_at <= ?
      ORDER BY v.expires_at ASC
      LIMIT 20
    `).all(DEMO_CLASS_ID, now, now + 7 * ONE_DAY_MS),
  ])

  return {
    generatedAt: now,
    timeZone,
    registrationsToday,
    registrations7Days,
    totalClasses: totalClassesRow?.total_classes || 0,
    activeClasses: activeClassesRow?.active_classes || 0,
    totalEvaluations: evaluationRow?.count || 0,
    vipActiveCount: vipActiveRow?.count || 0,
    vipExpiringSoon: vipExpiringSoon.map(row => ({
      classId: row.id,
      className: row.name,
      plan: row.plan,
      expiresAt: row.expires_at,
    })),
  }
}

async function getGuestUserId() {
  const guest = await db.prepare('SELECT id FROM users WHERE username = ?').get('guest')
  return guest?.id ?? null
}

async function buildDemoPanelInfo() {
  const timeZone = getDemoResetTimezone()
  const now = Date.now()
  const msUntilReset = getMillisecondsUntilNextMidnight(timeZone, now)
  const nextResetAt = now + msUntilReset
  const studentCountRow = await db.prepare('SELECT COUNT(*) AS count FROM students WHERE class_id = ?').get(DEMO_CLASS_ID)
  const classRow = await db.prepare('SELECT id, name FROM classes WHERE id = ?').get(DEMO_CLASS_ID)

  return {
    timeZone,
    nextResetAt,
    msUntilReset,
    classId: DEMO_CLASS_ID,
    className: classRow?.name || '演示班级',
    exists: !!classRow,
    studentCount: studentCountRow?.count || 0,
    schedule: '每日 0 点（北京时间）自动重置',
  }
}

const router = Router()

router.post('/unlock', loginRateLimit, async (req, res) => {
  const password = String(req.body?.password || '')
  if (!password) {
    return res.status(401).json({ error: '密码错误' })
  }

  const adminUser = await db.prepare('SELECT password_hash FROM users WHERE username = ? AND is_guest = 0').get(ADMIN_USERNAME)
  if (!adminUser || !verifyPassword(password, adminUser.password_hash)) {
    return res.status(401).json({ error: '密码错误' })
  }

  const adminPanelToken = generateAdminPanelToken()
  res.json({
    success: true,
    adminPanelToken,
    expiresInMs: PANEL_TTL_MS,
  })
})

router.use(adminMiddleware)

async function getClassById(classId) {
  return await db.prepare(`
    SELECT c.id, c.name, c.user_id, u.username AS owner_username, u.is_guest AS owner_is_guest
    FROM classes c
    LEFT JOIN users u ON u.id = c.user_id
    WHERE c.id = ?
  `).get(classId)
}

async function listAllClassesWithVip() {
  const classes = await db.prepare(`
    SELECT
      c.id,
      c.name,
      c.created_at,
      c.user_id,
      u.username AS owner_username,
      u.is_guest AS owner_is_guest,
      (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count
    FROM classes c
    LEFT JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at DESC
  `).all()

  const vipRows = await db.prepare('SELECT * FROM class_vip_subscriptions').all()
  const vipMap = Object.fromEntries(vipRows.map(row => [row.class_id, normalizeVipRow(row)]))

  return classes.map(cls => ({
    id: cls.id,
    name: cls.name,
    studentCount: cls.student_count || 0,
    createdAt: cls.created_at,
    ownerUsername: cls.owner_username || '未知',
    ownerIsGuest: !!cls.owner_is_guest,
    isDemo: cls.id === DEMO_CLASS_ID,
    vip: vipMap[cls.id] || null,
  }))
}

router.get('/classes', async (req, res) => {
  const classes = await listAllClassesWithVip()
  const activeCount = classes.filter(cls => cls.vip?.isActive).length

  res.json({
    classes,
    summary: {
      totalClasses: classes.length,
      activeVipCount: activeCount,
      inactiveCount: classes.length - activeCount,
    },
  })
})

router.put('/classes/:id', async (req, res) => {
  const { name } = req.body
  const trimmedName = String(name || '').trim()
  if (!trimmedName) {
    return res.status(400).json({ error: '班级名称不能为空' })
  }

  const classInfo = await getClassById(req.params.id)
  if (!classInfo) {
    return res.status(404).json({ error: '班级不存在' })
  }

  const now = Date.now()
  await db.prepare('UPDATE classes SET name = ?, updated_at = ? WHERE id = ?').run(trimmedName, now, req.params.id)
  res.json({ success: true })
})

router.delete('/classes/:id', async (req, res) => {
  const classInfo = await getClassById(req.params.id)
  if (!classInfo) {
    return res.status(404).json({ error: '班级不存在' })
  }
  if (req.params.id === DEMO_CLASS_ID) {
    return res.status(400).json({ error: '演示班级不能删除' })
  }

  const classId = req.params.id
  await deleteClassData(db, classId)

  res.json({ success: true })
})

router.put('/vip/authorize', async (req, res) => {
  const { classId, isVip, expiresAt } = req.body
  if (!classId) {
    return res.status(400).json({ error: '请选择班级' })
  }

  const classInfo = await getClassById(classId)
  if (!classInfo) {
    return res.status(404).json({ error: '班级不存在' })
  }
  if (classId === DEMO_CLASS_ID) {
    return res.status(400).json({ error: '演示班级不支持 VIP 授权' })
  }

  const now = Date.now()
  const existing = await db.prepare('SELECT * FROM class_vip_subscriptions WHERE class_id = ?').get(classId)

  if (!isVip) {
    if (existing) {
      await db.prepare('DELETE FROM class_vip_subscriptions WHERE class_id = ?').run(classId)
    }
    return res.json({
      success: true,
      classId,
      className: classInfo.name,
      vip: null,
      message: '已取消 VIP 授权',
    })
  }

  const parsedExpiresAt = Number(expiresAt)
  if (!parsedExpiresAt || Number.isNaN(parsedExpiresAt)) {
    return res.status(400).json({ error: '请设置有效的 VIP 到期时间' })
  }
  if (parsedExpiresAt <= now) {
    return res.status(400).json({ error: 'VIP 到期时间必须晚于当前时间' })
  }

  const startedAt = existing?.started_at || now
  if (existing) {
    await db.prepare(`
      UPDATE class_vip_subscriptions
      SET plan = 'manual', status = 'active', started_at = ?, expires_at = ?, updated_at = ?
      WHERE class_id = ?
    `).run(startedAt, parsedExpiresAt, now, classId)
  } else {
    await db.prepare(`
      INSERT INTO class_vip_subscriptions (id, class_id, plan, status, started_at, expires_at, created_at, updated_at)
      VALUES (?, ?, 'manual', 'active', ?, ?, ?, ?)
    `).run(uuidv4(), classId, startedAt, parsedExpiresAt, now, now)
  }

  const vip = normalizeVipRow(
    await db.prepare('SELECT * FROM class_vip_subscriptions WHERE class_id = ?').get(classId)
  )

  res.json({
    success: true,
    classId,
    className: classInfo.name,
    vip,
    message: 'VIP 授权已保存',
  })
})

async function listAllMembers() {
  const rows = await db.prepare(`
    SELECT
      u.id,
      u.username,
      u.created_at,
      (SELECT COUNT(*) FROM classes c WHERE c.user_id = u.id) AS class_count,
      (
        SELECT COUNT(*)
        FROM students s
        JOIN classes c ON s.class_id = c.id
        WHERE c.user_id = u.id
      ) AS student_count
    FROM users u
    WHERE u.is_guest = 0 AND LOWER(u.username) != LOWER(?)
    ORDER BY u.created_at DESC
  `).all(ADMIN_USERNAME)

  return rows.map(row => ({
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
    classCount: row.class_count || 0,
    studentCount: row.student_count || 0,
  }))
}

router.get('/users', async (req, res) => {
  const members = await listAllMembers()
  res.json({
    members,
    summary: {
      totalMembers: members.length,
      totalClasses: members.reduce((sum, item) => sum + item.classCount, 0),
      totalStudents: members.reduce((sum, item) => sum + item.studentCount, 0),
    },
  })
})

router.put('/users/:id/password', async (req, res) => {
  const { password } = req.body
  const trimmedPassword = String(password || '')
  if (trimmedPassword.length < 6) {
    return res.status(400).json({ error: '密码至少6位' })
  }

  const user = await db.prepare('SELECT id, username, is_guest FROM users WHERE id = ?').get(req.params.id)
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }
  if (user.is_guest) {
    return res.status(400).json({ error: '不能修改游客账户密码' })
  }
  if (user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
    return res.status(400).json({ error: '不能在此修改管理员密码' })
  }

  await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hashPassword(trimmedPassword), user.id)
  res.json({ success: true, message: '密码已重置' })
})

router.delete('/users/:id', async (req, res) => {
  if (req.params.id === req.userId) {
    return res.status(400).json({ error: '不能删除当前登录账户' })
  }

  const user = await db.prepare('SELECT id, username, is_guest FROM users WHERE id = ?').get(req.params.id)
  if (!user) {
    return res.status(404).json({ error: '用户不存在' })
  }
  if (user.is_guest) {
    return res.status(400).json({ error: '不能删除游客账户' })
  }
  if (user.username.toLowerCase() === ADMIN_USERNAME.toLowerCase()) {
    return res.status(400).json({ error: '不能删除管理员账户' })
  }

  await deleteUserData(db, user.id)
  res.json({ success: true })
})

router.get('/overview', async (req, res) => {
  const overview = await buildOperationsOverview()
  res.json(overview)
})

router.get('/demo', async (req, res) => {
  const demo = await buildDemoPanelInfo()
  res.json(demo)
})

router.post('/demo/reset', async (req, res) => {
  const guestUserId = await getGuestUserId()
  if (!guestUserId) {
    return res.status(500).json({ error: '未找到游客账户，无法重置演示班' })
  }
  try {
    const result = await resetDemoData(db, guestUserId)
    const demo = await buildDemoPanelInfo()
    res.json({
      success: true,
      message: `演示班已重置：${result.className || demo.className}（${result.students ?? demo.studentCount} 名学生）`,
      demo,
      result,
    })
  } catch (error) {
    console.error('手动重置演示班失败:', error)
    res.status(500).json({ error: '演示班重置失败，请稍后重试' })
  }
})

export default router
