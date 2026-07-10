import { describe, it, expect, beforeEach } from 'vitest'
import { setupTestDb } from './testDb.js'

async function queryEvaluationRecordsPage(db, { classId, userId, page = 1, pageSize = 20 }) {
  const safePage = Math.max(1, Number(page) || 1)
  const safePageSize = Math.min(100, Math.max(1, Number(pageSize) || 20))
  const offset = (safePage - 1) * safePageSize

  const params = [userId, classId]
  const query = `
    SELECT er.*, s.name as student_name
    FROM evaluation_records er
    JOIN students s ON er.student_id = s.id
    JOIN classes c ON er.class_id = c.id
    WHERE c.user_id = ? AND er.class_id = ?
    ORDER BY er.timestamp DESC
    LIMIT ${safePageSize} OFFSET ${offset}
  `

  return db.prepare(query).all(...params)
}

describe('评价记录分页查询', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
  })

  it('LIMIT/OFFSET 应能正常分页，不触发 MySQL 预处理参数错误', async () => {
    const now = Date.now()

    await db.prepare(`INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES ('class-1', 'user-1', '三年二班', ?, ?)`)
      .run(now, now)
    await db.prepare(`INSERT INTO students (id, class_id, name) VALUES ('student-1', 'class-1', '小明')`).run()

    for (let i = 1; i <= 5; i++) {
      await db.prepare(`
        INSERT INTO evaluation_records (id, class_id, student_id, points, reason, category, timestamp)
        VALUES (?, 'class-1', 'student-1', 1, ?, '学习', ?)
      `).run(`record-${i}`, `记录${i}`, now + i)
    }

    const page1 = await queryEvaluationRecordsPage(db, { classId: 'class-1', userId: 'user-1', page: 1, pageSize: 2 })
    const page2 = await queryEvaluationRecordsPage(db, { classId: 'class-1', userId: 'user-1', page: 2, pageSize: 2 })

    expect(page1).toHaveLength(2)
    expect(page2).toHaveLength(2)
    expect(page1[0].id).toBe('record-5')
    expect(page2[0].id).toBe('record-3')
  })
})
