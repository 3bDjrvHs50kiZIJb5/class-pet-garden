const STORAGE_KEY = 'adminPanelToken'

export function getAdminPanelToken(): string {
  return sessionStorage.getItem(STORAGE_KEY) || ''
}

export function setAdminPanelToken(token: string) {
  sessionStorage.setItem(STORAGE_KEY, token)
}

export function clearAdminPanelToken() {
  sessionStorage.removeItem(STORAGE_KEY)
}