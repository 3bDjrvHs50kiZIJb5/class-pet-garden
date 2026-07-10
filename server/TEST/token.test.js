// @vitest-environment node

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { generateToken, verifyToken } from '../utils/token.js'

const originalEnv = { ...process.env }

describe('Token 签名密钥', () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    delete process.env.NODE_ENV
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('应使用环境变量中的 TOKEN_SECRET', () => {
    process.env.TOKEN_SECRET = 'unit-test-secret-key'
    const token = generateToken('user-1')
    expect(verifyToken(token)).toEqual({ userId: 'user-1' })
  })

  it('更换密钥后旧 token 应失效', () => {
    process.env.TOKEN_SECRET = 'old-secret'
    const token = generateToken('user-1')

    process.env.TOKEN_SECRET = 'new-secret'
    expect(verifyToken(token)).toBeNull()
  })

  it('生产环境未配置 TOKEN_SECRET 时应拒绝签发 token', () => {
    process.env.NODE_ENV = 'production'
    delete process.env.TOKEN_SECRET

    expect(() => generateToken('user-1')).toThrow('生产环境必须配置 TOKEN_SECRET 环境变量')
  })
})
