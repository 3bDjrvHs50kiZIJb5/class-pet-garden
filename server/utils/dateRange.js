/**
 * 返回指定日期当天的起止时间戳（毫秒，含当天结束时刻）。
 */
export function getDayTimestampRange(date = new Date()) {
  const start = new Date(date)
  start.setHours(0, 0, 0, 0)

  const end = new Date(date)
  end.setHours(23, 59, 59, 999)

  return { start: start.getTime(), end: end.getTime() }
}

export function getTodayTimestampRange(now = new Date()) {
  return getDayTimestampRange(now)
}
