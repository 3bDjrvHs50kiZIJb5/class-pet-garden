import { describe, it, expect, beforeEach } from 'vitest'
import { setupTestDb } from './testDb.js'

async function queryRanking(db, classId) {
  return db.prepare(`
    SELECT s.*,
           (SELECT COUNT(*) FROM badges WHERE student_id = s.id) as badge_count
    FROM students s
    WHERE s.class_id = ?
    ORDER BY s.total_points DESC, s.pet_level DESC
  `).all(classId)
}

describe('班级排行榜查询', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()

    await db.prepare(`INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
      .run('class-1', 'user-1', '三年二班', Date.now(), Date.now())

    await db.prepare(`
      INSERT INTO students (id, class_id, name, total_points, pet_level, pet_type, pet_exp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('s1', 'class-1', '甲同学', 120, 3, 'corgi', 100, Date.now())

    await db.prepare(`
      INSERT INTO students (id, class_id, name, total_points, pet_level, pet_type, pet_exp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('s2', 'class-1', '乙同学', 120, 5, 'shiba', 120, Date.now())

    await db.prepare(`
      INSERT INTO students (id, class_id, name, total_points, pet_level, pet_type, pet_exp, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run('s3', 'class-1', '丙同学', 80, 2, 'hamster', 60, Date.now())

    await db.prepare(`INSERT INTO badges (id, student_id, pet_type, earned_at) VALUES (?, ?, ?, ?)`)
      .run('b1', 's2', 'shiba', Date.now())
  })

  it('应按 total_points 降序，同分按 pet_level 降序', async () => {
    const ranking = await queryRanking(db, 'class-1')
    expect(ranking.map(student => student.id)).toEqual(['s2', 's1', 's3'])
  })

  it('应附带 badge_count', async () => {
    const ranking = await queryRanking(db, 'class-1')
    const graduated = ranking.find(student => student.id === 's2')
    expect(graduated.badge_count).toBe(1)
    expect(ranking.find(student => student.id === 's1').badge_count).toBe(0)
  })

  it('应只返回指定班级学生', async () => {
    await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('class-2', 'user-1', '外班', Date.now(), Date.now())
    await db.prepare(`
      INSERT INTO students (id, class_id, name, total_points, pet_level, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('s-other', 'class-2', '外班', 999, 8, Date.now())

    const ranking = await queryRanking(db, 'class-1')
    expect(ranking).toHaveLength(3)
    expect(ranking.every(student => student.class_id === 'class-1')).toBe(true)
  })
})

async function buildCategoryRankings(db, students, classId, categories = ['学习', '行为', '健康', '其他']) {
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
    pointsByStudent[row.student_id][row.category] = Number(row.category_points)
  }

  const categoryRankings = {}
  for (const category of categories) {
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

describe('分类排行榜查询', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
    const now = Date.now()

    await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('class-1', 'user-1', '三年二班', now, now)

    const students = [
      { id: 's1', class_id: 'class-1', name: '甲', total_points: 10, pet_level: 2 },
      { id: 's2', class_id: 'class-1', name: '乙', total_points: 8, pet_level: 3 },
      { id: 's3', class_id: 'class-1', name: '丙', total_points: 5, pet_level: 1 },
    ]

    for (const student of students) {
      await db.prepare(`
        INSERT INTO students (id, class_id, name, total_points, pet_level, pet_type, pet_exp, created_at)
        VALUES (?, ?, ?, ?, ?, 'corgi', 0, ?)
      `).run(student.id, student.class_id, student.name, student.total_points, student.pet_level, now)
    }

    await db.prepare(`
      INSERT INTO evaluation_records (id, class_id, student_id, points, reason, category, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('r1', 'class-1', 's1', 5, '作业优秀', '学习', now)

    await db.prepare(`
      INSERT INTO evaluation_records (id, class_id, student_id, points, reason, category, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('r2', 'class-1', 's2', 8, '遵守纪律', '行为', now)

    await db.prepare(`
      INSERT INTO evaluation_records (id, class_id, student_id, points, reason, category, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('r3', 'class-1', 's1', 2, '运动打卡', '健康', now)
  })

  it('应按分类聚合积分并分别排序', async () => {
    const students = await db.prepare('SELECT * FROM students WHERE class_id = ?').all('class-1')
    const categoryRankings = await buildCategoryRankings(db, students, 'class-1')

    expect(categoryRankings['学习'].map(item => item.id)).toEqual(['s1'])
    expect(categoryRankings['学习'][0].category_points).toBe(5)
    expect(categoryRankings['行为'].map(item => item.id)).toEqual(['s2'])
    expect(categoryRankings['健康'].map(item => item.id)).toEqual(['s1'])
    expect(categoryRankings['其他']).toEqual([])
  })
})
