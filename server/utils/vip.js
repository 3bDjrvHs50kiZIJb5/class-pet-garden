import { DEMO_CLASS_ID } from './adminCleanup.js'

export async function isClassVipActive(db, classId) {
  const row = await db.prepare('SELECT status, expires_at, plan FROM class_vip_subscriptions WHERE class_id = ?').get(classId)
  if (!row) return false
  if (classId === DEMO_CLASS_ID && row.plan === 'demo') {
    return row.status === 'active'
  }
  return row.status === 'active' && row.expires_at > Date.now()
}
