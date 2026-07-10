import { useAuth } from '@/composables/useAuth'

// 落地页仅对游客展示；已登录老师通过 useAuth 持久化状态直接进入管理台。
export function useLandingGate() {
  const { isGuest } = useAuth()

  async function shouldShowLanding(): Promise<boolean> {
    return isGuest.value
  }

  return {
    shouldShowLanding
  }
}
