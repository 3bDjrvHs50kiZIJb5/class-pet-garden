import { ref, computed } from 'vue'
import axios from 'axios'

interface User {
  id: string
  username: string
  isGuest: boolean
}

// 全局状态（模块级别单例）
const user = ref<User | null>(null)
const token = ref<string>(localStorage.getItem('token') || '')

// 创建带认证的 axios 实例（单例）
const api = axios.create({
  baseURL: '/pet-garden/api'
})

// 请求拦截器：自动添加 Authorization header
api.interceptors.request.use((config) => {
  // 演示模式会显式使用游客账户读取独立数据，不能被当前老师令牌覆盖。
  if (token.value && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token.value}`
  }
  return config
})

// 响应拦截器：处理 401 错误自动退回游客模式
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !isGuest.value) {
      // 已登录用户 token 失效，退回游客模式
      logout()
    }
    return Promise.reject(error)
  }
)

// 初始化用户状态
const savedUser = localStorage.getItem('user')
if (savedUser) {
  try {
    user.value = JSON.parse(savedUser)
  } catch {
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }
}

// 如果没有用户，自动设置为游客
if (!user.value) {
  const guestUser = { id: 'guest', username: '游客', isGuest: true }
  user.value = guestUser
  token.value = 'guest'
  localStorage.setItem('token', 'guest')
  localStorage.setItem('user', JSON.stringify(guestUser))
}

export const ADMIN_USERNAME = 'admin'

// 计算属性
const isLoggedIn = computed(() => !!user.value && !user.value.isGuest)
const isGuest = computed(() => user.value?.isGuest ?? true)
const username = computed(() => user.value?.username || '游客')
const isAdmin = computed(() => user.value?.username === ADMIN_USERNAME && !user.value?.isGuest)

// 设置用户
function setUser(userData: User, userToken: string) {
  user.value = userData
  token.value = userToken
  localStorage.setItem('token', userToken)
  localStorage.setItem('user', JSON.stringify(userData))
}

// 退出登录（回到游客模式）
function logout() {
  const guestUser = { id: 'guest', username: '游客', isGuest: true }
  user.value = guestUser
  token.value = 'guest'
  localStorage.setItem('token', 'guest')
  localStorage.setItem('user', JSON.stringify(guestUser))
}

// 获取用户信息（已登录用户）
async function fetchUserInfo() {
  if (isGuest.value) return
  try {
    const res = await api.get('/auth/me')
    user.value = res.data.user
  } catch {
    logout()
  }
}

export function useAuth() {
  return {
    user,
    token,
    isLoggedIn,
    isGuest,
    isAdmin,
    username,
    api,
    setUser,
    logout,
    fetchUserInfo
  }
}