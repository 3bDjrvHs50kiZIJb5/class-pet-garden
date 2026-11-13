import { describe, it, expect } from 'vitest'
import { buildCumulativeWeekGrowth } from '../utils/weekGrowth.js'
import { getWeekTimestampRange } from '../utils/dateRange.js'

describe('本周成长曲线聚合', () => {
  it('应按日累加正向积分并输出累计值', () => {
    const now = new Date('2026-07-15T12:00:00') // 周三
    const { weekStart } = getWeekTimestampRange(now)
    const mondayMorning = weekStart + 9 * 60 * 60 * 1000
    const tuesdayMorning = weekStart + 24 * 60 * 60 * 1000 + 10 * 60 * 60 * 1000

    const cumulative = buildCumulativeWeekGrowth(
      [
        { points: 5, timestamp: mondayMorning },
        { points: -3, timestamp: mondayMorning + 60_000 },
        { points: 2, timestamp: tuesdayMorning },
      ],
      weekStart,
    )

    expect(cumulative).toEqual([5, 7, 7, 7, 7, 7, 7])
  })
})
