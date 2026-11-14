<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import { useAuth } from '@/composables/useAuth'
import { setAdminSession } from '@/composables/useAdminSession'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const { api } = useAuth()
const toast = useToast()

const password = ref('')
const submitting = ref(false)

async function submitUnlock() {
  const value = password.value
  if (!value) {
    toast.warning('请输入管理员密码')
    return
  }
  submitting.value = true
  try {
    const res = await api.post<{ adminSessionToken: string; expiresAt: number }>('/admin/unlock', {
      password: value,
    })
    setAdminSession(res.data.adminSessionToken, res.data.expiresAt)
    password.value = ''
    await router.replace('/manage')
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
    toast.error(message || '验证失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <AppShell active-page="manage" title="管理员" eyebrow="ADMIN CONSOLE">
    <div class="mx-auto flex min-h-[60vh] w-full max-w-md flex-col justify-center px-2 py-10">
      <section class="rounded-[2rem] border border-[#f0e5da] bg-white p-8 shadow-[0_12px_40px_rgba(101,71,45,0.06)]">
        <div class="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#fff0e2] text-[#d97706]">
          <span class="material-symbols-rounded text-[28px]">lock</span>
        </div>
        <h1 class="mt-5 font-serif text-3xl font-bold text-[#422d20]">进入运营后台</h1>
        <p class="mt-3 text-sm leading-6 text-[#806b5b]">
          请输入后台口令。验证通过后 30 分钟内可管理全站班级与灵犀开通，无需单独登录 admin 账号。
        </p>
        <form class="mt-6 space-y-4" @submit.prevent="submitUnlock">
          <label class="block">
            <span class="text-sm font-semibold text-[#765f50]">管理员密码</span>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              class="mt-2 h-12 w-full rounded-xl border border-[#ecdfd4] bg-[#fffdfb] px-4 text-sm text-[#422d20] outline-none focus:border-orange-300"
              placeholder="后台口令"
            />
          </label>
          <button
            type="submit"
            class="flex h-12 w-full items-center justify-center rounded-xl bg-[#ff7a1a] text-sm font-bold text-white transition hover:bg-[#ea6c0f] disabled:opacity-60"
            :disabled="submitting"
          >
            {{ submitting ? '验证中…' : '解锁后台' }}
          </button>
        </form>
      </section>
    </div>
  </AppShell>
</template>