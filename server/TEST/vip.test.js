import { describe, it, expect, beforeEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { VIP_PLANS } from '../routes/vip.js'
import { setupTestDb } from './testDb.js'

const DEMO_CLASS_ID = 'demo-class-2026'
const DAY_MS = 24 * 60 * 60 * 1000

async function listClassVipOverview(db, userId) {
  const classes = await db.prepare(`
    SELECT
      c.id,
      c.name,
      c.created_at,
      (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count
    FROM classes c
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `).all(userId)

  const vipRows = await db.prepare(`
    SELECT v.*
    FROM class_vip_subscriptions v
    JOIN classes c ON c.id = v.class_id
    WHERE c.user_id = ?
  `).all(userId)

  const vipMap = Object.fromEntries(vipRows.map(row => [row.class_id, row]))
  const now = Date.now()

  return classes.map(cls => {
    const vip = vipMap[cls.id]
    const isExpired = vip ? vip.expires_at <= now : false
    return {
      id: cls.id,
      name: cls.name,
      studentCount: cls.student_count || 0,
      isDemo: cls.id === DEMO_CLASS_ID,
      vip: vip
        ? {
            plan: vip.plan,
            status: isExpired ? 'expired' : vip.status,
            expiresAt: vip.expires_at,
            isActive: !isExpired && vip.status === 'active',
          }
        : null,
    }
  })
}

async function subscribeClassVip(db, { classId, plan, userId }) {
  if (!VIP_PLANS[plan]) {
    return { error: '无效的会员方案', status: 400 }
  }

  const classInfo = await db.prepare('SELECT id, name, user_id FROM classes WHERE id = ?').get(classId)
  if (!classInfo) {
    return { error: '班级不存在', status: 404 }
  }
  if (classInfo.user_id !== userId) {
    return { error: '无权操作此班级', status: 403 }
  }
  if (classId === DEMO_CLASS_ID) {
    return { error: '演示班级不支持开通会员', status: 400 }
  }

  const now = Date.now()
  const planInfo = VIP_PLANS[plan]
  const existing = await db.prepare('SELECT * FROM class_vip_subscriptions WHERE class_id = ?').get(classId)

  let startedAt = now
  let expiresAt = now + planInfo.days * DAY_MS

  if (existing && existing.expires_at > now) {
    startedAt = existing.started_at
    expiresAt = existing.expires_at + planInfo.days * DAY_MS
  }

  if (existing) {
    await db.prepare(`
      UPDATE class_vip_subscriptions
      SET plan = ?, status = 'active', started_at = ?, expires_at = ?, updated_at = ?
      WHERE class_id = ?
    `).run(plan, startedAt, expiresAt, now, classId)
  } else {
    await db.prepare(`
      INSERT INTO class_vip_subscriptions (id, class_id, plan, status, started_at, expires_at, created_at, updated_at)
      VALUES (?, ?, ?, 'active', ?, ?, ?, ?)
    `).run(uuidv4(), classId, plan, startedAt, expiresAt, now, now)
  }

  const vip = await db.prepare('SELECT * FROM class_vip_subscriptions WHERE class_id = ?').get(classId)
  return {
    success: true,
    classId,
    className: classInfo.name,
    vip,
  }
}

async function authorizeClassVip(db, { classId, isVip, expiresAt, userId }) {
  const classInfo = await db.prepare('SELECT id, name, user_id FROM classes WHERE id = ?').get(classId)
  if (!classInfo) {
    return { error: '班级不存在', status: 404 }
  }
  if (classInfo.user_id !== userId) {
    return { error: '无权操作此班级', status: 403 }
  }
  if (classId === DEMO_CLASS_ID) {
    return { error: '演示班级不支持开通会员', status: 400 }
  }

  const now = Date.now()
  const existing = await db.prepare('SELECT * FROM class_vip_subscriptions WHERE class_id = ?').get(classId)

  if (!isVip) {
    if (existing) {
      await db.prepare('DELETE FROM class_vip_subscriptions WHERE class_id = ?').run(classId)
    }
    return { success: true, classId, vip: null }
  }

  const parsedExpiresAt = Number(expiresAt)
  if (!parsedExpiresAt || Number.isNaN(parsedExpiresAt)) {
    return { error: '请设置有效的 VIP 到期时间', status: 400 }
  }
  if (parsedExpiresAt <= now) {
    return { error: 'VIP 到期时间必须晚于当前时间', status: 400 }
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

  const vip = await db.prepare('SELECT * FROM class_vip_subscriptions WHERE class_id = ?').get(classId)
  return { success: true, classId, vip }
}

describe('班级会员订阅', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()

    await db.prepare(`INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
      .run('class-a', 'teacher-1', '三年一班', Date.now(), Date.now())
    await db.prepare(`INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
      .run('class-b', 'teacher-1', '三年二班', Date.now(), Date.now())
    await db.prepare(`INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
      .run(DEMO_CLASS_ID, 'guest-1', '演示班级', Date.now(), Date.now())

    await db.prepare(`INSERT INTO students (id, class_id, name) VALUES (?, ?, ?)`).run('s1', 'class-a', '小明')
    await db.prepare(`INSERT INTO students (id, class_id, name) VALUES (?, ?, ?)`).run('s2', 'class-a', '小红')
    await db.prepare(`INSERT INTO students (id, class_id, name) VALUES (?, ?, ?)`).run('s3', 'class-b', '小刚')
  })

  it('按老师列出各班级会员状态', async () => {
    const overview = await listClassVipOverview(db, 'teacher-1')
    expect(overview).toHaveLength(2)
    expect(overview.every(item => !item.isDemo)).toBe(true)
    expect(overview.find(item => item.id === 'class-a')?.studentCount).toBe(2)
    expect(overview.every(item => item.vip === null)).toBe(true)
  })

  it('可为单个班级开通月度会员', async () => {
    const result = await subscribeClassVip(db, { classId: 'class-a', plan: 'month', userId: 'teacher-1' })
    expect(result.success).toBe(true)
    expect(result.vip.plan).toBe('month')
    expect(result.vip.expires_at).toBeGreaterThan(Date.now() + 29 * DAY_MS)
  })

  it('可为单个班级开通会员', async () => {
    const result = await subscribeClassVip(db, { classId: 'class-a', plan: 'year', userId: 'teacher-1' })
    expect(result.success).toBe(true)
    expect(result.className).toBe('三年一班')

    const overview = await listClassVipOverview(db, 'teacher-1')
    const classA = overview.find(item => item.id === 'class-a')
    const classB = overview.find(item => item.id === 'class-b')

    expect(classA?.vip?.isActive).toBe(true)
    expect(classA?.vip?.plan).toBe('year')
    expect(classB?.vip).toBeNull()
  })

  it('演示班级不能开通会员', async () => {
    const result = await subscribeClassVip(db, { classId: DEMO_CLASS_ID, plan: 'semester', userId: 'guest-1' })
    expect(result.error).toBe('演示班级不支持开通会员')
    expect(result.status).toBe(400)
  })

  it('续费会在原到期时间上叠加时长', async () => {
    const first = await subscribeClassVip(db, { classId: 'class-b', plan: 'semester', userId: 'teacher-1' })
    const firstExpiresAt = first.vip.expires_at

    const renewed = await subscribeClassVip(db, { classId: 'class-b', plan: 'year', userId: 'teacher-1' })
    expect(renewed.vip.expires_at).toBe(firstExpiresAt + VIP_PLANS.year.days * DAY_MS)
    expect(renewed.vip.plan).toBe('year')
  })

  it('不能操作其他老师的班级', async () => {
    const result = await subscribeClassVip(db, { classId: 'class-a', plan: 'year', userId: 'teacher-2' })
    expect(result.error).toBe('无权操作此班级')
    expect(result.status).toBe(403)
  })

  it('可手动授权班级 VIP 并设置到期时间', async () => {
    const expiresAt = Date.now() + 30 * DAY_MS
    const result = await authorizeClassVip(db, {
      classId: 'class-a',
      isVip: true,
      expiresAt,
      userId: 'teacher-1',
    })
    expect(result.success).toBe(true)
    expect(result.vip.plan).toBe('manual')
    expect(result.vip.expires_at).toBe(expiresAt)

    const overview = await listClassVipOverview(db, 'teacher-1')
    const classA = overview.find(item => item.id === 'class-a')
    expect(classA?.vip?.isActive).toBe(true)
  })

  it('可取消班级 VIP 授权', async () => {
    const expiresAt = Date.now() + 30 * DAY_MS
    await authorizeClassVip(db, { classId: 'class-b', isVip: true, expiresAt, userId: 'teacher-1' })

    const result = await authorizeClassVip(db, {
      classId: 'class-b',
      isVip: false,
      userId: 'teacher-1',
    })
    expect(result.success).toBe(true)
    expect(result.vip).toBeNull()

    const overview = await listClassVipOverview(db, 'teacher-1')
    const classB = overview.find(item => item.id === 'class-b')
    expect(classB?.vip).toBeNull()
  })

  it('手动授权时到期时间必须晚于当前时间', async () => {
    const result = await authorizeClassVip(db, {
      classId: 'class-a',
      isVip: true,
      expiresAt: Date.now() - DAY_MS,
      userId: 'teacher-1',
    })
    expect(result.error).toBe('VIP 到期时间必须晚于当前时间')
    expect(result.status).toBe(400)
  })
})
