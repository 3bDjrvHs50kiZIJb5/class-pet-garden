import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendAsync, sendTeacherRegisterNotice } from '../services/showDocPushService.js'

describe('ShowDoc 注册推送', () => {
  const originalEnv = process.env.NODE_ENV

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
  })

  it('开发环境应跳过推送', async () => {
    process.env.NODE_ENV = 'development'
    const fetchMock = vi.spyOn(globalThis, 'fetch')

    await sendTeacherRegisterNotice('张老师')

    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('生产环境应发送教师注册通知', async () => {
    process.env.NODE_ENV = 'production'
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => 'ok'
    })

    const registeredAt = new Date('2026-07-10T07:17:00.000Z')
    await sendTeacherRegisterNotice('13800138000', registeredAt, {
      clientIp: '203.0.113.8',
      hostname: 'pets.renzhe.org',
      userAgent: 'Mozilla/5.0 Test',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('push.showdoc.com.cn')
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded')

    const params = new URLSearchParams(options.body.toString())
    expect(params.get('title')).toBe('班级宠物园·新教师 13800138000（203.0.113.8）')
    const content = params.get('content') || ''
    expect(content).toContain('手机号：13800138000')
    expect(content).toContain('注册时间：')
    expect(content).toContain('客户端 IP：203.0.113.8')
    expect(content).toContain('来源域名：pets.renzhe.org')
    expect(content).toContain('User-Agent：Mozilla/5.0 Test')
  })

  it('推送失败时不应抛出异常', async () => {
    process.env.NODE_ENV = 'production'
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => 'error'
    })
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    await expect(sendAsync('测试标题', '测试内容')).resolves.toBeUndefined()
    expect(warnSpy).toHaveBeenCalled()
  })
})
