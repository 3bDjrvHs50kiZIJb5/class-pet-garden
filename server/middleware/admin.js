import { verifyAdminSessionToken } from '../utils/adminConsole.js'

export const ADMIN_USERNAME = 'admin'

export function adminConsoleMiddleware(req, res, next) {
  const sessionToken = req.headers['x-admin-session']
  if (!sessionToken || typeof sessionToken !== 'string') {
    return res.status(403).json({ error: '需要验证管理员密码' })
  }
  if (!verifyAdminSessionToken(sessionToken)) {
    return res.status(403).json({ error: '管理员会话已过期，请重新输入密码' })
  }
  next()
}