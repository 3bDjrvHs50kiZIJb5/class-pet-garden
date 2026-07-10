import crypto from 'crypto'

const SALT = 'pet-garden-secret-salt-2024'

export function hashPassword(password) {
  return crypto.createHmac('sha256', SALT).update(password).digest('hex')
}

export function verifyPassword(password, hash) {
  return hashPassword(password) === hash
}
