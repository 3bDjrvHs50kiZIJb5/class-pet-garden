import { computed, ref } from 'vue'

const STORAGE_KEY = 'adminSession'
const EXPIRES_KEY = 'adminSessionExpiresAt'

function readStored() {
  const token = sessionStorage.getItem(STORAGE_KEY)
  const expiresRaw = sessionStorage.getItem(EXPIRES_KEY)
  const expiresAt = expiresRaw ? Number(expiresRaw) : 0
  if (!token || !expiresAt || Date.now() >= expiresAt) {
    clearAdminSession()
    return { token: '', expiresAt: 0 }
  }
  return { token, expiresAt }
}

const stored = readStored()
const adminSessionToken = ref(stored.token)
const adminSessionExpiresAt = ref(stored.expiresAt)

function isAdminSessionActive() {
  if (!adminSessionToken.value) return false
  if (Date.now() >= adminSessionExpiresAt.value) {
    clearAdminSession()
    return false
  }
  return true
}

const hasAdminSession = computed(() => isAdminSessionActive())

export function setAdminSession(token: string, expiresAt: number) {
  adminSessionToken.value = token
  adminSessionExpiresAt.value = expiresAt
  sessionStorage.setItem(STORAGE_KEY, token)
  sessionStorage.setItem(EXPIRES_KEY, String(expiresAt))
}

export function clearAdminSession() {
  adminSessionToken.value = ''
  adminSessionExpiresAt.value = 0
  sessionStorage.removeItem(STORAGE_KEY)
  sessionStorage.removeItem(EXPIRES_KEY)
}

export function getAdminSessionHeader(): string | undefined {
  if (!isAdminSessionActive()) return undefined
  return adminSessionToken.value
}

export { hasAdminSession, isAdminSessionActive }

export function useAdminSession() {
  return {
    adminSessionToken,
    adminSessionExpiresAt,
    hasAdminSession,
    setAdminSession,
    clearAdminSession,
    getAdminSessionHeader,
  }
}