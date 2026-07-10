import rateLimit from 'express-rate-limit'

function isRateLimitDisabled() {
  if (process.env.AUTH_RATE_LIMIT_ENABLED === 'false') {
    return true
  }
  if (process.env.VITEST || process.env.NODE_ENV === 'test') {
    return true
  }
  return false
}

function createAuthRateLimiter({ windowMs, max, message }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => isRateLimitDisabled(),
    handler: (req, res) => {
      res.status(429).json({ error: message })
    },
  })
}

const HOUR_MS = 60 * 60 * 1000
const MINUTE_MS = 60 * 1000

export const registerRateLimit = createAuthRateLimiter({
  windowMs: Number(process.env.AUTH_REGISTER_RATE_LIMIT_WINDOW_MS || HOUR_MS),
  max: Number(process.env.AUTH_REGISTER_RATE_LIMIT_MAX || 1),
  message: '注册过于频繁，请 1 小时后再试',
})

export const loginRateLimit = createAuthRateLimiter({
  windowMs: Number(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS || MINUTE_MS),
  max: Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX || 10),
  message: '登录尝试过于频繁，请稍后再试',
})

export { isRateLimitDisabled }
