import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { getAccessibleRule, listAccessibleRules } from '../utils/rules.js'

const router = Router()

// 获取当前用户可见规则：系统预置 + 自己创建的自定义规则
router.get('/', authMiddleware, async (req, res) => {
  const rules = await listAccessibleRules(db, req.userId)
  res.json({ rules })
})

// 添加自定义规则（绑定当前用户）
router.post('/', authMiddleware, async (req, res) => {
  const { name, points, category } = req.body
  if (!name?.trim()) {
    return res.status(400).json({ error: '规则名称不能为空' })
  }
  if (points === undefined || points === null || Number.isNaN(Number(points))) {
    return res.status(400).json({ error: '请设置有效的分值' })
  }
  if (!category) {
    return res.status(400).json({ error: '请选择规则分类' })
  }

  const id = uuidv4()
  const now = Date.now()
  await db.prepare(`
    INSERT INTO evaluation_rules (id, name, points, category, is_custom, user_id, created_at)
    VALUES (?, ?, ?, ?, 1, ?, ?)
  `).run(id, name.trim(), Number(points), category, req.userId, now)

  res.json({
    id,
    name: name.trim(),
    points: Number(points),
    category,
    is_custom: 1,
    user_id: req.userId,
    created_at: now,
  })
})

// 删除自定义规则（仅创建者可删）
router.delete('/:id', authMiddleware, async (req, res) => {
  const rule = await db.prepare('SELECT id, is_custom, user_id FROM evaluation_rules WHERE id = ?').get(req.params.id)
  if (!rule) {
    return res.status(404).json({ error: '规则不存在' })
  }
  if (!rule.is_custom) {
    return res.status(403).json({ error: '系统预置规则不可删除' })
  }
  if (rule.user_id !== req.userId) {
    return res.status(403).json({ error: '无权删除他人创建的规则' })
  }

  await db.prepare('DELETE FROM evaluation_rules WHERE id = ? AND is_custom = 1 AND user_id = ?')
    .run(req.params.id, req.userId)
  res.json({ success: true })
})

export default router
