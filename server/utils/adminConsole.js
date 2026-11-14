import crypto from 'crypto'
import { db } from '../db.js'
import { hashPassword, verifyPassword } from './password.js'
import { getTokenSecret } from './token.js'

const ADMIN_USERNAME = 'admin'
const SESSION_MS = Number(process.env.ADMIN_CONSOLE_SESSION_MS || 30 * 60 * 1000)

export function getAdminConsolePassword() {
  if (process.env.ADMIN_CONSOLE_PASSWORD) {
    return process.env.ADMIN_CONSOLE_PASSWORD
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境必须配置 ADMIN_CONSOLE_PASSWORD')
  }
  return process.env.ADMIN_DEFAULT_PASSWORD || 'admin!@#$'
}

function safeEqualString(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  if (left.length !== right.length) {
    return false
  }
  return crypto.timingSafeEqual(left, right)
}

export function verifyConsolePassword(candidate) {
  let expected
  try {
    expected = getAdminConsolePassword()
  } catch {
    return false
  }
  return safeEqualString(candidate, expected)
}

/** 已登录 admin 时，也可用账户登录密码解锁 */
export async function verifyAdminUnlockPassword(password, userId) {
  if (!password) return false
  if (verifyConsolePassword(password)) {
    return true
  }
  if (!userId) return false
  const user = await db.prepare('SELECT username, password_hash, is_guest FROM users WHERE id = ?').get(userId)
  if (!user || user.is_guest || user.username !== ADMIN_USERNAME) {
    return false
  }
  return verifyPassword(password, user.password_hash)
}

export function generateAdminSessionToken() {
  const tokenSecret = getTokenSecret()
  const timestamp = Date.now()
  const data = `adminConsole:${timestamp}`
  const signature = crypto.createHmac('sha256', tokenSecret).update(data).digest('hex')
  return `${timestamp}:${signature}`
}

export function verifyAdminSessionToken(token) {
  if (!token) return false
  const parts = token.split(':')
  if (parts.length !== 2) return false
  const [timestamp, signature] = parts
  const issuedAt = Number(timestamp)
  if (!issuedAt || Number.isNaN(issuedAt)) return false
  if (Date.now() - issuedAt > SESSION_MS) return false

  let tokenSecret
  try {
    tokenSecret = getTokenSecret()
  } catch {
    return false
  }

  const data = `adminConsole:${timestamp}`
  const expectedSignature = crypto.createHmac('sha256', tokenSecret).update(data).digest('hex')
  if (signature.length !== expectedSignature.length) return false
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return false
  }
  return true
}