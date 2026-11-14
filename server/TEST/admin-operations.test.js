import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getMillisecondsUntilNextMidnight, DEFAULT_TIMEZONE } from '../utils/demoResetScheduler.js'
import { DEMO_CLASS_ID } from '../utils/adminCleanup.js'
import { setupTestDb } from './testDb.js'

const ONE_DAY_MS = 24 * 60 * 60 * 1000

function getStartOfTodayMs(timeZone, now = Date.now()) {
  return now - (ONE_DAY_MS - getMillisecondsUntilNextMidnight(timeZone, now))
}

describe('管理运营统计', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
  })

  it('应能统计近 7 日教师注册数', async () => {
    const now = Date.now()
    const startOf7Days = getStartOfTodayMs(DEFAULT_TIMEZONE, now) - 6 * ONE_DAY_MS

    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('t-old', '13800000001', 'hash', 0, startOf7Days - ONE_DAY_MS)
    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('t-new', '13800000002', 'hash', 0, startOf7Days + 1000)

    const row = await db.prepare(`
      SELECT COUNT(*) AS count FROM users
      WHERE is_guest = 0 AND LOWER(username) != 'admin' AND created_at >= ?
    `).get(startOf7Days)

    expect(row.count).toBe(1)
  })

  it('演示班下次重置时间应在未来 24 小时内', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-06-15T15:30:00+08:00'))
    const delay = getMillisecondsUntilNextMidnight(DEFAULT_TIMEZONE)
    expect(delay).toBeGreaterThan(0)
    expect(delay).toBeLessThanOrEqual(ONE_DAY_MS)
    vi.useRealTimers()
  })

  it('应能读取演示班学生数量', async () => {
    const now = Date.now()
    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('guest-1', 'guest', '', 1, now)
    await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run(DEMO_CLASS_ID, 'guest-1', '演示班级', now, now)
    await db.prepare('INSERT INTO students (id, class_id, name) VALUES (?, ?, ?)').run('s1', DEMO_CLASS_ID, '小明')

    const row = await db.prepare('SELECT COUNT(*) AS count FROM students WHERE class_id = ?').get(DEMO_CLASS_ID)
    expect(row.count).toBe(1)
  })
})