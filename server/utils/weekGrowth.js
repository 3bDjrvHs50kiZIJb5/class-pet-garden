import { getWeekTimestampRange } from './dateRange.js'

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * 将评价记录聚合为本周 7 日累计成长曲线（与前端 Home 逻辑一致）
 */
export function buildCumulativeWeekGrowth(records, weekStart) {
  const dailyValues = Array(7).fill(0)

  for (const record of records) {
    const timestamp = record.timestamp
    if (!timestamp) continue
    const recordDate = new Date(timestamp)
    const recordDayStart = new Date(recordDate)
    recordDayStart.setHours(0, 0, 0, 0)
    const dayIndex = Math.floor((recordDayStart.getTime() - weekStart) / DAY_MS)
    if (dayIndex < 0 || dayIndex > 6) continue
    dailyValues[dayIndex] += Math.max(Number(record.points) || 0, 0)
  }

  let runningTotal = 0
  return dailyValues.map((value) => {
    runningTotal += value
    return runningTotal
  })
}

export async function queryWeekGrowthSummary(db, { userId, classId, now = new Date() }) {
  const { start, end, weekStart } = getWeekTimestampRange(now)
  const rows = await db.prepare(`
    SELECT er.points, er.timestamp
    FROM evaluation_records er
    JOIN classes c ON er.class_id = c.id
    WHERE c.user_id = ? AND er.class_id = ? AND er.timestamp >= ? AND er.timestamp <= ?
  `).all(userId, classId, start, end)

  return {
    cumulative: buildCumulativeWeekGrowth(rows, weekStart),
    weekStart: start,
    weekEnd: end,
  }
}
