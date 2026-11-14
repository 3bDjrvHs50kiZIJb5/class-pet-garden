import { afterEach, describe, expect, it, vi } from 'vitest'
import { verifyTurnstileToken, getTurnstileAllowedHostnames } from '../utils/turnstile.js'

describe('turnstile siteverify', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.TURNSTILE_SECRET
    delete process.env.TURNSTILE_HOSTNAMES
    delete process.env.NODE_ENV
  })

  it('缺少 token 应失败', async () => {
    const result = await verifyTurnstileToken('')
    expect(result.ok).toBe(false)
  })

  it('siteverify 成功且 hostname 在白名单应通过', async () => {
    process.env.NODE_ENV = 'test'
    process.env.TURNSTILE_HOSTNAMES = 'localhost,example.com'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({
          success: true,
          action: 'register',
          hostname: 'localhost',
        }),
      })),
    )

    const result = await verifyTurnstileToken('dummy-token', { expectedAction: 'register' })
    expect(result.ok).toBe(true)
  })

  it('hostname 不在白名单应拒绝', async () => {
    process.env.NODE_ENV = 'test'
    process.env.TURNSTILE_HOSTNAMES = 'bot123.cc'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        json: async () => ({
          success: true,
          action: 'register',
          hostname: 'evil.example',
        }),
      })),
    )

    const result = await verifyTurnstileToken('dummy-token')
    expect(result.ok).toBe(false)
  })

  it('解析 TURNSTILE_HOSTNAMES', () => {
    process.env.TURNSTILE_HOSTNAMES = ' LocalHost , bot123.cc '
    const set = getTurnstileAllowedHostnames()
    expect(set.has('localhost')).toBe(true)
    expect(set.has('bot123.cc')).toBe(true)
  })
})