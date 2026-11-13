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

/** 本周周一至周日（本地时区）时间范围 */
export function getWeekTimestampRange(now = new Date()) {
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() - diff)
  const weekStart = monday.getTime()

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)

  return { start: weekStart, end: sunday.getTime(), weekStart }
}
