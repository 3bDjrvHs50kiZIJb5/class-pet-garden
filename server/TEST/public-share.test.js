import { describe, it, expect, beforeEach } from 'vitest'
import { setupTestDb } from './testDb.js'

async function getStudentShare(db, studentId) {
  const student = await db.prepare(`
    SELECT
      s.id,
      s.name,
      s.total_points,
      s.pet_type,
      s.pet_level,
      s.pet_exp,
      c.name AS class_name
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = ?
  `).get(studentId)

  if (!student) return null

  const records = await db.prepare(`
    SELECT id, points, reason, category, timestamp
    FROM evaluation_records
    WHERE student_id = ?
    ORDER BY timestamp DESC
    LIMIT 50
  `).all(studentId)

  return { student, records }
}

describe('学生成长记录公开分享', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
  })

  it('应返回学生信息与喂养记录，无需登录', async () => {
    const now = Date.now()
    await db.prepare(`INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES ('user-1', 'teacher', 'hash', 0, ?)`).run(now)
    await db.prepare(`INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES ('class-1', 'user-1', '三年二班', ?, ?)`).run(now, now)
    await db.prepare(`INSERT INTO students (id, class_id, name, total_points, pet_type, pet_level, pet_exp) VALUES ('student-1', 'class-1', '周昱辰', 12, 'corgi', 2, 8)`).run()
    await db.prepare(`
      INSERT INTO evaluation_records (id, class_id, student_id, points, reason, category, timestamp)
      VALUES ('record-1', 'class-1', 'student-1', 2, '课堂积极发言', '学习', ?)
    `).run(now)

    const result = await getStudentShare(db, 'student-1')

    expect(result.student.name).toBe('周昱辰')
    expect(result.student.class_name).toBe('三年二班')
    expect(result.records).toHaveLength(1)
    expect(result.records[0].reason).toBe('课堂积极发言')
  })

  it('学生不存在时返回 null', async () => {
    const result = await getStudentShare(db, 'missing-student')
    expect(result).toBeNull()
  })
})
