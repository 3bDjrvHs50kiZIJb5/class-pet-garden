// @vitest-environment node

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import express from 'express'

const originalEnv = { ...process.env }

async function startTestServer(middleware) {
  const app = express()
  app.set('trust proxy', 1)
  app.use(express.json())
  app.post('/test', middleware, (req, res) => {
    res.json({ ok: true })
  })

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, () => resolve(instance))
  })

  const port = server.address().port
  const baseUrl = `http://127.0.0.1:${port}`

  return {
    baseUrl,
    close: () => new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()))
    }),
  }
}

async function postJson(url, body = {}) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await response.json()
  return { status: response.status, data }
}

describe('认证接口 IP 限流', () => {
  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
    delete process.env.VITEST
    process.env.NODE_ENV = 'production'
    process.env.AUTH_RATE_LIMIT_ENABLED = 'true'
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  it('默认测试环境应跳过限流', async () => {
    process.env.NODE_ENV = 'test'
    process.env.VITEST = 'true'

    const { isRateLimitDisabled } = await import('../middleware/rateLimit.js')
    expect(isRateLimitDisabled()).toBe(true)
  })

  it('同一 IP 1 小时内第二次注册应返回 429', async () => {
    process.env.AUTH_REGISTER_RATE_LIMIT_MAX = '1'
    process.env.AUTH_REGISTER_RATE_LIMIT_WINDOW_MS = '3600000'

    const { registerRateLimit } = await import('../middleware/rateLimit.js')
    const server = await startTestServer(registerRateLimit)

    try {
      const first = await postJson(`${server.baseUrl}/test`)
      const second = await postJson(`${server.baseUrl}/test`)

      expect(first.status).toBe(200)
      expect(second.status).toBe(429)
      expect(second.data.error).toContain('注册过于频繁')
    } finally {
      await server.close()
    }
  })

  it('同一 IP 短时间内多次登录应返回 429', async () => {
    process.env.AUTH_LOGIN_RATE_LIMIT_MAX = '2'
    process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS = '60000'

    const { loginRateLimit } = await import('../middleware/rateLimit.js')
    const server = await startTestServer(loginRateLimit)

    try {
      const first = await postJson(`${server.baseUrl}/test`)
      const second = await postJson(`${server.baseUrl}/test`)
      const third = await postJson(`${server.baseUrl}/test`)

      expect(first.status).toBe(200)
      expect(second.status).toBe(200)
      expect(third.status).toBe(429)
      expect(third.data.error).toContain('登录尝试过于频繁')
    } finally {
      await server.close()
    }
  })
})
