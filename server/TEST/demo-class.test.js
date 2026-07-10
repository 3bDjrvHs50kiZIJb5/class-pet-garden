import { describe, it, expect, beforeEach } from 'vitest'
import { setupTestDb } from './testDb.js'
import { ensureDemoData } from '../demo-seed.js'
import { isClassVipActive } from '../utils/vip.js'
import { normalizeVipRow } from '../routes/vip.js'

const DEMO_CLASS_ID = 'demo-class-2026'

describe('演示班级接口数据', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
    await db.prepare(`INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES ('guest-1', 'guest', '', 1, ?)`)
      .run(Date.now())
    await ensureDemoData(db, 'guest-1')
  })

  it('应能读取演示班级、学生与评价记录', async () => {
    const demoClass = await db.prepare('SELECT * FROM classes WHERE id = ?').get(DEMO_CLASS_ID)
    const students = await db.prepare('SELECT * FROM students WHERE class_id = ?').all(DEMO_CLASS_ID)
    const records = await db.prepare('SELECT COUNT(*) AS total FROM evaluation_records WHERE class_id = ?').get(DEMO_CLASS_ID)

    expect(demoClass?.name).toBe('向日葵班 · 成长花园')
    expect(students.length).toBe(16)
    expect(records.total).toBeGreaterThan(0)
    expect(await isClassVipActive(db, DEMO_CLASS_ID)).toBe(true)

    const vip = normalizeVipRow(
      await db.prepare('SELECT * FROM class_vip_subscriptions WHERE class_id = ?').get(DEMO_CLASS_ID)
    )
    expect(vip?.isActive).toBe(true)
    expect(vip?.neverExpires).toBe(true)
    expect(vip?.plan).toBe('demo')
  })
})
