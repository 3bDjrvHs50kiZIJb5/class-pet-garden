import { describe, it, expect, beforeEach } from 'vitest'
import { getDayTimestampRange, getTodayTimestampRange } from '../utils/dateRange.js'
import { setupTestDb } from './testDb.js'

async function queryEvaluationRecords(db, { classId, userId, filterToday = false, now = new Date() }) {
  const params = [userId]
  const conditions = ['c.user_id = ?']

  if (classId) {
    conditions.push('er.class_id = ?')
    params.push(classId)
  }

  if (filterToday) {
    const { start, end } = getTodayTimestampRange(now)
    conditions.push('er.timestamp >= ?')
    conditions.push('er.timestamp <= ?')
    params.push(start, end)
  }

  const query = `
    SELECT er.*, s.name as student_name
    FROM evaluation_records er
    JOIN students s ON er.student_id = s.id
    JOIN classes c ON er.class_id = c.id
    WHERE ${conditions.join(' AND ')}
    ORDER BY er.timestamp DESC
  `

  return db.prepare(query).all(...params)
}

describe('评价记录今日筛选', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
  })

  it('getDayTimestampRange 应返回当天 00:00 到 23:59:59.999', () => {
    const date = new Date('2026-07-10T15:30:00')
    const { start, end } = getDayTimestampRange(date)

    expect(new Date(start).getHours()).toBe(0)
    expect(new Date(start).getMinutes()).toBe(0)
    expect(new Date(end).getHours()).toBe(23)
    expect(new Date(end).getMinutes()).toBe(59)
    expect(new Date(end).getSeconds()).toBe(59)
  })

  it('today=1 时只返回今天的评价记录', async () => {
    const now = new Date('2026-07-10T12:00:00')
    const yesterday = now.getTime() - 24 * 60 * 60 * 1000
    const todayMorning = new Date('2026-07-10T09:00:00').getTime()

    await db.prepare(`INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES ('class-1', 'user-1', '三年二班', ?, ?)`)
      .run(now.getTime(), now.getTime())
    await db.prepare(`INSERT INTO students (id, class_id, name) VALUES ('student-1', 'class-1', '小明')`).run()
    await db.prepare(`
      INSERT INTO evaluation_records (id, class_id, student_id, points, reason, category, timestamp)
      VALUES ('record-yesterday', 'class-1', 'student-1', 10, '昨天记录', '学习', ?),
             ('record-today-1', 'class-1', 'student-1', 5, '今天记录1', '行为', ?),
             ('record-today-2', 'class-1', 'student-1', 3, '今天记录2', '健康', ?)
    `).run(yesterday, todayMorning, now.getTime())

    const allRecords = await queryEvaluationRecords(db, { classId: 'class-1', userId: 'user-1' })
    const todayRecords = await queryEvaluationRecords(db, {
      classId: 'class-1',
      userId: 'user-1',
      filterToday: true,
      now
    })

    expect(allRecords).toHaveLength(3)
    expect(todayRecords).toHaveLength(2)
    expect(todayRecords.map(record => record.id)).toEqual(['record-today-2', 'record-today-1'])
  })
})
