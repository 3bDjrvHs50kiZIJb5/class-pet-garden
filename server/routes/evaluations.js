import { Router } from 'express'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import {
  applyEvaluation,
  revokeEvaluation,
  EvaluationCooldownError
} from '../services/evaluationService.js'
import { getTodayTimestampRange } from '../utils/dateRange.js'

const router = Router()

// 添加评价
router.post('/', authMiddleware, async (req, res) => {
  const { classId, studentId, points, reason, category } = req.body

  const cls = await db.prepare('SELECT * FROM classes WHERE id = ?').get(classId)
  if (!cls || cls.user_id !== req.userId) {
    return res.status(403).json({ error: '无权访问此班级' })
  }

  try {
    const result = await applyEvaluation(db, { classId, studentId, points, reason, category })
    res.json(result)
  } catch (error) {
    if (error instanceof EvaluationCooldownError) {
      return res.status(429).json({
        error: error.message,
        code: 'EVALUATION_COOLDOWN',
        remainingMs: error.remainingMs
      })
    }
    throw error
  }
})

// 获取评价记录列表
router.get('/', authMiddleware, async (req, res) => {
  const { classId, studentId, page = 1, pageSize = 20, today } = req.query
  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 20))
  const offset = (safePage - 1) * safePageSize
  const filterToday = today === '1' || today === 'true'

  let countQuery = 'SELECT COUNT(*) as total FROM evaluation_records er JOIN classes c ON er.class_id = c.id'
  let query = 'SELECT er.*, s.name as student_name FROM evaluation_records er JOIN students s ON er.student_id = s.id JOIN classes c ON er.class_id = c.id'
  const params = []
  const countParams = []

  params.push(req.userId)
  countParams.push(req.userId)

  const conditions = ['c.user_id = ?']
  if (classId) {
    conditions.push('er.class_id = ?')
    params.push(classId)
    countParams.push(classId)
  }
  if (studentId) {
    conditions.push('er.student_id = ?')
    params.push(studentId)
    countParams.push(studentId)
  }
  if (filterToday) {
    const { start, end } = getTodayTimestampRange()
    conditions.push('er.timestamp >= ?')
    conditions.push('er.timestamp <= ?')
    params.push(start, end)
    countParams.push(start, end)
  }

  query += ' WHERE ' + conditions.join(' AND ')
  countQuery += ' WHERE ' + conditions.join(' AND ')

  const totalResult = await db.prepare(countQuery).get(...countParams)
  const total = totalResult?.total || 0

  // MySQL 预处理语句不支持 LIMIT/OFFSET 占位符，需直接拼接已校验的整数
  query += ` ORDER BY er.timestamp DESC LIMIT ${safePageSize} OFFSET ${offset}`

  const records = await db.prepare(query).all(...params)
  res.json({
    records,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.ceil(total / safePageSize)
  })
})

// 撤回最新评价
router.delete('/latest', authMiddleware, async (req, res) => {
  const { classId } = req.query
  if (!classId) {
    return res.status(400).json({ error: 'classId required' })
  }

  const cls = await db.prepare('SELECT * FROM classes WHERE id = ?').get(classId)
  if (!cls || cls.user_id !== req.userId) {
    return res.status(403).json({ error: '无权访问此班级' })
  }

  const record = await db.prepare('SELECT * FROM evaluation_records WHERE class_id = ? ORDER BY timestamp DESC LIMIT 1').get(classId)
  if (!record) {
    return res.status(404).json({ error: 'No record found' })
  }

  const undone = await revokeEvaluation(db, record.id)
  res.json({ success: true, undone })
})

// 删除指定评价记录
router.delete('/:id', authMiddleware, async (req, res) => {
  const { id } = req.params

  const record = await db.prepare(`
    SELECT er.* FROM evaluation_records er
    JOIN classes c ON er.class_id = c.id
    WHERE er.id = ? AND c.user_id = ?
  `).get(id, req.userId)

  if (!record) {
    return res.status(404).json({ error: 'Record not found' })
  }

  const undone = await revokeEvaluation(db, id)
  res.json({ success: true, undone })
})

export default router
