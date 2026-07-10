/** 将时间戳格式化为 datetime-local 输入框所需的本地时间字符串 */
export function toDatetimeLocalValue(timestamp?: number | null) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 将 datetime-local 字符串解析为本地时间戳（毫秒） */
export function fromDatetimeLocalValue(value: string) {
  if (!value) return 0
  return new Date(value).getTime()
}

/** 返回今天 23:59 的 datetime-local 默认值 */
export function getDefaultEndOfTodayLocal() {
  const date = new Date()
  date.setHours(23, 59, 0, 0)
  return toDatetimeLocalValue(date.getTime())
}
