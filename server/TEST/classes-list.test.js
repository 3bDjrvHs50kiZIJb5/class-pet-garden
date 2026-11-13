import { describe, it, expect, beforeEach } from 'vitest'
import { DEMO_CLASS_ID } from '../utils/adminCleanup.js'
import { setupTestDb } from './testDb.js'

async function listUserClasses(db, userId) {
  return db.prepare(
    'SELECT * FROM classes WHERE user_id = ? AND id != ? ORDER BY created_at DESC'
  ).all(userId, DEMO_CLASS_ID)
}

describe('班级列表应排除演示班', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
  })

  it('游客账户不应在班级列表中看到演示班', async () => {
    const now = Date.now()
    await db.prepare(`INSERT INTO users (id, username, is_guest) VALUES ('guest-1', 'guest', 1)`).run()
    await db.prepare(`INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
      .run(DEMO_CLASS_ID, 'guest-1', '向日葵班 · 成长花园', now, now)
    await db.prepare(`INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES ('class-real', 'guest-1', '三年二班', ?, ?)`)
      .run(now, now)

    const classes = await listUserClasses(db, 'guest-1')
    expect(classes.map(item => item.id)).toEqual(['class-real'])
  })
})
