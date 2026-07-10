import { Router } from 'express'
import { v4 as uuidv4 } from 'uuid'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import { calculateLevel } from '../utils/level.js'
import { isMythicalPet } from '../utils/pets.js'
import { isClassVipActive } from '../utils/vip.js'

const router = Router()

// 验证班级归属的中间件
async function verifyClassOwnership(req, res, next) {
  const classId = req.params.classId || req.body.classId
  if (!classId) {
    return res.status(400).json({ error: '缺少班级ID' })
  }
  const cls = await db.prepare('SELECT * FROM classes WHERE id = ?').get(classId)
  if (!cls) {
    return res.status(404).json({ error: '班级不存在' })
  }
  if (cls.user_id !== req.userId) {
    return res.status(403).json({ error: '无权访问此班级' })
  }
  req.classId = classId
  next()
}

// 获取班级学生列表
router.get('/classes/:classId/students', authMiddleware, verifyClassOwnership, async (req, res) => {
  const students = await db.prepare('SELECT * FROM students WHERE class_id = ? ORDER BY name').all(req.params.classId)
  res.json({ students })
})

// 添加学生
router.post('/', authMiddleware, async (req, res) => {
  const { classId, name, studentNo } = req.body

  // 验证班级归属
  const cls = await db.prepare('SELECT * FROM classes WHERE id = ?').get(classId)
  if (!cls) {
    return res.status(404).json({ error: '班级不存在' })
  }
  if (cls.user_id !== req.userId) {
    return res.status(403).json({ error: '无权访问此班级' })
  }

  const id = uuidv4()
  const now = Date.now()
  await db.prepare('INSERT INTO students (id, class_id, name, student_no, total_points, pet_level, pet_exp, created_at) VALUES (?, ?, ?, ?, 0, 1, 0, ?)')
    .run(id, classId, name, studentNo || null, now)
  res.json({ id, class_id: classId, name, student_no: studentNo || null, total_points: 0, pet_level: 1, pet_exp: 0, created_at: now })
})

// 更新学生
router.put('/:id', authMiddleware, async (req, res) => {
  const { name, studentNo } = req.body

  // 验证学生归属
  const student = await db.prepare(`
    SELECT s.* FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = ? AND c.user_id = ?
  `).get(req.params.id, req.userId)

  if (!student) {
    return res.status(404).json({ error: '学生不存在或无权访问' })
  }

  await db.prepare('UPDATE students SET name = ?, student_no = ? WHERE id = ?').run(name, studentNo || null, req.params.id)
  res.json({ success: true })
})

// 删除学生
router.delete('/:id', authMiddleware, async (req, res) => {
  // 验证学生归属
  const student = await db.prepare(`
    SELECT s.* FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = ? AND c.user_id = ?
  `).get(req.params.id, req.userId)

  if (!student) {
    return res.status(404).json({ error: '学生不存在或无权访问' })
  }

  // 先删除关联数据，再删除学生
  await db.prepare('DELETE FROM task_completions WHERE student_id = ?').run(req.params.id)
  await db.prepare('DELETE FROM badges WHERE student_id = ?').run(req.params.id)
  await db.prepare('DELETE FROM evaluation_records WHERE student_id = ?').run(req.params.id)
  await db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id)
  res.json({ success: true })
})

// 批量导入学生
router.post('/import', authMiddleware, async (req, res) => {
  const { classId, students } = req.body
  if (!classId || !students || !Array.isArray(students)) {
    return res.status(400).json({ error: 'Invalid input' })
  }

  // 验证班级归属
  const cls = await db.prepare('SELECT * FROM classes WHERE id = ?').get(classId)
  if (!cls) {
    return res.status(404).json({ error: '班级不存在' })
  }
  if (cls.user_id !== req.userId) {
    return res.status(403).json({ error: '无权访问此班级' })
  }

  const now = Date.now()
  const insertStmt = db.prepare('INSERT INTO students (id, class_id, name, student_no, total_points, pet_level, pet_exp, created_at) VALUES (?, ?, ?, ?, 0, 1, 0, ?)')

  let imported = 0
  for (const student of students) {
    if (student.name && student.name.trim()) {
      const id = uuidv4()
      await insertStmt.run(id, classId, student.name.trim(), student.studentNo?.trim() || null, now)
      imported++
    }
  }

  res.json({ success: true, imported })
})

// 更新学生宠物
router.put('/:id/pet', authMiddleware, async (req, res) => {
  const { petType } = req.body
  const now = Date.now()

  // 验证学生归属
  const student = await db.prepare(`
    SELECT s.* FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = ? AND c.user_id = ?
  `).get(req.params.id, req.userId)

  if (!student) {
    return res.status(404).json({ error: '学生不存在或无权访问' })
  }

  if (isMythicalPet(petType) && !(await isClassVipActive(db, student.class_id))) {
    return res.status(403).json({ error: '神兽伙伴需开通 VIP 后才能领养' })
  }

  // If student already has a pet, create a badge for it if level is 8
  if (student.pet_type && student.pet_level >= 8) {
    const badgeId = uuidv4()
    await db.prepare('INSERT INTO badges (id, student_id, pet_type, earned_at) VALUES (?, ?, ?, ?)')
      .run(badgeId, req.params.id, student.pet_type, now)
  }

  if (student.pet_type) {
    // 更换宠物：等级、成长进度与积分一并归零，重新培养
    await db.prepare('UPDATE students SET pet_type = ?, pet_level = 1, pet_exp = 0, total_points = 0 WHERE id = ?')
      .run(petType, req.params.id)
  } else {
    // 首次领养：沿用当前班级积分作为宠物成长值
    const newExp = Math.max(0, student.total_points)
    const newLevel = calculateLevel(newExp)
    await db.prepare('UPDATE students SET pet_type = ?, pet_level = ?, pet_exp = ? WHERE id = ?')
      .run(petType, newLevel, newExp, req.params.id)
  }

  res.json({ success: true })
})

// 取消学生宠物
router.delete('/:id/pet', authMiddleware, async (req, res) => {
  const now = Date.now()

  const student = await db.prepare(`
    SELECT s.* FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = ? AND c.user_id = ?
  `).get(req.params.id, req.userId)

  if (!student) {
    return res.status(404).json({ error: '学生不存在或无权访问' })
  }

  if (!student.pet_type) {
    return res.status(400).json({ error: '学生还没有领养宠物' })
  }

  if (student.pet_level >= 8) {
    const badgeId = uuidv4()
    await db.prepare('INSERT INTO badges (id, student_id, pet_type, earned_at) VALUES (?, ?, ?, ?)')
      .run(badgeId, req.params.id, student.pet_type, now)
  }

  await db.prepare('UPDATE students SET pet_type = NULL, pet_level = 1, pet_exp = 0, total_points = 0 WHERE id = ?')
    .run(req.params.id)

  res.json({ success: true })
})

export default router
