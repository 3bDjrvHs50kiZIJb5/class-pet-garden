import { describe, it, expect, beforeEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { applyEvaluation, revokeEvaluation } from '../services/evaluationService.js'
import {
  closeExpiredTasks,
  enrichTask,
  getTaskTargetStudentIds
} from '../services/taskService.js'
import { setupTestDb } from './testDb.js'

describe('班级任务服务', () => {
  let db
  const userId = 'user-1'
  const classId = 'class-1'
  const ruleId = 'rule-1'
  const studentId = 'student-1'

  beforeEach(async () => {
    db = await setupTestDb()
    const now = Date.now()
    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(userId, 'teacher', 'hash', 0, now)
    await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(classId, userId, '三年二班', now, now)
    await db.prepare('INSERT INTO evaluation_rules (id, name, points, category, is_custom, created_at) VALUES (?, ?, ?, ?, 0, ?)')
      .run(ruleId, '遵守纪律', 1, '行为', now)
    await db.prepare(`
      INSERT INTO students (id, class_id, name, total_points, pet_type, pet_level, pet_exp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(studentId, classId, '小明', 10, 'corgi', 1, 10)
  })

  it('全班任务应包含班级内所有学生', async () => {
    const now = Date.now()
    await db.prepare(`
      INSERT INTO class_tasks (id, class_id, title, rule_id, target_type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'all', 'active', ?, ?)
    `).run('task-1', classId, '晨读打卡', ruleId, now, now)

    const task = await db.prepare('SELECT * FROM class_tasks WHERE id = ?').get('task-1')
    const ids = await getTaskTargetStudentIds(db, task)
    expect(ids).toEqual([studentId])
  })

  it('完成任务应自动加分并写入完成记录', async () => {
    const taskId = 'task-1'
    const now = Date.now()
    await db.prepare(`
      INSERT INTO class_tasks (id, class_id, title, rule_id, target_type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'all', 'active', ?, ?)
    `).run(taskId, classId, '整理书包', ruleId, now, now)

    const evalResult = await applyEvaluation(db, {
      classId,
      studentId,
      points: 1,
      reason: '【任务】整理书包',
      category: '行为'
    })

    await db.prepare(`
      INSERT INTO task_completions (id, task_id, student_id, evaluation_record_id, completed_at, completed_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), taskId, studentId, evalResult.id, now, userId)

    const student = await db.prepare('SELECT total_points, pet_exp FROM students WHERE id = ?').get(studentId)
    const completion = await db.prepare('SELECT * FROM task_completions WHERE task_id = ?').get(taskId)

    expect(student.total_points).toBe(11)
    expect(student.pet_exp).toBe(11)
    expect(completion.evaluation_record_id).toBe(evalResult.id)
  })

  it('重复完成同一学生应被唯一约束阻止', async () => {
    const taskId = 'task-1'
    const now = Date.now()
    await db.prepare(`
      INSERT INTO class_tasks (id, class_id, title, rule_id, target_type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'all', 'active', ?, ?)
    `).run(taskId, classId, '测试任务', ruleId, now, now)
    await db.prepare(`
      INSERT INTO task_completions (id, task_id, student_id, completed_at, completed_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), taskId, studentId, now, userId)

    await expect(db.prepare(`
      INSERT INTO task_completions (id, task_id, student_id, completed_at, completed_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), taskId, studentId, now, userId)).rejects.toThrow()
  })

  it('撤销完成应同步删除评价并回退积分', async () => {
    const evalResult = await applyEvaluation(db, {
      classId,
      studentId,
      points: 1,
      reason: '【任务】值日',
      category: '行为'
    })

    await revokeEvaluation(db, evalResult.id)

    const student = await db.prepare('SELECT total_points, pet_exp FROM students WHERE id = ?').get(studentId)
    const record = await db.prepare('SELECT * FROM evaluation_records WHERE id = ?').get(evalResult.id)

    expect(student.total_points).toBe(10)
    expect(student.pet_exp).toBe(10)
    expect(record).toBeUndefined()
  })

  it('过期任务在查询时应自动关闭', async () => {
    const past = Date.now() - 1000
    await db.prepare(`
      INSERT INTO class_tasks (id, class_id, title, rule_id, deadline, target_type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, 'all', 'active', ?, ?)
    `).run('task-expired', classId, '过期任务', ruleId, past, past, past)

    await closeExpiredTasks(db, classId)

    const task = await db.prepare('SELECT status FROM class_tasks WHERE id = ?').get('task-expired')
    expect(task.status).toBe('closed')
  })

  it('enrichTask 应返回规则快照与完成统计', async () => {
    const taskId = 'task-1'
    const now = Date.now()
    await db.prepare(`
      INSERT INTO class_tasks (id, class_id, title, rule_id, target_type, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'all', 'active', ?, ?)
    `).run(taskId, classId, '晨读', ruleId, now, now)

    await db.prepare(`
      INSERT INTO task_completions (id, task_id, student_id, completed_at, completed_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), taskId, studentId, now, userId)

    const task = await db.prepare('SELECT * FROM class_tasks WHERE id = ?').get(taskId)
    const enriched = await enrichTask(db, task)

    expect(enriched.rule.name).toBe('遵守纪律')
    expect(enriched.completedCount).toBe(1)
    expect(enriched.totalCount).toBe(1)
  })
})
