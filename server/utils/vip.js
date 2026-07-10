export async function isClassVipActive(db, classId) {
  const row = await db.prepare('SELECT status, expires_at FROM class_vip_subscriptions WHERE class_id = ?').get(classId)
  if (!row) return false
  return row.status === 'active' && row.expires_at > Date.now()
}
