import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { ADMIN_USERNAME, adminMiddleware } from '../middleware/admin.js'
import { hashPassword } from '../utils/password.js'
import { deleteClassData, deleteUserData, DEMO_CLASS_ID } from '../utils/adminCleanup.js'
import { normalizeVipRow } from './vip.js'

const router = Router()

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

export default router
