import { describe, it, expect } from 'vitest'
import { getDefaultEndOfTodayLocal, toDatetimeLocalValue, fromDatetimeLocalValue } from '../../src/utils/datetime'

describe('datetime 工具', () => {
  it('getDefaultEndOfTodayLocal 应返回本地今天 23:59', () => {
    const value = getDefaultEndOfTodayLocal()
    expect(value).toMatch(/T23:59$/)
  })

  it('toDatetimeLocalValue 不应因 UTC 偏移导致显示为 15:59', () => {
    const date = new Date('2026-07-10T18:36:00')
    date.setHours(23, 59, 0, 0)
    const value = toDatetimeLocalValue(date.getTime())
    expect(value.endsWith('T23:59')).toBe(true)
    expect(fromDatetimeLocalValue(value)).toBe(date.getTime())
  })
})
