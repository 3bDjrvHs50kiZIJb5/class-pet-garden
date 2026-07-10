<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuth } from '@/composables/useAuth'

interface Props {
  show: boolean
}

defineProps<Props>()
const emit = defineEmits<{
  close: []
  login: [user: { id: string; username: string; isGuest: boolean }]
}>()

const { api, setUser } = useAuth()

const mode = ref<'login' | 'register'>('login')
const username = ref('')
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const error = ref('')

const title = computed(() => mode.value === 'login' ? '登录' : '注册')
const submitText = computed(() => {
  if (loading.value) return '处理中...'
  return mode.value === 'login' ? '登录' : '注册'
})

async function handleSubmit() {
  error.value = ''
  
  if (!username.value.trim() || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }
  
  if (mode.value === 'register') {
    if (username.value.length < 3) {
      error.value = '用户名至少3个字符'
      return
    }
    if (password.value.length < 6) {
      error.value = '密码至少6位'
      return
    }
    if (password.value !== confirmPassword.value) {
      error.value = '两次密码不一致'
      return
    }
  }
  
  loading.value = true
  
  try {
    const endpoint = mode.value === 'login' ? '/auth/login' : '/auth/register'
    const res = await api.post(endpoint, {
      username: username.value.trim(),
      password: password.value
    })
    
    if (res.data.success) {
      // 保存用户信息
      setUser(res.data.user, res.data.token)
      
      emit('login', res.data.user)
      emit('close')
      
      // 重置表单
      username.value = ''
      password.value = ''
      confirmPassword.value = ''
    }
  } catch (err: any) {
    error.value = err.response?.data?.error || '操作失败，请重试'
  } finally {
    loading.value = false
  }
}

function switchMode() {
  mode.value = mode.value === 'login' ? 'register' : 'login'
  error.value = ''
  password.value = ''
  confirmPassword.value = ''
}

function guestLogin() {
  // 游客登录使用默认 token
  const guestUser = { id: 'guest', username: '游客', isGuest: true }
  localStorage.setItem('token', 'guest')
  localStorage.setItem('user', JSON.stringify(guestUser))
  emit('login', guestUser)
  emit('close')
}
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" @click.self="emit('close')">
      <div class="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-bold text-gray-800">{{ title }}</h3>
          <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-600" @click="emit('close')"><span class="material-symbols-rounded text-[20px]">close</span></button>
        </div>
        
        <!-- 错误提示 -->
        <div v-if="error" class="bg-red-50 text-red-600 px-4 py-3 rounded-xl mb-4 text-sm">
          {{ error }}
        </div>
        
        <form @submit.prevent="handleSubmit" class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input 
              v-model="username"
              type="text" 
              placeholder="请输入用户名"
              class="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-400 transition-colors"
              :disabled="loading"
            />
          </div>
          
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input 
              v-model="password"
              type="password" 
              placeholder="请输入密码"
              class="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-400 transition-colors"
              :disabled="loading"
            />
          </div>
          
          <div v-if="mode === 'register'">
            <label class="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
            <input 
              v-model="confirmPassword"
              type="password" 
              placeholder="请再次输入密码"
              class="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:border-orange-400 transition-colors"
              :disabled="loading"
            />
          </div>
          
          <button 
            type="submit"
            class="w-full bg-gradient-to-r from-orange-400 to-pink-500 text-white py-3 rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50"
            :disabled="loading"
          >
            {{ submitText }}
          </button>
        </form>
        
        <div class="mt-6 text-center space-y-2">
          <button @click="switchMode" class="text-orange-500 hover:text-orange-600 text-sm font-medium">
            {{ mode === 'login' ? '没有账号？立即注册' : '已有账号？立即登录' }}
          </button>
          <div class="text-gray-400">或</div>
          <button @click="guestLogin" class="text-gray-500 hover:text-gray-700 text-sm">
            以游客身份继续
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}
</style>
