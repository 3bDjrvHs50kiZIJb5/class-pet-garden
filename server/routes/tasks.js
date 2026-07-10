import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import {
  applyEvaluation,
  revokeEvaluation,
  EvaluationCooldownError
} from '../services/evaluationService.js'
import { getAccessibleRule } from '../utils/rules.js'
import {
  assertClassOwnership,
  closeExpiredTasks,
  enrichTask,
  getOwnedTask,
  getTaskTargetStudentIds
} from '../services/taskService.js'

const router = Router()

function parseTargetStudentIds(value) {
  if (!value) return []
  if (Array.isArray(value)) return value
  try {
    return JSON.parse(value)
  } catch {
    return []
  }
}

// 任务列表
router.get('/', authMiddleware, async (req, res) => {
  const { classId, status } = req.query
  if (!classId) {
    return res.status(400).json({ error: 'classId required' })
  }

  if (!(await assertClassOwnership(db, classId, req.userId))) {
    return res.status(403).json({ error: '无权访问此班级' })
  }

  await closeExpiredTasks(db, classId)

  let query = 'SELECT * FROM class_tasks WHERE class_id = ?'
  const params = [classId]

  if (status && status !== 'all') {
    query += ' AND status = ?'
    params.push(status)
  } else if (!status) {
    query += " AND status != 'archived'"
  }

  query += ' ORDER BY created_at DESC'

  const rawTasks = await db.prepare(query).all(...params)
  const tasks = await Promise.all(rawTasks.map(task => enrichTask(db, task)))
  res.json({ tasks })
})

// 创建任务
router.post('/', authMiddleware, async (req, res) => {
  const {
    classId,
    title,
    description,
    ruleId,
    deadline,
    targetType = 'all',
    targetStudentIds = []
  } = req.body

  if (!classId || !title?.trim() || !ruleId) {
    return res.status(400).json({ error: 'classId、title、ruleId 为必填项' })
  }

  if (!(await assertClassOwnership(db, classId, req.userId))) {
    return res.status(403).json({ error: '无权访问此班级' })
  }

  const rule = await getAccessibleRule(db, ruleId, req.userId)
  if (!rule) {
    return res.status(400).json({ error: '评价规则不存在或无权使用' })
  }

  if (targetType === 'selected' && (!targetStudentIds.length)) {
    return res.status(400).json({ error: '请至少选择一名学生' })
  }

  const id = uuidv4()
  const now = Date.now()

  await db.prepare(`
    INSERT INTO class_tasks (
      id, class_id, title, description, rule_id, deadline,
      target_type, target_student_ids, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)
  `).run(
    id,
    classId,
    title.trim(),
    description?.trim() || null,
    ruleId,
    deadline || null,
    targetType,
    targetType === 'selected' ? JSON.stringify(targetStudentIds) : null,
    now,
    now
  )

  const created = await db.prepare('SELECT * FROM class_tasks WHERE id = ?').get(id)
  const task = await enrichTask(db, created)
  res.status(201).json(task)
})

// 任务详情（含学生完成状态）
router.get('/:id', authMiddleware, async (req, res) => {
  const task = await getOwnedTask(db, req.params.id, req.userId)
  if (!task) {
    return res.status(404).json({ error: '任务不存在' })
  }

  await closeExpiredTasks(db, task.class_id)
  const freshTask = await db.prepare('SELECT * FROM class_tasks WHERE id = ?').get(task.id)
  const enriched = await enrichTask(db, freshTask)
  const targetStudentIds = await getTaskTargetStudentIds(db, freshTask)

  const completions = await db.prepare(
    'SELECT * FROM task_completions WHERE task_id = ?'
  ).all(task.id)
  const completionMap = new Map(completions.map(c => [c.student_id, c]))

  const students = await Promise.all(targetStudentIds.map(async studentId => {
    const student = await db.prepare('SELECT id, name, student_no, total_points, pet_type, pet_level FROM students WHERE id = ?').get(studentId)
    const completion = completionMap.get(studentId)
    return {
      ...student,
      completed: !!completion,
      completedAt: completion?.completed_at || null,
      completionId: completion?.id || null
    }
  }))

  res.json({ ...enriched, students })
})

