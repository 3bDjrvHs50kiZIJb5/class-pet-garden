import { Router } from 'express'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

// 导出备份
router.get('/', authMiddleware, async (req, res) => {
  const backup = {
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    classes: await db.prepare('SELECT * FROM classes WHERE user_id = ?').all(req.userId),
    students: await db.prepare(`
      SELECT s.* FROM students s
      JOIN classes c ON s.class_id = c.id
      WHERE c.user_id = ?
    `).all(req.userId),
    rules: await db.prepare(`
      SELECT * FROM evaluation_rules
      WHERE is_custom = 0 OR user_id = ?
    `).all(req.userId),
    records: await db.prepare(`
      SELECT er.* FROM evaluation_records er
      JOIN classes c ON er.class_id = c.id
      WHERE c.user_id = ?
    `).all(req.userId),
    badges: await db.prepare(`
      SELECT b.* FROM badges b
      JOIN students s ON b.student_id = s.id
      JOIN classes c ON s.class_id = c.id
      WHERE c.user_id = ?
    `).all(req.userId),
    settings: await db.prepare('SELECT * FROM settings').all()
  }
  res.setHeader('Content-Disposition', `attachment; filename="pet-garden-backup-${Date.now()}.json"`)
  res.json(backup)
})

// 导入备份
router.post('/', authMiddleware, async (req, res) => {
  const { classes, students, rules, records, badges, settings } = req.body

  if (!classes || !students) {
    return res.status(400).json({ error: 'Invalid backup data' })
  }

  try {
    // Clear existing data for current user
    await db.prepare('DELETE FROM evaluation_records WHERE class_id IN (SELECT id FROM classes WHERE user_id = ?)').run(req.userId)
    await db.prepare('DELETE FROM badges WHERE student_id IN (SELECT s.id FROM students s JOIN classes c ON s.class_id = c.id WHERE c.user_id = ?)').run(req.userId)
    await db.prepare('DELETE FROM students WHERE class_id IN (SELECT id FROM classes WHERE user_id = ?)').run(req.userId)
    await db.prepare('DELETE FROM classes WHERE user_id = ?').run(req.userId)

    // Restore classes (关联当前用户)
    const insertClass = db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    for (const c of classes) {
      await insertClass.run(c.id, req.userId, c.name, c.created_at, c.updated_at)
    }

    // Restore students
    const insertStudent = db.prepare('INSERT INTO students (id, class_id, name, student_no, total_points, pet_type, pet_level, pet_exp, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    for (const s of students) {
      await insertStudent.run(s.id, s.class_id, s.name, s.student_no, s.total_points, s.pet_type, s.pet_level, s.pet_exp, s.created_at)
    }

    // Restore custom rules for current user only
    if (rules) {
      await db.prepare('DELETE FROM evaluation_rules WHERE is_custom = 1 AND user_id = ?').run(req.userId)
      const insertRule = db.prepare(`
        INSERT IGNORE INTO evaluation_rules (id, name, points, category, is_custom, user_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      for (const r of rules.filter(r => r.is_custom)) {
        await insertRule.run(r.id, r.name, r.points, r.category, r.is_custom, req.userId, r.created_at)
      }
    }

    // Restore records
    if (records) {
      const insertRecord = db.prepare('INSERT INTO evaluation_records (id, class_id, student_id, points, reason, category, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)')
      for (const r of records) {
        await insertRecord.run(r.id, r.class_id, r.student_id, r.points, r.reason, r.category, r.timestamp)
      }
    }

    // Restore badges
    if (badges) {
      const insertBadge = db.prepare('INSERT INTO badges (id, student_id, pet_type, earned_at) VALUES (?, ?, ?, ?)')
      for (const b of badges) {
        await insertBadge.run(b.id, b.student_id, b.pet_type, b.earned_at)
      }
    }

    res.json({ success: true, message: '数据恢复成功' })
  } catch (error) {
    console.error('Restore error:', error)
    res.status(500).json({ error: '恢复失败' })
  }
})

export default router
