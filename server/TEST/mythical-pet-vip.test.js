import { describe, it, expect, beforeEach } from 'vitest'
import { isMythicalPet } from '../utils/pets.js'
import { isClassVipActive } from '../utils/vip.js'
import { setupTestDb } from './testDb.js'

describe('神兽领养 VIP 限制', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
    const now = Date.now()
    await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('class-1', 'user-1', '测试班', now, now)
  })

  it('应识别神兽宠物类型', () => {
    expect(isMythicalPet('white-tiger')).toBe(true)
    expect(isMythicalPet('corgi')).toBe(false)
  })

  it('未开通 VIP 的班级不应允许领养神兽', async () => {
    expect(await isClassVipActive(db, 'class-1')).toBe(false)
  })

  it('VIP 生效中的班级应允许领养神兽', async () => {
    const now = Date.now()
    await db.prepare(`
      INSERT INTO class_vip_subscriptions (id, class_id, plan, status, started_at, expires_at, created_at, updated_at)
      VALUES (?, ?, 'manual', 'active', ?, ?, ?, ?)
    `).run('vip-1', 'class-1', now, now + 30 * 24 * 60 * 60 * 1000, now, now)

    expect(await isClassVipActive(db, 'class-1')).toBe(true)
  })

  it('VIP 已过期的班级不应允许领养神兽', async () => {
    const now = Date.now()
    await db.prepare(`
      INSERT INTO class_vip_subscriptions (id, class_id, plan, status, started_at, expires_at, created_at, updated_at)
      VALUES (?, ?, 'manual', 'active', ?, ?, ?, ?)
    `).run('vip-1', 'class-1', now - 60 * 24 * 60 * 60 * 1000, now - 1000, now, now)

    expect(await isClassVipActive(db, 'class-1')).toBe(false)
  })
})
