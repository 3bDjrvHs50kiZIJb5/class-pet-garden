import { describe, it, expect, beforeEach, vi } from 'vitest'
import { hashPassword } from '../utils/password.js'
import {
  generateAdminPanelToken,
  verifyAdminPanelToken,
  PANEL_TTL_MS,
} from '../utils/adminPanelToken.js'
import { adminMiddleware, ADMIN_USERNAME } from '../middleware/admin.js'
import { setupTestDb } from './testDb.js'

const ADMIN_DEFAULT_PASSWORD = 'admin!@#$'

async function ensureAdminUser(db) {
  const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(ADMIN_USERNAME)
  if (existing) return existing.id

  const adminId = 'admin-user-id'
  await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
    .run(adminId, ADMIN_USERNAME, hashPassword(ADMIN_DEFAULT_PASSWORD), 0, Date.now())
  return adminId
}

function createMockRes() {
  const res = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.body = payload
      return this
    },
  }
  return res
}

describe('管理面板令牌', () => {
  it('应能生成并通过校验', () => {
    const token = generateAdminPanelToken()
    expect(verifyAdminPanelToken(token)).toBe(true)
  })

  it('伪造令牌应被拒绝', () => {
    expect(verifyAdminPanelToken('admin_panel:123:deadbeef')).toBe(false)
    expect(verifyAdminPanelToken('')).toBe(false)
  })

  it('过期令牌应被拒绝', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
    const token = generateAdminPanelToken()
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z').getTime() + PANEL_TTL_MS + 1)
    expect(verifyAdminPanelToken(token)).toBe(false)
    vi.useRealTimers()
  })
})

describe('adminMiddleware 管理面板', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
    await ensureAdminUser(db)
  })

  it('合法 X-Admin-Access 应放行', async () => {
    const token = generateAdminPanelToken()
    const req = {
      headers: {
        'x-admin-access': `Bearer ${token}`,
      },
    }
    const res = createMockRes()
    let passed = false
    await adminMiddleware(req, res, () => {
      passed = true
    })
    expect(passed).toBe(true)
    expect(req.isAdminPanel).toBe(true)
  })

  it('缺少面板令牌且无 admin 登录应返回 401', async () => {
    const req = { headers: {} }
    const res = createMockRes()
    let passed = false
    await adminMiddleware(req, res, () => {
      passed = true
    })
    expect(passed).toBe(false)
    expect(res.statusCode).toBe(401)
  })
})

describe('管理员解锁密码校验', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
    await ensureAdminUser(db)
  })

  it('正确密码应能对照 admin 账户', async () => {
    const admin = await db.prepare('SELECT password_hash FROM users WHERE username = ?').get(ADMIN_USERNAME)
    const { verifyPassword } = await import('../utils/password.js')
    expect(verifyPassword(ADMIN_DEFAULT_PASSWORD, admin.password_hash)).toBe(true)
    expect(verifyPassword('wrong', admin.password_hash)).toBe(false)
  })
})