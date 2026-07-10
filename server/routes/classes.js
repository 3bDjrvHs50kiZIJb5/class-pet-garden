import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()
const DEMO_CLASS_ID = 'demo-class-2026'

// 获取班级列表（只返回当前用户的班级）
router.get('/', authMiddleware, async (req, res) => {
  const classes = await db.prepare('SELECT * FROM classes WHERE user_id = ? ORDER BY created_at DESC').all(req.userId)
  res.json({ classes })
})

// 演示班级始终通过游客账户读取，避免与当前登录老师的班级列表混在一起。
router.get('/demo', authMiddleware, async (req, res) => {
  const demoClass = await db.prepare('SELECT * FROM classes WHERE id = ?').get(DEMO_CLASS_ID)
  if (!demoClass) {
    return res.status(404).json({ error: '演示班级不存在' })
  }
  const students = await db.prepare(
    'SELECT * FROM students WHERE class_id = ? ORDER BY total_points DESC, name'
  ).all(DEMO_CLASS_ID)
  const records = await db.prepare(`
    SELECT er.*, s.name AS student_name
    FROM evaluation_records er
    JOIN students s ON er.student_id = s.id
    WHERE er.class_id = ?
    ORDER BY er.timestamp DESC
    LIMIT 20
  `).all(DEMO_CLASS_ID)
  const totalRow = await db.prepare(
    'SELECT COUNT(*) AS total FROM evaluation_records WHERE class_id = ?'
  ).get(DEMO_CLASS_ID)
  const total = totalRow.total

  res.json({ class: demoClass, students, records, total })
})

// 获取班级学生列表（与前端 /classes/:classId/students 路径对齐）
router.get('/:classId/students', authMiddleware, async (req, res) => {
  const classInfo = await db.prepare('SELECT user_id FROM classes WHERE id = ?').get(req.params.classId)
  if (!classInfo) {
    return res.status(404).json({ error: '班级不存在' })
  }
  if (classInfo.user_id !== req.userId) {
    return res.status(403).json({ error: '无权访问此班级' })
  }
  const students = await db.prepare(
    'SELECT * FROM students WHERE class_id = ? ORDER BY total_points DESC, name'
  ).all(req.params.classId)
  res.json({ students })
})

// 创建班级（关联当前用户）
router.post('/', authMiddleware, async (req, res) => {
  const { name } = req.body
  const id = uuidv4()
  const now = Date.now()

  await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(id, req.userId, name, now, now)

  res.json({ id, user_id: req.userId, name, created_at: now, updated_at: now })
})

// 更新班级
router.put('/:id', authMiddleware, async (req, res) => {
  const { name } = req.body
  const classInfo = await db.prepare('SELECT user_id FROM classes WHERE id = ?').get(req.params.id)

  if (!classInfo) {
    return res.status(404).json({ error: '班级不存在' })
  }
  if (classInfo.user_id !== req.userId) {
    return res.status(403).json({ error: '无权修改' })
  }

  const now = Date.now()
  await db.prepare('UPDATE classes SET name = ?, updated_at = ? WHERE id = ?').run(name, now, req.params.id)
  res.json({ success: true })
})

// 删除班级
router.delete('/:id', authMiddleware, async (req, res) => {
  const classInfo = await db.prepare('SELECT user_id FROM classes WHERE id = ?').get(req.params.id)

  if (!classInfo) {
    return res.status(404).json({ error: '班级不存在' })
  }
  if (classInfo.user_id !== req.userId) {
    return res.status(403).json({ error: '无权删除' })
  }

  // Delete students in this class first
  await db.prepare('DELETE FROM students WHERE class_id = ?').run(req.params.id)
  await db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

export default router
