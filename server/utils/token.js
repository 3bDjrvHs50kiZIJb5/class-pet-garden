import crypto from 'crypto'

const TOKEN_SECRET = 'pet-garden-token-secret'

export function generateToken(userId) {
  const timestamp = Date.now()
  const data = `${userId}:${timestamp}`
  const signature = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('hex')
  return `${userId}:${timestamp}:${signature}`
}

export function verifyToken(token) {
  if (!token) return null

  const parts = token.split(':')
  if (parts.length !== 3) return null

  const [userId, timestamp, signature] = parts
  const data = `${userId}:${timestamp}`
  const expectedSignature = crypto.createHmac('sha256', TOKEN_SECRET).update(data).digest('hex')

  if (signature !== expectedSignature) return null

  // Token 有效期 30 天
  const tokenAge = Date.now() - parseInt(timestamp)
  if (tokenAge > 30 * 24 * 60 * 60 * 1000) return null

  return { userId }
}
