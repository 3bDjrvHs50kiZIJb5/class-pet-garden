import { describe, it, expect, beforeEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { setupTestDb } from './testDb.js'

const DEMO_CLASS_ID = 'demo-class-2026'

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
