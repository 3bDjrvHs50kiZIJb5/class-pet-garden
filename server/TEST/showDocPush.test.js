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
    await sendTeacherRegisterNotice('李老师', registeredAt)

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, options] = fetchMock.mock.calls[0]
    expect(url).toContain('push.showdoc.com.cn')
    expect(options.method).toBe('POST')
    expect(options.headers['Content-Type']).toBe('application/x-www-form-urlencoded')

    const body = options.body.toString()
    expect(body).toContain('title=' + encodeURIComponent('班级宠物园，教师注册成功'))
    expect(body).toContain('content=')
    expect(decodeURIComponent(body)).toContain('用户名：李老师')
    expect(decodeURIComponent(body)).toContain('注册时间：')
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
