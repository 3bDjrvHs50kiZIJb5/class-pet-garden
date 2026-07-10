<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const route = useRoute()
const { api, setUser, isGuest } = useAuth()
const toast = useToast()

const username = ref('')
const password = ref('')
const rememberMe = ref(true)
const loading = ref(false)
const error = ref('')

onMounted(() => {
  if (!isGuest.value) {
    router.replace('/')
  }
})

async function handleSubmit() {
  error.value = ''
  if (!username.value.trim() || !password.value) {
    error.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  try {
    const res = await api.post('/auth/login', {
      username: username.value.trim(),
      password: password.value
    })
    if (res.data.success) {
      setUser(res.data.user, res.data.token)
      toast.success(`欢迎，${res.data.user.username}！`)
      const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
      router.replace(redirect)
    }
  } catch (err: any) {
    error.value = err.response?.data?.error || '登录失败，请重试'
  } finally {
    loading.value = false
  }
}

function guestContinue() {
  router.push('/')
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-[#fffdfb] text-[#38281f]">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute -right-16 -top-20 h-80 w-80 rounded-full bg-[#ffe9d6] opacity-55"></div>
      <div class="absolute -left-16 bottom-24 h-56 w-56 rounded-full bg-[#fff1e8] opacity-80"></div>
      <div class="absolute right-24 top-[520px] h-36 w-36 rounded-full bg-[#ffd9c2] opacity-45"></div>
    </div>

    <div class="relative mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
      <section class="flex flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:px-12 lg:py-16">
        <div class="flex items-center gap-3.5">
          <span class="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#ffe7c8] shadow-sm">
            <span class="material-symbols-rounded text-[28px] text-[#d97706]">pets</span>
          </span>
          <div>
            <p class="text-sm font-bold text-[#ff5c00]">班级宠物园</p>
            <p class="text-sm text-[#9a5a2b]">CLASS PET GARDEN</p>
          </div>
        </div>

        <h1 class="mt-7 font-serif text-4xl font-bold leading-tight text-[#1a1a1a] sm:text-5xl">欢迎回到宠物园</h1>
        <p class="mt-4 max-w-md text-base leading-7 text-[#666]">
          老师登录后即可管理班级评价、宠物成长与班级荣誉，让每一次鼓励都被看见。
        </p>

        <div class="mt-8 max-w-md rounded-[20px] border border-[#f0e7dd] bg-white p-5 shadow-[0_16px_40px_rgba(101,71,45,0.08)]">
          <img src="/companion-effect-crop.png" alt="陪伴插画" class="h-24 w-full rounded-2xl object-cover" />
          <p class="mt-3 text-sm font-bold text-[#9a5a2b]">用爱与鼓励，陪伴每一个孩子成长</p>
          <p class="mt-1 text-sm text-[#c06a5a]">评价一次，成长一点</p>
        </div>
      </section>

      <section class="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:px-12">
        <div class="w-full max-w-[440px] rounded-3xl border border-[#f0e7dd] bg-white p-7 shadow-[0_16px_40px_rgba(101,71,45,0.08)] sm:p-9">
          <h2 class="font-serif text-3xl font-bold text-[#1a1a1a]">登录账号</h2>
          <p class="mt-2 text-sm text-[#666]">使用老师账号进入管理后台</p>

          <div v-if="error" class="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {{ error }}
          </div>

          <form class="mt-6 space-y-4" @submit.prevent="handleSubmit">
            <div>
              <label class="mb-2 block text-sm font-semibold text-[#38281f]">用户名</label>
              <label class="flex h-12 items-center gap-2.5 rounded-xl border border-[#edeff2] bg-white px-3.5 focus-within:border-orange-300">
                <span class="material-symbols-rounded text-[18px] text-[#999]">person</span>
                <input
                  v-model="username"
                  type="text"
                  class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#b9a697]"
                  placeholder="请输入用户名"
                  autocomplete="username"
                />
              </label>
            </div>

            <div>
              <label class="mb-2 block text-sm font-semibold text-[#38281f]">密码</label>
              <label class="flex h-12 items-center gap-2.5 rounded-xl border border-[#edeff2] bg-white px-3.5 focus-within:border-orange-300">
                <span class="material-symbols-rounded text-[18px] text-[#999]">lock</span>
                <input
                  v-model="password"
                  type="password"
                  class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#b9a697]"
                  placeholder="请输入密码"
                  autocomplete="current-password"
                />
              </label>
            </div>

            <div class="flex items-center justify-between text-sm">
              <label class="flex items-center gap-2 text-[#666]">
                <input v-model="rememberMe" type="checkbox" class="h-4 w-4 rounded border-[#edeff2]" />
                记住我
              </label>
              <button type="button" class="font-semibold text-[#ff5c00]">忘记密码？</button>
            </div>

            <button
              type="submit"
              class="flex h-12 w-full items-center justify-center rounded-full bg-[#ff5c00] text-sm font-bold text-white shadow-sm transition hover:bg-[#ea580c] disabled:opacity-60"
              :disabled="loading"
            >
              {{ loading ? '登录中…' : '登录' }}
            </button>
          </form>

          <div class="mt-6 text-center text-sm text-[#666]">
            还没有账号？
            <router-link to="/register" class="font-bold text-[#ff5c00] hover:text-[#ea580c]">立即注册</router-link>
          </div>

          <button
            type="button"
            class="mt-4 w-full text-center text-sm text-[#888] transition hover:text-[#666]"
            @click="guestContinue"
          >
            以游客身份继续
          </button>
        </div>
      </section>
    </div>
  </div>
</template>
