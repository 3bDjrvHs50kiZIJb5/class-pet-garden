const SITEVERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify'

/** Cloudflare 文档中的 always-pass 测试密钥（仅非 production 回退） */
const CF_TEST_SECRET = '1x0000000000000000000000000000000AA'

export function getTurnstileSecret() {
  if (process.env.TURNSTILE_SECRET) return process.env.TURNSTILE_SECRET
  if (process.env.NODE_ENV !== 'production') return CF_TEST_SECRET
  return ''
}

export function getTurnstileAllowedHostnames() {
  const raw = process.env.TURNSTILE_HOSTNAMES || 'localhost,127.0.0.1'
  return new Set(
    raw
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  )
}

/**
 * @param {string} token Turnstile response token
 * @param {{ remoteIp?: string, expectedAction?: string }} [opts]
 */
export async function verifyTurnstileToken(token, opts = {}) {
  const { remoteIp, expectedAction = 'register' } = opts

  if (!token || typeof token !== 'string') {
    return { ok: false, error: '请先完成人机验证' }
  }

  const secret = getTurnstileSecret()
  if (!secret) {
    console.error('TURNSTILE_SECRET 未配置')
    return { ok: false, error: '人机验证暂未配置' }
  }

  const body = new URLSearchParams({ secret, response: token })
  if (remoteIp) body.set('remoteip', remoteIp)

  let data
  try {
    const res = await fetch(SITEVERIFY_URL, { method: 'POST', body })
    data = await res.json()
  } catch (error) {
    console.error('Turnstile siteverify 请求失败:', error)
    return { ok: false, error: '验证服务暂时不可用' }
  }

  if (!data?.success) {
    const codes = (data?.['error-codes'] || []).join(', ')
    console.warn('Turnstile 验证失败:', codes || 'unknown')
    return { ok: false, error: '人机验证未通过，请重试' }
  }

  if (expectedAction && data.action && data.action !== expectedAction) {
    return { ok: false, error: '人机验证无效' }
  }

  const allowed = getTurnstileAllowedHostnames()
  const hostname = typeof data.hostname === 'string' ? data.hostname.toLowerCase() : ''
  if (hostname && allowed.size > 0 && !allowed.has(hostname)) {
    console.warn('Turnstile hostname 不在白名单:', hostname)
    return { ok: false, error: '人机验证无效' }
  }

  return { ok: true }
}