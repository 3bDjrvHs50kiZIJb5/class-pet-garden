import { describe, it, expect, beforeEach } from 'vitest'
import { setupTestDb } from './testDb.js'
import { ensureDemoData, resetDemoData } from '../demo-seed.js'
import { getMillisecondsUntilNextMidnight } from '../utils/demoResetScheduler.js'
import { isClassVipActive } from '../utils/vip.js'
import { normalizeVipRow } from '../routes/vip.js'

const DEMO_CLASS_ID = 'demo-class-2026'

describe('演示数据每日重置', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
    await db.prepare(`INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES ('guest-1', 'guest', '', 1, ?)`)
      .run(Date.now())
    await ensureDemoData(db, 'guest-1')
  })

  it('resetDemoData 应恢复演示班级到初始积分', async () => {
    await db.prepare('UPDATE students SET total_points = 999, pet_exp = 999 WHERE id = ?')
      .run('demo-student-01')
    await db.prepare('DELETE FROM evaluation_records WHERE class_id = ?')
      .run(DEMO_CLASS_ID)

    const result = await resetDemoData(db, 'guest-1')
    const student = await db.prepare('SELECT total_points FROM students WHERE id = ?').get('demo-student-01')
    const records = await db.prepare('SELECT COUNT(*) AS total FROM evaluation_records WHERE class_id = ?').get(DEMO_CLASS_ID)

    expect(result.seeded).toBe(true)
    expect(student.total_points).toBe(720)
    expect(records.total).toBeGreaterThan(0)
    expect(await isClassVipActive(db, DEMO_CLASS_ID)).toBe(true)
  })

  it('getMillisecondsUntilNextMidnight 应返回当天剩余毫秒数', () => {
    const shanghaiMidnight = Date.UTC(2026, 6, 10, 16, 0, 0)
    const shanghaiNoon = Date.UTC(2026, 6, 11, 4, 0, 0)

    expect(getMillisecondsUntilNextMidnight('Asia/Shanghai', shanghaiMidnight)).toBe(ONE_DAY_MS)
    expect(getMillisecondsUntilNextMidnight('Asia/Shanghai', shanghaiNoon)).toBe(12 * 60 * 60 * 1000)
  })
})

const ONE_DAY_MS = 24 * 60 * 60 * 1000
