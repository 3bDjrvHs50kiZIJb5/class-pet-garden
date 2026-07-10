import { resetDemoData } from '../demo-seed.js'

const DEFAULT_TIMEZONE = 'Asia/Shanghai'
const ONE_DAY_MS = 24 * 60 * 60 * 1000

export function getMillisecondsUntilNextMidnight(timeZone = DEFAULT_TIMEZONE, now = Date.now()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })
      .formatToParts(new Date(now))
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value])
  )

  const hours = Number(parts.hour)
  const minutes = Number(parts.minute)
  const seconds = Number(parts.second)
  const msElapsedToday = ((hours * 60 + minutes) * 60 + seconds) * 1000

  return ONE_DAY_MS - msElapsedToday
}

export function startDemoResetScheduler(db, getGuestUserId) {
  const timeZone = process.env.DEMO_RESET_TIMEZONE || DEFAULT_TIMEZONE
  let resetTimer = null

  async function runReset() {
    try {
      const guestUserId = await getGuestUserId()
      if (!guestUserId) {
        console.warn('演示数据定时重置跳过：未找到游客用户')
        return
      }

      const result = await resetDemoData(db, guestUserId)
      console.log(`🔄 演示数据已重置：${result.className}（${result.students} 名学生）`)
    } catch (err) {
      console.error('演示数据定时重置失败:', err)
    }
  }

  function scheduleNext() {
    const delay = getMillisecondsUntilNextMidnight(timeZone)
    const nextRunAt = new Date(Date.now() + delay)

    console.log(`⏰ 演示数据将于 ${nextRunAt.toLocaleString('zh-CN', { timeZone })} 重置`)

    resetTimer = setTimeout(async () => {
      await runReset()
      scheduleNext()
    }, delay)

    if (typeof resetTimer.unref === 'function') {
      resetTimer.unref()
    }
  }

  scheduleNext()

  return () => {
    if (resetTimer) {
      clearTimeout(resetTimer)
      resetTimer = null
    }
  }
}
