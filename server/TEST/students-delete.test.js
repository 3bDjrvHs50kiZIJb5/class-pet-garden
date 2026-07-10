import { describe, it, expect, beforeEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { setupTestDb } from './testDb.js'

async function deleteStudentCascade(db, studentId) {
  await db.prepare('DELETE FROM task_completions WHERE student_id = ?').run(studentId)
  await db.prepare('DELETE FROM badges WHERE student_id = ?').run(studentId)
  await db.prepare('DELETE FROM evaluation_records WHERE student_id = ?').run(studentId)
  await db.prepare('DELETE FROM students WHERE id = ?').run(studentId)
}

describe('删除学生', () => {
  let db
  let studentId

  beforeEach(async () => {
    db = await setupTestDb()
    const now = Date.now()
    studentId = uuidv4()

    await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('class-1', 'user-1', '测试班', now, now)
    await db.prepare('INSERT INTO students (id, class_id, name) VALUES (?, ?, ?)').run(studentId, 'class-1', '测试学生')
    await db.prepare(`
      INSERT INTO evaluation_records (id, class_id, student_id, points, reason, category, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), 'class-1', studentId, 2, '课堂积极发言', '学习', now)
    await db.prepare('INSERT INTO badges (id, student_id, pet_type, earned_at) VALUES (?, ?, ?, ?)')
      .run(uuidv4(), studentId, 'cat', now)
    await db.prepare(`
      INSERT INTO evaluation_rules (id, name, points, category, is_custom, created_at)
      VALUES (?, ?, ?, ?, 0, ?)
    `).run('rule-task', '遵守纪律', 1, '行为', now)
    await db.prepare(`
      INSERT INTO class_tasks (id, class_id, title, rule_id, target_type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'all', 'active', ?, ?)
    `).run('task-1', 'class-1', '测试任务', 'rule-task', now, now)
    await db.prepare(`
      INSERT INTO task_completions (id, task_id, student_id, completed_at, completed_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), 'task-1', studentId, now, 'teacher')
  })

  it('应级联删除评价记录、徽章和任务完成记录', async () => {
    await deleteStudentCascade(db, studentId)

    expect((await db.prepare('SELECT COUNT(*) as count FROM students WHERE id = ?').get(studentId)).count).toBe(0)
    expect((await db.prepare('SELECT COUNT(*) as count FROM evaluation_records WHERE student_id = ?').get(studentId)).count).toBe(0)
    expect((await db.prepare('SELECT COUNT(*) as count FROM badges WHERE student_id = ?').get(studentId)).count).toBe(0)
    expect((await db.prepare('SELECT COUNT(*) as count FROM task_completions WHERE student_id = ?').get(studentId)).count).toBe(0)
  })
})
