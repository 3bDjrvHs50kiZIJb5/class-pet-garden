import { verifyToken } from '../utils/token.js'
import { db } from '../db.js'

export async function resolveAuthPayload(token) {
  if (token === 'guest') {
    const guest = await db.prepare('SELECT id FROM users WHERE username = ?').get('guest')
    return guest ? { userId: guest.id } : null
  }
  return verifyToken(token)
}

export async function authMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || ''
    const payload = await resolveAuthPayload(token)

    if (!payload) {
      return res.status(401).json({ error: '未登录或登录已过期' })
    }

    req.userId = payload.userId
    next()
  } catch (error) {
    next(error)
  }
}

export async function optionalAuthMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || ''
    const payload = verifyToken(token)

    if (payload) {
      req.userId = payload.userId
    }

    next()
  } catch (error) {
    next(error)
  }
}
