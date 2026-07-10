import { Router } from 'express'
import { db } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const router = Router()

const RANKING_CATEGORIES = ['学习', '行为', '健康', '其他']

async function buildCategoryRankings(students, classId) {
  const categoryRows = await db.prepare(`
    SELECT student_id, category, SUM(points) as category_points
    FROM evaluation_records
    WHERE class_id = ?
    GROUP BY student_id, category
  `).all(classId)

  const pointsByStudent = {}
  for (const row of categoryRows) {
    if (!pointsByStudent[row.student_id]) {
      pointsByStudent[row.student_id] = {}
    }
    pointsByStudent[row.student_id][row.category] = row.category_points
  }

  const categoryRankings = {}
  for (const category of RANKING_CATEGORIES) {
    categoryRankings[category] = students
      .map(student => ({
        ...student,
        category_points: pointsByStudent[student.id]?.[category] ?? 0,
      }))
      .filter(student => student.category_points !== 0)
      .sort((a, b) => {
        if (b.category_points !== a.category_points) {
          return b.category_points - a.category_points
        }
        return b.pet_level - a.pet_level
      })
  }

  return categoryRankings
}

// 获取设置（公开接口）
router.get('/', async (req, res) => {
  const settings = await db.prepare('SELECT `key`, value FROM settings').all()
  const result = {}
  for (const s of settings) {
    result[s.key] = JSON.parse(s.value)
  }
  res.json(result)
})

// 修复经验值（将 pet_exp 与 total_points 同步）
router.post('/fix-exp', authMiddleware, async (req, res) => {
  // Sync pet_exp with total_points for students with pets (只处理当前用户的班级)
  const result = await db.prepare(`
    UPDATE students SET pet_exp = GREATEST(0, total_points)
    WHERE pet_type IS NOT NULL
    AND class_id IN (SELECT id FROM classes WHERE user_id = ?)
  `).run(req.userId)
  res.json({ success: true, updated: result.changes })
})

// 获取排行榜
router.get('/ranking/:classId', authMiddleware, async (req, res) => {
  // 验证班级归属
  const cls = await db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.classId)
  if (!cls || cls.user_id !== req.userId) {
    return res.status(403).json({ error: '无权访问此班级' })
  }

  const ranking = await db.prepare(`
    SELECT s.*,
           (SELECT COUNT(*) FROM badges WHERE student_id = s.id) as badge_count
    FROM students s
    WHERE s.class_id = ?
    ORDER BY s.total_points DESC, s.pet_level DESC
  `).all(req.params.classId)

  const categoryRankings = await buildCategoryRankings(ranking, req.params.classId)

  res.json({ ranking, categoryRankings })
})

export default router
