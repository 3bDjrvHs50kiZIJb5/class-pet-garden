import { describe, it, expect } from 'vitest'

/** 与 GrowthAreaChart 中 weekTotal 逻辑一致 */
function getWeekTotal(values: number[]) {
  const list = values.length ? values : [0]
  return list[list.length - 1]
}

describe('本周累计统计', () => {
  it('累计曲线应取最后一天作为本周总分，而不是对累计值求和', () => {
    const cumulative = [10, 15, 15, 18, 18, 18, 18]
    expect(getWeekTotal(cumulative)).toBe(18)
    expect(cumulative.reduce((sum, value) => sum + value, 0)).toBe(112)
  })
})
