import { ref, computed } from 'vue'
import axios from 'axios'
import {
  clearAdminPanelToken,
  getAdminPanelToken,
  setAdminPanelToken,
} from '@/utils/adminPanelStorage'

const unlocked = ref(Boolean(getAdminPanelToken()))

interface AdminUnlockResponse {
  success: boolean
  adminPanelToken: string
  expiresInMs: number
}

const unlockApi = axios.create({
  baseURL: '/pet-garden/api',
})

async function unlock(password: string): Promise<void> {
  const res = await unlockApi.post<AdminUnlockResponse>('/admin/unlock', { password })
  if (!res.data?.adminPanelToken) {
    throw new Error('解锁失败')
  }
  setAdminPanelToken(res.data.adminPanelToken)
  unlocked.value = true
}

function lock() {
  clearAdminPanelToken()
  unlocked.value = false
}

function syncUnlockedFromStorage() {
  unlocked.value = Boolean(getAdminPanelToken())
}

export function useAdminPanel() {
  return {
    isUnlocked: computed(() => unlocked.value),
    unlock,
    lock,
    syncUnlockedFromStorage,
  }
}