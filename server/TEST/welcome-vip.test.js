import { describe, it, expect, beforeEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { hashPassword } from '../utils/password.js'
import {
  grantWelcomeVipIfEligible,
  isWelcomeVipEligible,
  markWelcomeVipEligible,
  WELCOME_VIP_DAYS,
  WELCOME_VIP_PLAN_ID,
} from '../utils/welcomeVip.js'
import { isClassVipActive } from '../utils/vip.js'
import { normalizeVipRow } from '../routes/vip.js'
import { setupTestDb } from './testDb.js'

const DAY_MS = 24 * 60 * 60 * 1000

async function registerTeacher(db, userId = 'teacher-1', username = '13800138001') {
  const now = Date.now()
  await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(userId, username, hashPassword('123456'), 0, now)
  await markWelcomeVipEligible(db, userId)
  return { userId, now }
}

async function createClass(db, userId, classId = 'class-1', name = '三年一班') {
  const now = Date.now()
  await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
    .run(classId, userId, name, now, now)
  return classId
}

describe('新用户注册礼遇 VIP', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
  })

  it('注册后标记可领取礼遇 VIP', async () => {
    const { userId } = await registerTeacher(db)
    expect(await isWelcomeVipEligible(db, userId)).toBe(true)
  })

  it('创建首个班级时自动赠送 1 个月 VIP', async () => {
    const { userId } = await registerTeacher(db)
    const classId = await createClass(db, userId)

    const granted = await grantWelcomeVipIfEligible(db, userId, classId)
    expect(granted).toEqual({
      plan: WELCOME_VIP_PLAN_ID,
      months: 1,
      expiresAt: expect.any(Number),
    })
    expect(granted.expiresAt).toBeGreaterThan(Date.now() + (WELCOME_VIP_DAYS - 1) * DAY_MS)

    expect(await isWelcomeVipEligible(db, userId)).toBe(false)
    expect(await isClassVipActive(db, classId)).toBe(true)

    const vip = normalizeVipRow(
      await db.prepare('SELECT * FROM class_vip_subscriptions WHERE class_id = ?').get(classId)
    )
    expect(vip?.plan).toBe(WELCOME_VIP_PLAN_ID)
    expect(vip?.isActive).toBe(true)
  })

  it('礼遇 VIP 仅可领取一次', async () => {
    const { userId } = await registerTeacher(db)
    const firstClassId = await createClass(db, userId, 'class-1')
    const secondClassId = await createClass(db, userId, 'class-2', '三年二班')

    const firstGrant = await grantWelcomeVipIfEligible(db, userId, firstClassId)
    const secondGrant = await grantWelcomeVipIfEligible(db, userId, secondClassId)

    expect(firstGrant).not.toBeNull()
    expect(secondGrant).toBeNull()
    expect(await isClassVipActive(db, firstClassId)).toBe(true)
    expect(await isClassVipActive(db, secondClassId)).toBe(false)
  })

  it('游客账户不赠送礼遇 VIP', async () => {
    const userId = uuidv4()
    const now = Date.now()
    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(userId, 'guest-user', hashPassword('123456'), 1, now)
    await markWelcomeVipEligible(db, userId)

    const classId = await createClass(db, userId)
    const granted = await grantWelcomeVipIfEligible(db, userId, classId)

    expect(granted).toBeNull()
    expect(await isClassVipActive(db, classId)).toBe(false)
  })
})
