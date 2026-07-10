import { describe, it, expect, beforeEach } from 'vitest'
import {
  applyEvaluation,
  assertEvaluationCooldown,
  EvaluationCooldownError,
  EVALUATION_COOLDOWN_MS
} from '../services/evaluationService.js'
import { setupTestDb } from './testDb.js'

describe('评价冷却防刷分', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
    const now = Date.now()
    await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('class-1', 'user-1', '测试班', now, now)
    await db.prepare(`
      INSERT INTO students (id, class_id, name, total_points, pet_exp, pet_level)
      VALUES ('student-1', 'class-1', '小明', 0, 0, 1)
    `).run()
  })

  it('首次评价应成功', async () => {
    const result = await applyEvaluation(db, {
      classId: 'class-1',
      studentId: 'student-1',
      points: 20,
      reason: '学习目标达成',
      category: '学习'
    })

    expect(result.id).toBeTruthy()
    expect((await db.prepare('SELECT COUNT(*) as count FROM evaluation_records').get()).count).toBe(1)
  })

  it('同一学生同一规则 1 分钟内重复评价应被拒绝', async () => {
    const payload = {
      classId: 'class-1',
      studentId: 'student-1',
      points: 20,
      reason: '学习目标达成',
      category: '学习'
    }

    await applyEvaluation(db, payload)

    await expect(applyEvaluation(db, payload)).rejects.toThrow(EvaluationCooldownError)
  })

  it('同一学生不同规则应允许连续评价', async () => {
    await applyEvaluation(db, {
      classId: 'class-1',
      studentId: 'student-1',
      points: 20,
      reason: '学习目标达成',
      category: '学习'
    })

    const result = await applyEvaluation(db, {
      classId: 'class-1',
      studentId: 'student-1',
      points: -1,
      reason: '迟到',
      category: '行为'
    })

    expect(result.id).toBeTruthy()
    expect((await db.prepare('SELECT COUNT(*) as count FROM evaluation_records').get()).count).toBe(2)
  })

  it('不同学生对同一规则应允许连续评价', async () => {
    await db.prepare(`
      INSERT INTO students (id, class_id, name, total_points, pet_exp, pet_level)
      VALUES ('student-2', 'class-1', '小红', 0, 0, 1)
    `).run()

    await applyEvaluation(db, {
      classId: 'class-1',
      studentId: 'student-1',
      points: 20,
      reason: '学习目标达成',
      category: '学习'
    })

    const result = await applyEvaluation(db, {
      classId: 'class-1',
      studentId: 'student-2',
      points: 20,
      reason: '学习目标达成',
      category: '学习'
    })

    expect(result.id).toBeTruthy()
  })

  it('超过冷却时间后应允许再次评价', async () => {
    const now = Date.now()
    const payload = {
      classId: 'class-1',
      studentId: 'student-1',
      points: 20,
      reason: '学习目标达成',
      category: '学习'
    }

    await applyEvaluation(db, payload)

    await expect(assertEvaluationCooldown(db, {
      studentId: payload.studentId,
      reason: payload.reason,
      now: now + EVALUATION_COOLDOWN_MS
    })).resolves.toBeUndefined()
  })
})