// 编辑任务
router.put('/:id', authMiddleware, async (req, res) => {
  const task = await getOwnedTask(db, req.params.id, req.userId)
  if (!task) {
    return res.status(404).json({ error: '任务不存在' })
  }

  const completionCountRow = await db.prepare(
    'SELECT COUNT(*) as count FROM task_completions WHERE task_id = ?'
  ).get(task.id)
  const completionCount = completionCountRow?.count || 0

  const { title, description, ruleId, deadline, targetType, targetStudentIds } = req.body
  const now = Date.now()

  if (task.status !== 'active') {
    return res.status(400).json({ error: '仅进行中的任务可编辑' })
  }

  if (completionCount === 0) {
    if (!title?.trim()) {
      return res.status(400).json({ error: 'title 为必填项' })
    }
    if (ruleId) {
      const rule = await getAccessibleRule(db, ruleId, req.userId)
      if (!rule) {
        return res.status(400).json({ error: '评价规则不存在或无权使用' })
      }
    }
    const nextTargetType = targetType || task.target_type
    const nextTargetIds = nextTargetType === 'selected'
      ? JSON.stringify(targetStudentIds || parseTargetStudentIds(task.target_student_ids))
      : null

    if (nextTargetType === 'selected' && !parseTargetStudentIds(nextTargetIds).length) {
      return res.status(400).json({ error: '请至少选择一名学生' })
    }

    await db.prepare(`
      UPDATE class_tasks SET
        title = ?, description = ?, rule_id = ?, deadline = ?,
        target_type = ?, target_student_ids = ?, updated_at = ?
      WHERE id = ?
    `).run(
      title.trim(),
      description?.trim() || null,
      ruleId || task.rule_id,
      deadline !== undefined ? deadline : task.deadline,
      nextTargetType,
      nextTargetIds,
      now,
      task.id
    )
  } else {
    if (!title?.trim()) {
      return res.status(400).json({ error: 'title 为必填项' })
    }
    await db.prepare(`
      UPDATE class_tasks SET title = ?, description = ?, deadline = ?, updated_at = ?
      WHERE id = ?
    `).run(
      title.trim(),
      description?.trim() || null,
      deadline !== undefined ? deadline : task.deadline,
      now,
      task.id
    )
  }

  const updatedRow = await db.prepare('SELECT * FROM class_tasks WHERE id = ?').get(task.id)
  const updated = await enrichTask(db, updatedRow)
  res.json(updated)
})

// 手动结束任务
router.post('/:id/close', authMiddleware, async (req, res) => {
  const task = await getOwnedTask(db, req.params.id, req.userId)
  if (!task) {
    return res.status(404).json({ error: '任务不存在' })
  }

  const now = Date.now()
  await db.prepare("UPDATE class_tasks SET status = 'closed', updated_at = ? WHERE id = ?").run(now, task.id)

  const updatedRow = await db.prepare('SELECT * FROM class_tasks WHERE id = ?').get(task.id)
  const updated = await enrichTask(db, updatedRow)
  res.json(updated)
})

// 标记学生完成
router.post('/:id/complete', authMiddleware, async (req, res) => {
  const task = await getOwnedTask(db, req.params.id, req.userId)
  if (!task) {
    return res.status(404).json({ error: '任务不存在' })
  }

  if (task.status !== 'active') {
    return res.status(400).json({ error: '任务已结束，无法标记完成' })
  }

  const { studentIds } = req.body
  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: 'studentIds 为必填数组' })
  }

  const rule = await db.prepare('SELECT * FROM evaluation_rules WHERE id = ?').get(task.rule_id)
  if (!rule) {
    return res.status(400).json({ error: '关联的评价规则已删除，请重新编辑任务绑定规则' })
  }

  const targetStudentIds = new Set(await getTaskTargetStudentIds(db, task))
  const reason = `【任务】${task.title}`
  const results = []

  const completeOne = db.transaction(async (studentId) => {
    if (!targetStudentIds.has(studentId)) {
      return { studentId, skipped: true, reason: '不在任务目标范围' }
    }

    const existing = await db.prepare(
      'SELECT id FROM task_completions WHERE task_id = ? AND student_id = ?'
    ).get(task.id, studentId)
    if (existing) {
      return { studentId, skipped: true, reason: '已完成' }
    }

    const completionId = uuidv4()
    const now = Date.now()

    let evalResult
    try {
      evalResult = await applyEvaluation(db, {
        classId: task.class_id,
        studentId,
        points: rule.points,
        reason,
        category: rule.category
      })
    } catch (error) {
      if (error instanceof EvaluationCooldownError) {
        return { studentId, skipped: true, reason: error.message }
      }
      throw error
    }

    await db.prepare(`
      INSERT INTO task_completions (id, task_id, student_id, evaluation_record_id, completed_at, completed_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(completionId, task.id, studentId, evalResult.id, now, req.userId)

    return {
      studentId,
      skipped: false,
      completionId,
      evaluation: evalResult
    }
  })

  for (const studentId of studentIds) {
    results.push(await completeOne(studentId))
  }

  res.json({ results })
})

// 撤销完成
router.delete('/:id/complete/:studentId', authMiddleware, async (req, res) => {
  const task = await getOwnedTask(db, req.params.id, req.userId)
  if (!task) {
    return res.status(404).json({ error: '任务不存在' })
  }

  const completion = await db.prepare(
    'SELECT * FROM task_completions WHERE task_id = ? AND student_id = ?'
  ).get(task.id, req.params.studentId)

  if (!completion) {
    return res.status(404).json({ error: '完成记录不存在' })
  }

  const revokeOne = db.transaction(async () => {
    const evaluationRecordId = completion.evaluation_record_id
    await db.prepare('DELETE FROM task_completions WHERE id = ?').run(completion.id)
    if (evaluationRecordId) {
      await revokeEvaluation(db, evaluationRecordId)
    }
  })

  await revokeOne()

  const student = await db.prepare('SELECT total_points, pet_exp, pet_level FROM students WHERE id = ?').get(req.params.studentId)
  res.json({ success: true, student })
})

export default router
