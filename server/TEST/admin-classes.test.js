import { describe, it, expect, beforeEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { setupTestDb } from './testDb.js'

const DEMO_CLASS_ID = 'demo-class-2026'
const DAY_MS = 24 * 60 * 60 * 1000

async function listAllClassesWithVip(db) {
  const classes = await db.prepare(`
    SELECT
      c.id,
      c.name,
      c.created_at,
      u.username AS owner_username,
      u.is_guest AS owner_is_guest,
      (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count
    FROM classes c
    LEFT JOIN users u ON u.id = c.user_id
    ORDER BY c.created_at DESC
  `).all()

  const vipRows = await db.prepare('SELECT * FROM class_vip_subscriptions').all()
  const vipMap = Object.fromEntries(vipRows.map(row => [row.class_id, row]))
  const now = Date.now()

  return classes.map(cls => {
    const vip = vipMap[cls.id]
    const isExpired = vip ? vip.expires_at <= now : false
    return {
      id: cls.id,
      name: cls.name,
      studentCount: cls.student_count || 0,
      ownerUsername: cls.owner_username || '未知',
      ownerIsGuest: !!cls.owner_is_guest,
      isDemo: cls.id === DEMO_CLASS_ID,
      vip: vip
        ? {
            isActive: !isExpired && vip.status === 'active',
            expiresAt: vip.expires_at,
          }
        : null,
    }
  })
}

describe('管理员班级总览', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
    const now = Date.now()
    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('teacher-1', '张老师', 'hash', 0, now)
    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('teacher-2', '李老师', 'hash', 0, now)
    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('guest-1', 'guest', 'hash', 1, now)
    await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('class-a', 'teacher-1', '三年一班', now - 1000, now - 1000)
    await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('class-b', 'teacher-2', '四年二班', now, now)
    await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(DEMO_CLASS_ID, 'guest-1', '演示班级', now - 2000, now - 2000)
    await db.prepare('INSERT INTO students (id, class_id, name) VALUES (?, ?, ?)').run(uuidv4(), 'class-a', '小明')
    await db.prepare('INSERT INTO students (id, class_id, name) VALUES (?, ?, ?)').run(uuidv4(), 'class-b', '小红')
  })

  it('应返回所有教师的班级，而不只是当前管理员账户的班级', async () => {
    const classes = await listAllClassesWithVip(db)
    expect(classes).toHaveLength(3)
    expect(classes.map(item => item.name)).toEqual(['四年二班', '三年一班', '演示班级'])
  })

  it('应包含所属教师与学生数量', async () => {
    const classes = await listAllClassesWithVip(db)
    const classA = classes.find(item => item.id === 'class-a')
    expect(classA?.ownerUsername).toBe('张老师')
    expect(classA?.studentCount).toBe(1)
    expect(classA?.ownerIsGuest).toBe(false)
  })

  it('应标记演示班级', async () => {
    const classes = await listAllClassesWithVip(db)
    const demo = classes.find(item => item.id === DEMO_CLASS_ID)
    expect(demo?.isDemo).toBe(true)
    expect(demo?.ownerIsGuest).toBe(true)
  })
})

async function authorizeClassVipAsAdmin(db, { classId, isVip, expiresAt }) {
  const classInfo = await db.prepare('SELECT id, name FROM classes WHERE id = ?').get(classId)
  if (!classInfo) {
    return { error: '班级不存在', status: 404 }
  }
  if (classId === DEMO_CLASS_ID) {
    return { error: '演示班级不支持 VIP 授权', status: 400 }
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

describe('管理员 VIP 授权', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
    const now = Date.now()
    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('teacher-1', '张老师', 'hash', 0, now)
    await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('class-a', 'teacher-1', '三年一班', now, now)
  })

  it('管理员可手动授权班级 VIP 并设置到期时间', async () => {
    const expiresAt = Date.now() + 30 * DAY_MS
    const result = await authorizeClassVipAsAdmin(db, {
      classId: 'class-a',
      isVip: true,
      expiresAt,
    })
    expect(result.success).toBe(true)
    expect(result.vip.plan).toBe('manual')
    expect(result.vip.expires_at).toBe(expiresAt)
  })

  it('管理员可取消班级 VIP 授权', async () => {
    const expiresAt = Date.now() + 30 * DAY_MS
    await authorizeClassVipAsAdmin(db, { classId: 'class-a', isVip: true, expiresAt })

    const result = await authorizeClassVipAsAdmin(db, {
      classId: 'class-a',
      isVip: false,
    })
    expect(result.success).toBe(true)
    expect(result.vip).toBeNull()
  })

  it('手动授权时到期时间必须晚于当前时间', async () => {
    const result = await authorizeClassVipAsAdmin(db, {
      classId: 'class-a',
      isVip: true,
      expiresAt: Date.now() - DAY_MS,
    })
    expect(result.error).toBe('VIP 到期时间必须晚于当前时间')
    expect(result.status).toBe(400)
  })
})
