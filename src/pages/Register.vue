<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { isValidPhone } from '@/utils/phone'

const router = useRouter()
const { api, setUser, isGuest } = useAuth()
const toast = useToast()

const phone = ref('')
const password = ref('')
const confirmPassword = ref('')
const agreed = ref(false)
const loading = ref(false)
const error = ref('')

const features = [
  { icon: 'rate_review', title: '快速评价', desc: '老师轻点完成课堂反馈' },
  { icon: 'pets', title: '宠物成长', desc: '每次进步都喂养专属小宠物' },
  { icon: 'emoji_events', title: '班级荣誉', desc: '把个人努力汇成班级勋章' }
]

onMounted(() => {
  if (!isGuest.value) {
    router.replace('/')
  }
})

async function handleSubmit() {
  error.value = ''
  if (!phone.value.trim() || !password.value) {
    error.value = '请输入手机号和密码'
    return
  }
  if (!isValidPhone(phone.value)) {
    error.value = '请输入正确的手机号'
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
  if (!agreed.value) {
    error.value = '请先阅读并同意用户协议'
    return
  }

  loading.value = true
  try {
    const res = await api.post('/auth/register', {
      username: phone.value.trim(),
      password: password.value
    })
    if (res.data.success) {
      setUser(res.data.user, res.data.token)
      const welcomeMessage = res.data.welcomeVip?.message
      toast.success(welcomeMessage ? `注册成功！${welcomeMessage}` : '注册成功，欢迎加入班级宠物园！')
      router.replace('/')
    }
  } catch (err: any) {
    error.value = err.response?.data?.error || '注册失败，请重试'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="relative min-h-screen overflow-hidden bg-[#fffdfb] text-[#38281f]">
    <div class="pointer-events-none absolute inset-0">
      <div class="absolute left-10 -top-24 h-72 w-72 rounded-full bg-[#ffe9d6] opacity-50"></div>
      <div class="absolute -right-10 bottom-20 h-64 w-64 rounded-full bg-[#fff1e8] opacity-75"></div>
      <div class="absolute right-16 top-24 h-28 w-28 rounded-full bg-[#ffd9c2] opacity-40"></div>
    </div>

    <div class="relative mx-auto flex min-h-screen max-w-6xl flex-col lg:flex-row">
      <section class="hidden flex-1 flex-col justify-center px-6 py-10 sm:px-10 lg:flex lg:px-12 lg:py-16">
        <div class="flex items-center gap-3.5">
          <span class="flex h-[52px] w-[52px] items-center justify-center rounded-2xl bg-[#ffe7c8] shadow-sm">
            <span class="material-symbols-rounded text-[28px] text-[#d97706]">pets</span>
          </span>
          <div>
            <p class="text-sm font-bold text-[#ff5c00]">班级宠物园</p>
            <p class="text-sm text-[#9a5a2b]">CLASS PET GARDEN</p>
          </div>
        </div>

        <h1 class="mt-7 font-serif text-4xl font-bold leading-tight text-[#1a1a1a] sm:text-[46px]">开启你的班级宠物园</h1>
        <p class="mt-4 max-w-md text-base leading-7 text-[#666]">
          注册老师账号，快速创建班级、导入学生，让评价与成长在同一块屏幕上发生。
        </p>

        <div class="mt-8 max-w-md space-y-3">
          <div
            v-for="feature in features"
            :key="feature.title"
            class="flex items-center gap-3 rounded-2xl border border-[#f0e7dd] bg-white px-4 py-3"
          >
            <span class="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff3eb] text-[#ff5c00]">
              <span class="material-symbols-rounded text-[20px]">{{ feature.icon }}</span>
            </span>
            <div>
              <p class="text-sm font-bold text-[#1a1a1a]">{{ feature.title }}</p>
              <p class="text-sm text-[#666]">{{ feature.desc }}</p>
            </div>
          </div>
        </div>
      </section>

      <section class="flex flex-1 items-center justify-center px-6 py-10 sm:px-10 lg:px-12">
        <div class="w-full max-w-[440px] rounded-3xl border border-[#f0e7dd] bg-white p-7 shadow-[0_16px_40px_rgba(101,71,45,0.08)] sm:p-8">
          <h2 class="font-serif text-3xl font-bold text-[#1a1a1a]">创建老师账号</h2>
          <p class="mt-2 text-sm text-[#666]">填写信息后即可开始创建班级，新用户首个班级自动赠送 1 个月灵犀计划</p>

          <div v-if="error" class="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-600">
            {{ error }}
          </div>

          <form class="mt-6 space-y-3" @submit.prevent="handleSubmit">
            <div>
              <label class="mb-1.5 block text-sm font-semibold text-[#38281f]">手机号</label>
              <label class="flex h-10 items-center gap-2.5 rounded-xl border border-[#edeff2] bg-white px-3.5 focus-within:border-orange-300">
                <span class="material-symbols-rounded text-[18px] text-[#999]">call</span>
                <input
                  v-model="phone"
                  type="tel"
                  maxlength="11"
                  inputmode="numeric"
                  class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#b9a697]"
                  placeholder="请输入手机号"
                  autocomplete="tel"
                />
              </label>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-semibold text-[#38281f]">密码</label>
              <label class="flex h-10 items-center gap-2.5 rounded-xl border border-[#edeff2] bg-white px-3.5 focus-within:border-orange-300">
                <span class="material-symbols-rounded text-[18px] text-[#999]">lock</span>
                <input
                  v-model="password"
                  type="password"
                  class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#b9a697]"
                  placeholder="请设置登录密码"
                  autocomplete="new-password"
                />
              </label>
            </div>

            <div>
              <label class="mb-1.5 block text-sm font-semibold text-[#38281f]">确认密码</label>
              <label class="flex h-10 items-center gap-2.5 rounded-xl border border-[#edeff2] bg-white px-3.5 focus-within:border-orange-300">
                <span class="material-symbols-rounded text-[18px] text-[#999]">lock_reset</span>
                <input
                  v-model="confirmPassword"
                  type="password"
                  class="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#b9a697]"
                  placeholder="请再次输入密码"
                  autocomplete="new-password"
                />
              </label>
            </div>

            <label class="flex items-start gap-2 pt-1 text-sm text-[#666]">
              <input v-model="agreed" type="checkbox" class="mt-0.5 h-4 w-4 rounded border-[#edeff2]" />
              <span>我已阅读并同意 <span class="font-semibold text-[#ff5c00]">《用户协议》</span> 和 <span class="font-semibold text-[#ff5c00]">《隐私政策》</span></span>
            </label>

            <button
              type="submit"
              class="flex h-12 w-full items-center justify-center rounded-full bg-[#ff5c00] text-sm font-bold text-white shadow-sm transition hover:bg-[#ea580c] disabled:opacity-60"
              :disabled="loading"
            >
              {{ loading ? '创建中…' : '创建账号' }}
            </button>
          </form>

          <div class="mt-6 text-center text-sm text-[#666]">
            已有账号？
            <router-link to="/login" class="font-bold text-[#ff5c00] hover:text-[#ea580c]">立即登录</router-link>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
