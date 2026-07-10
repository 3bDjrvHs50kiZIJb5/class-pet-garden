import { v4 as uuidv4 } from 'uuid'

export const WELCOME_VIP_PLAN_ID = 'welcome'
export const WELCOME_VIP_DAYS = 30
const DAY_MS = 24 * 60 * 60 * 1000

function getWelcomeVipEligibleKey(userId) {
  return `welcome_vip_eligible:${userId}`
}

export async function markWelcomeVipEligible(db, userId) {
  await db.prepare(`
    INSERT INTO settings (\`key\`, value) VALUES (?, ?)
    ON DUPLICATE KEY UPDATE value = VALUES(value)
  `).run(getWelcomeVipEligibleKey(userId), '1')
}

export async function isWelcomeVipEligible(db, userId) {
  const row = await db.prepare('SELECT value FROM settings WHERE `key` = ?').get(getWelcomeVipEligibleKey(userId))
  return row?.value === '1'
}

export async function grantWelcomeVipIfEligible(db, userId, classId) {
  const user = await db.prepare('SELECT is_guest FROM users WHERE id = ?').get(userId)
  if (!user || user.is_guest) {
    return null
  }

  const eligible = await isWelcomeVipEligible(db, userId)
  if (!eligible) {
    return null
  }

  const now = Date.now()
  const expiresAt = now + WELCOME_VIP_DAYS * DAY_MS

  await db.prepare(`
    INSERT INTO class_vip_subscriptions (id, class_id, plan, status, started_at, expires_at, created_at, updated_at)
    VALUES (?, ?, ?, 'active', ?, ?, ?, ?)
  `).run(uuidv4(), classId, WELCOME_VIP_PLAN_ID, now, expiresAt, now, now)

  await db.prepare('DELETE FROM settings WHERE `key` = ?').run(getWelcomeVipEligibleKey(userId))

  return {
    plan: WELCOME_VIP_PLAN_ID,
    expiresAt,
    months: 1,
  }
}
