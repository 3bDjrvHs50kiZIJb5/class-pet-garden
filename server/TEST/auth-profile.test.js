import { describe, it, expect, beforeEach } from 'vitest'
import { setupTestDb } from './testDb.js'

async function getTeacherProfile(db, userId) {
  const user = await db.prepare('SELECT id, username, is_guest, created_at FROM users WHERE id = ?').get(userId)
  if (!user) return null

  const classes = await db.prepare(`
    SELECT
      c.id,
      c.name,
      c.created_at,
      c.updated_at,
      (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id) AS student_count
    FROM classes c
    WHERE c.user_id = ?
    ORDER BY c.created_at DESC
  `).all(userId)

  const evaluationCount = (await db.prepare(`
    SELECT COUNT(*) AS count
    FROM evaluation_records er
    JOIN classes c ON er.class_id = c.id
    WHERE c.user_id = ?
  `).get(userId))?.count || 0

  const taskCount = (await db.prepare(`
    SELECT COUNT(*) AS count
    FROM class_tasks t
    JOIN classes c ON t.class_id = c.id
    WHERE c.user_id = ?
  `).get(userId))?.count || 0

  const badgeCount = (await db.prepare(`
    SELECT COUNT(*) AS count
    FROM badges b
    JOIN students s ON b.student_id = s.id
    JOIN classes c ON s.class_id = c.id
    WHERE c.user_id = ?
  `).get(userId))?.count || 0

  return {
    user: {
      id: user.id,
      username: user.username,
      isGuest: !!user.is_guest,
      createdAt: user.created_at,
      accountType: user.is_guest ? '游客' : '教师'
    },
    stats: {
      classCount: classes.length,
      studentCount: classes.reduce((sum, cls) => sum + (cls.student_count || 0), 0),
      evaluationCount,
      taskCount,
      badgeCount
    },
    classes: classes.map(cls => ({
      id: cls.id,
      name: cls.name,
      studentCount: cls.student_count || 0,
      createdAt: cls.created_at,
      updatedAt: cls.updated_at
    }))
  }
}

describe('教师资料接口统计', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()

    const now = Date.now()
    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('teacher-1', '张老师', 'hash', 0, now)
    await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('class-1', 'teacher-1', '三年二班', now, now)
    await db.prepare('INSERT INTO students (id, class_id, name) VALUES (?, ?, ?)')
      .run('student-1', 'class-1', '小明')
    await db.prepare('INSERT INTO students (id, class_id, name) VALUES (?, ?, ?)')
      .run('student-2', 'class-1', '小红')
    await db.prepare('INSERT INTO evaluation_records (id, class_id, student_id, points, reason, category, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('record-1', 'class-1', 'student-1', 1, '测试', '学习', now)
    await db.prepare('INSERT INTO evaluation_records (id, class_id, student_id, points, reason, category, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run('record-2', 'class-1', 'student-2', 1, '测试', '学习', now)
    await db.prepare('INSERT INTO evaluation_rules (id, name, points, category, is_custom, created_at) VALUES (?, ?, ?, ?, 0, ?)')
      .run('rule-task', '遵守纪律', 1, '行为', now)
    await db.prepare('INSERT INTO class_tasks (id, class_id, title, rule_id, target_type, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .run('task-1', 'class-1', '今日晨读', 'rule-task', 'all', 'active', now, now)
    await db.prepare('INSERT INTO badges (id, student_id, pet_type, earned_at) VALUES (?, ?, ?, ?)')
      .run('badge-1', 'student-1', 'corgi', now)
  })

  it('应返回教师账号信息与统计数据', async () => {
    const profile = await getTeacherProfile(db, 'teacher-1')

    expect(profile.user.username).toBe('张老师')
    expect(profile.user.accountType).toBe('教师')
    expect(profile.stats.classCount).toBe(1)
    expect(profile.stats.studentCount).toBe(2)
    expect(profile.stats.evaluationCount).toBe(2)
    expect(profile.stats.taskCount).toBe(1)
    expect(profile.stats.badgeCount).toBe(1)
    expect(profile.classes[0].name).toBe('三年二班')
    expect(profile.classes[0].studentCount).toBe(2)
  })
})
