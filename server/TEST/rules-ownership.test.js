import { describe, it, expect, beforeEach } from 'vitest'
import { listAccessibleRules, getAccessibleRule, ensureRuleUserIdColumn } from '../utils/rules.js'
import { setupTestDb } from './testDb.js'

async function insertRule(db, { id, name, points, category, isCustom, userId }) {
  await db.prepare(`
    INSERT INTO evaluation_rules (id, name, points, category, is_custom, user_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, points, category, isCustom ? 1 : 0, userId || null, Date.now())
}

describe('评价规则用户隔离', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
    await insertRule(db, { id: 'sys-1', name: '遵守纪律', points: 1, category: '行为', isCustom: false, userId: null })
    await insertRule(db, { id: 'custom-a', name: 'A的规则', points: 2, category: '学习', isCustom: true, userId: 'user-a' })
    await insertRule(db, { id: 'custom-b', name: 'B的规则', points: 3, category: '学习', isCustom: true, userId: 'user-b' })
  })

  it('用户只能看到系统规则和自己创建的自定义规则', async () => {
    const rulesForA = await listAccessibleRules(db, 'user-a')
    expect(rulesForA.map(rule => rule.id).sort()).toEqual(['custom-a', 'sys-1'])

    const rulesForB = await listAccessibleRules(db, 'user-b')
    expect(rulesForB.map(rule => rule.id).sort()).toEqual(['custom-b', 'sys-1'])
  })

  it('用户不能访问他人创建的自定义规则', async () => {
    expect((await getAccessibleRule(db, 'custom-a', 'user-a'))?.name).toBe('A的规则')
    expect(await getAccessibleRule(db, 'custom-b', 'user-a')).toBeUndefined()
    expect((await getAccessibleRule(db, 'sys-1', 'user-a'))?.name).toBe('遵守纪律')
  })

  it('删除自定义规则时应校验创建者', async () => {
    const result = await db.prepare('DELETE FROM evaluation_rules WHERE id = ? AND is_custom = 1 AND user_id = ?')
      .run('custom-b', 'user-a')
    expect(result.changes).toBe(0)

    const ownDelete = await db.prepare('DELETE FROM evaluation_rules WHERE id = ? AND is_custom = 1 AND user_id = ?')
      .run('custom-a', 'user-a')
    expect(ownDelete.changes).toBe(1)
    expect((await listAccessibleRules(db, 'user-a')).some(rule => rule.id === 'custom-a')).toBe(false)
  })

  it('应为旧库补齐 user_id 字段', async () => {
    await ensureRuleUserIdColumn(db)
    const columns = await db.prepare(`
      SELECT COLUMN_NAME AS name
      FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'evaluation_rules'
    `).all()
    expect(columns.some(column => column.name === 'user_id')).toBe(true)
  })
})
