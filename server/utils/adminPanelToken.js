import crypto from 'crypto'

const PANEL_TOKEN_TYPE = 'admin_panel'
const PANEL_TTL_MS = 8 * 60 * 60 * 1000

const DEV_PANEL_SECRET = 'pet-garden-dev-admin-panel-secret'

function getPanelSecret() {
  if (process.env.ADMIN_PANEL_SECRET) {
    return process.env.ADMIN_PANEL_SECRET
  }
  if (process.env.TOKEN_SECRET) {
    return `${process.env.TOKEN_SECRET}:admin_panel`
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('生产环境必须配置 ADMIN_PANEL_SECRET 或 TOKEN_SECRET')
  }
  return DEV_PANEL_SECRET
}

export function generateAdminPanelToken() {
  const timestamp = Date.now()
  const data = `${PANEL_TOKEN_TYPE}:${timestamp}`
  const signature = crypto.createHmac('sha256', getPanelSecret()).update(data).digest('hex')
  return `${PANEL_TOKEN_TYPE}:${timestamp}:${signature}`
}

export function verifyAdminPanelToken(token) {
  if (!token) return false

  const parts = token.split(':')
  if (parts.length !== 3) return false
  if (parts[0] !== PANEL_TOKEN_TYPE) return false

  const timestamp = parseInt(parts[1], 10)
  if (Number.isNaN(timestamp)) return false
  if (Date.now() - timestamp > PANEL_TTL_MS) return false

  const data = `${PANEL_TOKEN_TYPE}:${timestamp}`
  let panelSecret
  try {
    panelSecret = getPanelSecret()
  } catch {
    return false
  }

  const expectedSignature = crypto.createHmac('sha256', panelSecret).update(data).digest('hex')
  const signature = parts[2]
  if (signature.length !== expectedSignature.length) {
    return false
  }
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}

export { PANEL_TTL_MS }