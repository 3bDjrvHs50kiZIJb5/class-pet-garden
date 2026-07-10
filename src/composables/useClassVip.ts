import { ref } from 'vue'
import { useAuth } from './useAuth'
import type { ClassVipItem } from '@/types'

export const CURRENT_CLASS_CHANGED_EVENT = 'pet-garden:current-class-changed'

const currentClassVipActive = ref(false)

export function getCurrentClassStorageKey(userId?: string | null) {
  return `pet-garden-current-class-${userId || 'guest'}`
}

export function getSavedClassId(userId?: string | null) {
  return localStorage.getItem(getCurrentClassStorageKey(userId))
}

export function notifyCurrentClassChanged() {
  window.dispatchEvent(new CustomEvent(CURRENT_CLASS_CHANGED_EVENT))
}

export function saveCurrentClassId(classId: string, userId?: string | null) {
  localStorage.setItem(getCurrentClassStorageKey(userId), classId)
  notifyCurrentClassChanged()
}

export function useClassVip() {
  const { api, user } = useAuth()

  async function refreshClassVipStatus() {
    const classId = getSavedClassId(user.value?.id)
    if (!classId) {
      currentClassVipActive.value = false
      return
    }

    try {
      const res = await api.get('/vip')
      const item = (res.data.classes as ClassVipItem[] || []).find(cls => cls.id === classId)
      currentClassVipActive.value = Boolean(item?.vip?.isActive)
    } catch (error) {
      console.error('加载班级 VIP 状态失败:', error)
      currentClassVipActive.value = false
    }
  }

  return {
    currentClassVipActive,
    refreshClassVipStatus,
  }
}
