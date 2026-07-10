import crypto from 'crypto'

const DEV_TOKEN_SECRET = 'pet-garden-dev-token-secret'

function getTokenSecret() {
  if (process.env.TOKEN_SECRET) {
    return process.env.TOKEN_SECRET
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境必须配置 TOKEN_SECRET 环境变量')
  }
  return DEV_TOKEN_SECRET
}

export function generateToken(userId) {
  const tokenSecret = getTokenSecret()
  const timestamp = Date.now()
  const data = `${userId}:${timestamp}`
  const signature = crypto.createHmac('sha256', tokenSecret).update(data).digest('hex')
  return `${userId}:${timestamp}:${signature}`
}

export function verifyToken(token) {
  if (!token) return null

  const parts = token.split(':')
  if (parts.length !== 3) return null

  const [userId, timestamp, signature] = parts
  const data = `${userId}:${timestamp}`

  let tokenSecret
  try {
    tokenSecret = getTokenSecret()
  } catch {
    return null
  }

  const expectedSignature = crypto.createHmac('sha256', tokenSecret).update(data).digest('hex')

  if (signature.length !== expectedSignature.length) {
    return null
  }
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null
  }

  // Token 有效期 30 天
  const tokenAge = Date.now() - parseInt(timestamp, 10)
  if (tokenAge > 30 * 24 * 60 * 60 * 1000) return null

  return { userId }
}
