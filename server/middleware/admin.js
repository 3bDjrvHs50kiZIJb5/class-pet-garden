import { db } from '../db.js'
import { resolveAuthPayload } from './auth.js'

export const ADMIN_USERNAME = 'admin'

export async function adminMiddleware(req, res, next) {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '') || ''
    const payload = await resolveAuthPayload(token)

    if (!payload) {
      return res.status(401).json({ error: '未登录或登录已过期' })
    }

    req.userId = payload.userId

    const user = await db.prepare('SELECT username, is_guest FROM users WHERE id = ?').get(req.userId)
    if (!user || user.is_guest || user.username !== ADMIN_USERNAME) {
      return res.status(403).json({ error: '需要管理员权限' })
    }

    next()
  } catch (error) {
    next(error)
  }
}
