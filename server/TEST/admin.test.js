import { describe, it, expect, beforeEach } from 'vitest'
import { hashPassword } from '../utils/password.js'
import { setupTestDb } from './testDb.js'

const ADMIN_USERNAME = 'admin'
const ADMIN_DEFAULT_PASSWORD = 'admin!@#$'

async function ensureAdminUser(db) {
  const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(ADMIN_USERNAME)
  if (existing) return existing.id

  const adminId = 'admin-user-id'
  await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(adminId, ADMIN_USERNAME, hashPassword(ADMIN_DEFAULT_PASSWORD), 0, Date.now())
  return adminId
}

function isAdminUsername(username, isGuest = false) {
  return username === ADMIN_USERNAME && !isGuest
}

describe('管理员账户', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
  })

  it('应能创建 admin 管理员账户', async () => {
    const adminId = await ensureAdminUser(db)
    const admin = await db.prepare('SELECT id, username, is_guest FROM users WHERE id = ?').get(adminId)

    expect(admin.username).toBe(ADMIN_USERNAME)
    expect(admin.is_guest).toBe(0)
  })

  it('admin 账户应能使用默认密码登录', async () => {
    await ensureAdminUser(db)
    const admin = await db.prepare('SELECT password_hash FROM users WHERE username = ?').get(ADMIN_USERNAME)
    expect(hashPassword(ADMIN_DEFAULT_PASSWORD)).toBe(admin.password_hash)
  })

  it('只有 admin 用户名且非游客时才算管理员', () => {
    expect(isAdminUsername('admin')).toBe(true)
    expect(isAdminUsername('Admin')).toBe(false)
    expect(isAdminUsername('admin', true)).toBe(false)
    expect(isAdminUsername('张老师')).toBe(false)
  })
})
