import { describe, it, expect, beforeEach } from 'vitest'
import { setupTestDb } from './testDb.js'

const DEMO_CLASS_ID = 'demo-class-2026'

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

  it('老师只能查看会员状态，不能直接写入订阅记录', async () => {
    const before = await listClassVipOverview(db, 'teacher-1')
    expect(before.every(item => item.vip === null)).toBe(true)

    const rowCount = await db.prepare('SELECT COUNT(*) AS count FROM class_vip_subscriptions').get()
    expect(rowCount.count).toBe(0)
  })
})
