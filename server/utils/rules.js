export async function listAccessibleRules(db, userId) {
  return db.prepare(`
    SELECT * FROM evaluation_rules
    WHERE is_custom = 0 OR user_id = ?
    ORDER BY category, points DESC
  `).all(userId)
}

export async function getAccessibleRule(db, ruleId, userId) {
  return db.prepare(`
    SELECT * FROM evaluation_rules
    WHERE id = ? AND (is_custom = 0 OR user_id = ?)
  `).get(ruleId, userId)
}

export async function ensureRuleUserIdColumn(db) {
  const columns = await db.prepare(`
    SELECT COLUMN_NAME AS name
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evaluation_rules'
  `).all()

  if (!columns.some(column => column.name === 'user_id')) {
    await db.exec('ALTER TABLE evaluation_rules ADD COLUMN user_id VARCHAR(36) NULL')
  }
}
