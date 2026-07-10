import { describe, it, expect, beforeEach } from 'vitest'
import { setupTestDb } from './testDb.js'
import { applyEvaluation, revokeEvaluation } from '../services/evaluationService.js'

describe('任务加分喂养记录', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
    const now = Date.now()
    await db.prepare(`INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES ('user-1', 'teacher', '', 0, ?)`).run(now)
    await db.prepare(`INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES ('class-1', 'user-1', '三年二班', ?, ?)`).run(now, now)
    await db.prepare(`INSERT INTO students (id, class_id, name, total_points, pet_exp, pet_level) VALUES ('student-1', 'class-1', '张三', 5, 5, 1)`).run()
    await db.prepare(`
      INSERT INTO evaluation_rules (id, name, points, category, is_custom, created_at)
      VALUES ('rule-1', '测试规则', 10, '学习', 0, ?)
    `).run(now)
    await db.prepare(`
      INSERT INTO class_tasks (id, class_id, title, rule_id, status, target_type, created_at, updated_at)
      VALUES ('task-1', 'class-1', '测试任务-未来打卡', 'rule-1', 'active', 'all', ?, ?)
    `).run(now, now)
  })

  it('任务完成写入的喂养记录应出现在评价列表查询中', async () => {
    const evalResult = await applyEvaluation(db, {
      classId: 'class-1',
      studentId: 'student-1',
      points: 10,
      reason: '【任务】测试任务-未来打卡',
      category: '学习'
    })

    await db.prepare(`
      INSERT INTO task_completions (id, task_id, student_id, evaluation_record_id, completed_at, completed_by)
      VALUES ('completion-1', 'task-1', 'student-1', ?, ?, 'user-1')
    `).run(evalResult.id, Date.now())

    const records = await db.prepare(`
      SELECT er.*, s.name as student_name, tc.task_id, ct.title as task_title
      FROM evaluation_records er
      JOIN students s ON er.student_id = s.id
      JOIN classes c ON er.class_id = c.id
      LEFT JOIN task_completions tc ON tc.evaluation_record_id = er.id
      LEFT JOIN class_tasks ct ON ct.id = tc.task_id
      WHERE c.user_id = ? AND er.class_id = ?
      ORDER BY er.timestamp DESC
    `).all('user-1', 'class-1')

    expect(records).toHaveLength(1)
    expect(records[0].reason).toBe('【任务】测试任务-未来打卡')
    expect(records[0].task_id).toBe('task-1')
    expect(records[0].student_name).toBe('张三')
  })

  it('从喂养记录撤回时应同步删除任务完成记录', async () => {
    const evalResult = await applyEvaluation(db, {
      classId: 'class-1',
      studentId: 'student-1',
      points: 10,
      reason: '【任务】测试任务-未来打卡',
      category: '学习'
    })

    await db.prepare(`
      INSERT INTO task_completions (id, task_id, student_id, evaluation_record_id, completed_at, completed_by)
      VALUES ('completion-1', 'task-1', 'student-1', ?, ?, 'user-1')
    `).run(evalResult.id, Date.now())

    await revokeEvaluation(db, evalResult.id)

    expect((await db.prepare('SELECT COUNT(*) as count FROM evaluation_records').get()).count).toBe(0)
    expect((await db.prepare('SELECT COUNT(*) as count FROM task_completions').get()).count).toBe(0)
    expect((await db.prepare('SELECT total_points FROM students WHERE id = ?').get('student-1')).total_points).toBe(5)
  })
})
