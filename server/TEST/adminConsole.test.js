import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  generateAdminSessionToken,
  verifyAdminSessionToken,
  verifyConsolePassword,
} from '../utils/adminConsole.js'

describe('管理员后台口令', () => {
  const originalPassword = process.env.ADMIN_CONSOLE_PASSWORD

  afterEach(() => {
    if (originalPassword === undefined) {
      delete process.env.ADMIN_CONSOLE_PASSWORD
    } else {
      process.env.ADMIN_CONSOLE_PASSWORD = originalPassword
    }
  })

  it('应校验 ADMIN_CONSOLE_PASSWORD', () => {
    process.env.ADMIN_CONSOLE_PASSWORD = 'test-console-secret'
    expect(verifyConsolePassword('test-console-secret')).toBe(true)
    expect(verifyConsolePassword('wrong')).toBe(false)
  })

  it('应签发并验证 admin session', () => {
    const token = generateAdminSessionToken()
    expect(verifyAdminSessionToken(token)).toBe(true)
    expect(verifyAdminSessionToken('bad:token')).toBe(false)
  })
})