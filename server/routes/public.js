import { Router } from 'express'
import { db } from '../db.js'

const router = Router()

router.get('/students/:studentId/share', async (req, res) => {
  const student = await db.prepare(`
    SELECT
      s.id,
      s.name,
      s.student_no,
      s.total_points,
      s.pet_type,
      s.pet_level,
      s.pet_exp,
      c.name AS class_name
    FROM students s
    JOIN classes c ON s.class_id = c.id
    WHERE s.id = ?
  `).get(req.params.studentId)

  if (!student) {
    return res.status(404).json({ error: '学生不存在' })
  }

  const records = await db.prepare(`
    SELECT id, points, reason, category, timestamp
    FROM evaluation_records
    WHERE student_id = ?
    ORDER BY timestamp DESC
    LIMIT 50
  `).all(req.params.studentId)

  res.json({ student, records })
})

export default router
