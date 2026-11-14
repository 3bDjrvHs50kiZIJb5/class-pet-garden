<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from '@/components/AppShell.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useAdminPanel } from '@/composables/useAdminPanel'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import type {
  AdminClassOverview,
  AdminDemoPanelInfo,
  AdminMemberItem,
  AdminMemberOverview,
  AdminOperationsOverview,
  ClassVipItem,
} from '@/types'

const { api } = useAuth()
const { isUnlocked, unlock, lock, syncUnlockedFromStorage } = useAdminPanel()
const toast = useToast()

const isDev = import.meta.env.DEV
/** 与本地 server 默认 ADMIN_DEFAULT_PASSWORD 一致，仅开发环境展示/预填 */
const devAdminPasswordHint = 'admin!@#$'

const gatePassword = ref(isDev ? devAdminPasswordHint : '')
const gateLoading = ref(false)
const gateError = ref('')

function resetGatePasswordForDev() {
  if (isDev) {
    gatePassword.value = devAdminPasswordHint
  } else {
    gatePassword.value = ''
  }
}

type AdminTab = 'overview' | 'classes' | 'members' | 'demo'

const activeTab = ref<AdminTab>('overview')
const overviewLoading = ref(false)
const demoLoading = ref(false)
const demoResetting = ref(false)
const showDemoResetConfirm = ref(false)
const overview = ref<AdminOperationsOverview | null>(null)
const demoInfo = ref<AdminDemoPanelInfo | null>(null)
const loading = ref(true)
const membersLoading = ref(false)
const saving = ref(false)
const classes = ref<ClassVipItem[]>([])
const members = ref<AdminMemberItem[]>([])
const showClassModal = ref(false)
const showDeleteConfirm = ref(false)
const showPasswordModal = ref(false)
const showDeleteMemberConfirm = ref(false)
const editingClass = ref<ClassVipItem | null>(null)
const deletingClass = ref<ClassVipItem | null>(null)
const resettingMember = ref<AdminMemberItem | null>(null)
const deletingMember = ref<AdminMemberItem | null>(null)
const newClassName = ref('')
const newPassword = ref('')

const vipDrafts = ref<Record<string, { isVip: boolean; expiresAt: string }>>({})
const searchQuery = ref('')
const memberSearchQuery = ref('')
const vipFilter = ref<'all' | 'active' | 'inactive'>('all')

const filteredClasses = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  return classes.value.filter(item => {
    const matchesVip =
      vipFilter.value === 'all'
      || (vipFilter.value === 'active' ? Boolean(item.vip?.isActive) : !item.vip?.isActive)

    if (!matchesVip) return false
    if (!query) return true

    const ownerLabel = getOwnerLabel(item).toLowerCase()
    const ownerUsername = (item.ownerUsername || '').toLowerCase()
    return item.name.toLowerCase().includes(query)
      || ownerLabel.includes(query)
      || ownerUsername.includes(query)
  })
})

const hasActiveFilters = computed(() => Boolean(searchQuery.value.trim()) || vipFilter.value !== 'all')

const filteredMembers = computed(() => {
  const query = memberSearchQuery.value.trim().toLowerCase()
  if (!query) return members.value
  return members.value.filter(item => item.username.toLowerCase().includes(query))
})

const summary = computed(() => ({
  total: classes.value.length,
  vipActive: classes.value.filter(item => item.vip?.isActive).length,
  vipInactive: classes.value.filter(item => !item.vip?.isActive).length,
}))

const memberSummary = computed(() => ({
  totalMembers: members.value.length,
  totalClasses: members.value.reduce((sum, item) => sum + item.classCount, 0),
  totalStudents: members.value.reduce((sum, item) => sum + item.studentCount, 0),
}))

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function toDatetimeLocalValue(timestamp?: number | null) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function fromDatetimeLocalValue(value: string) {
  if (!value) return 0
  return new Date(value).getTime()
}

function getDefaultExpiresAt() {
  const date = new Date()
  date.setMonth(date.getMonth() + 6)
  return toDatetimeLocalValue(date.getTime())
}

function syncVipDrafts(items: ClassVipItem[]) {
  const nextDrafts: Record<string, { isVip: boolean; expiresAt: string }> = {}
  for (const item of items) {
    nextDrafts[item.id] = {
      isVip: Boolean(item.vip?.isActive),
      expiresAt: item.vip?.expiresAt
        ? toDatetimeLocalValue(item.vip.expiresAt)
        : getDefaultExpiresAt(),
    }
  }
  vipDrafts.value = nextDrafts
}

function getOwnerLabel(item: ClassVipItem) {
  if (item.isDemo) return '演示账户'
  if (item.ownerIsGuest) return '游客'
  return item.ownerUsername || '未知教师'
}

function getStatusMeta(item: ClassVipItem) {
  if (item.isDemo) {
    return { label: '演示班级', className: 'bg-[#f3f4f6] text-[#6b7280]' }
  }
  if (item.vip?.isActive) {
    return { label: 'VIP 生效中', className: 'bg-[#ecfdf5] text-[#059669]' }
  }
  if (item.vip?.status === 'expired') {
    return { label: 'VIP 已过期', className: 'bg-[#fff1f2] text-[#e11d48]' }
  }
  return { label: '未授权', className: 'bg-[#fff7ed] text-[#c2410c]' }
}

async function loadMembers() {
  membersLoading.value = true
  try {
    const res = await api.get<AdminMemberOverview>('/admin/users')
    members.value = res.data.members || []
  } catch (error) {
    console.error('加载会员失败:', error)
    toast.error('加载会员失败')
  } finally {
    membersLoading.value = false
  }
}

async function loadOverview() {
  overviewLoading.value = true
  try {
    const res = await api.get<AdminOperationsOverview>('/admin/overview')
    overview.value = res.data
  } catch (error) {
    console.error('加载运营概览失败:', error)
    toast.error('加载运营概览失败')
  } finally {
    overviewLoading.value = false
  }
}

async function loadDemoInfo() {
  demoLoading.value = true
  try {
    const res = await api.get<AdminDemoPanelInfo>('/admin/demo')
    demoInfo.value = res.data
  } catch (error) {
    console.error('加载演示班信息失败:', error)
    toast.error('加载演示班信息失败')
  } finally {
    demoLoading.value = false
  }
}

async function confirmDemoReset() {
  demoResetting.value = true
  try {
    const res = await api.post<{ message?: string; demo?: AdminDemoPanelInfo }>('/admin/demo/reset')
    demoInfo.value = res.data.demo || demoInfo.value
    toast.success(res.data.message || '演示班已重置')
    showDemoResetConfirm.value = false
    if (activeTab.value === 'overview') {
      void loadOverview()
    }
  } catch (error: unknown) {
    console.error('重置演示班失败:', error)
    const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
    toast.error(message || '重置演示班失败')
  } finally {
    demoResetting.value = false
  }
}

function formatDateTime(timestamp: number) {
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatVipPlan(plan: string) {
  const labels: Record<string, string> = {
    month: '月度',
    semester: '学期',
    year: '年度',
    manual: '手动授权',
    welcome: '新用户礼遇',
    demo: '演示',
  }
  return labels[plan] || plan
}

function switchTab(tab: AdminTab) {
  activeTab.value = tab
  if (tab === 'overview') {
    void loadOverview()
  } else if (tab === 'members') {
    void loadMembers()
  } else if (tab === 'demo') {
    void loadDemoInfo()
  } else if (tab === 'classes' && !classes.value.length) {
    void loadClasses()
  }
}

async function loadClasses() {
  loading.value = true
  try {
    const res = await api.get<AdminClassOverview>('/admin/classes')
    classes.value = res.data.classes || []
    syncVipDrafts(classes.value)
  } catch (error) {
    console.error('加载班级失败:', error)
    toast.error('加载班级失败')
  } finally {
    loading.value = false
  }
}

function openEditClassModal(item: ClassVipItem) {
  editingClass.value = item
  newClassName.value = item.name
  showClassModal.value = true
}

function requestDeleteClass(item: ClassVipItem) {
  if (item.isDemo) {
    toast.info('演示班级不能删除')
    return
  }
  deletingClass.value = item
  showDeleteConfirm.value = true
}

async function saveClass() {
  const name = newClassName.value.trim()
  if (!name) {
    toast.warning('请输入班级名称')
    return
  }

  saving.value = true
  try {
    if (!editingClass.value) return
    await api.put(`/admin/classes/${editingClass.value.id}`, { name })
    toast.success('班级名称已更新')
    showClassModal.value = false
    await loadClasses()
  } catch (error: unknown) {
    console.error('保存班级失败:', error)
    const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
    toast.error(message || '保存班级失败')
  } finally {
    saving.value = false
  }
}

async function confirmDeleteClass() {
  if (!deletingClass.value) return
  saving.value = true
  try {
    await api.delete(`/admin/classes/${deletingClass.value.id}`)
    toast.success('班级已删除')
    showDeleteConfirm.value = false
    deletingClass.value = null
    await loadClasses()
  } catch (error: unknown) {
    console.error('删除班级失败:', error)
    const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
    toast.error(message || '删除班级失败')
  } finally {
    saving.value = false
  }
}

function toggleVipDraft(classId: string, checked: boolean) {
  const draft = vipDrafts.value[classId]
  if (!draft) return
  draft.isVip = checked
  if (checked && !draft.expiresAt) {
    draft.expiresAt = getDefaultExpiresAt()
  }
}

async function saveVipAuthorization(item: ClassVipItem) {
  if (item.isDemo) {
    toast.info('演示班级不支持 VIP 授权')
    return
  }

  const draft = vipDrafts.value[item.id]
  if (!draft) return

  saving.value = true
  try {
    const res = await api.put('/admin/vip/authorize', {
      classId: item.id,
      isVip: draft.isVip,
      expiresAt: draft.isVip ? fromDatetimeLocalValue(draft.expiresAt) : null,
    })
    toast.success(res.data.message || 'VIP 授权已保存')
    await loadClasses()
  } catch (error: unknown) {
    console.error('保存 VIP 授权失败:', error)
    const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
    toast.error(message || '保存 VIP 授权失败')
  } finally {
    saving.value = false
  }
}

function openResetPasswordModal(item: AdminMemberItem) {
  resettingMember.value = item
  newPassword.value = ''
  showPasswordModal.value = true
}

async function savePasswordReset() {
  const password = newPassword.value.trim()
  if (password.length < 6) {
    toast.warning('密码至少6位')
    return
  }
  if (!resettingMember.value) return

  saving.value = true
  try {
    const res = await api.put(`/admin/users/${resettingMember.value.id}/password`, { password })
    toast.success(res.data.message || '密码已重置')
    showPasswordModal.value = false
    resettingMember.value = null
    newPassword.value = ''
  } catch (error: unknown) {
    console.error('重置密码失败:', error)
    const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
    toast.error(message || '重置密码失败')
  } finally {
    saving.value = false
  }
}

function requestDeleteMember(item: AdminMemberItem) {
  deletingMember.value = item
  showDeleteMemberConfirm.value = true
}

async function confirmDeleteMember() {
  if (!deletingMember.value) return
  saving.value = true
  try {
    await api.delete(`/admin/users/${deletingMember.value.id}`)
    toast.success('会员账户已删除')
    showDeleteMemberConfirm.value = false
    deletingMember.value = null
    await Promise.all([loadMembers(), loadClasses()])
  } catch (error: unknown) {
    console.error('删除会员失败:', error)
    const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
    toast.error(message || '删除会员失败')
  } finally {
    saving.value = false
  }
}

async function handleAdminUnlock() {
  gateError.value = ''
  if (!gatePassword.value) {
    gateError.value = '请输入管理密码'
    return
  }
  gateLoading.value = true
  try {
    await unlock(gatePassword.value)
    resetGatePasswordForDev()
    activeTab.value = 'overview'
    await loadOverview()
  } catch (error: unknown) {
    const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
    gateError.value = message || '密码错误'
  } finally {
    gateLoading.value = false
  }
}

function handleExitAdmin() {
  lock()
  gateError.value = ''
  resetGatePasswordForDev()
  classes.value = []
  members.value = []
}

onMounted(() => {
  syncUnlockedFromStorage()
  if (isUnlocked.value) {
    void loadOverview()
  }
})
</script>

<template>
  <AppShell active-page="manage" title="管理员" eyebrow="ADMIN">
  <section
      v-if="!isUnlocked"
      class="overflow-hidden rounded-[2rem] border border-[#f0e5da] bg-white shadow-[0_12px_40px_rgba(101,71,45,0.06)]"
    >
      <div class="p-7 sm:p-10">
        <p class="text-sm font-bold tracking-[0.2em] text-[#d78248]">ADMIN</p>
        <h1 class="mt-3 font-serif text-4xl font-bold tracking-tight text-[#422d20] sm:text-5xl">管理员</h1>
        <p class="mt-4 max-w-lg text-sm leading-6 text-[#806b5b] sm:text-base">
          输入运维密码后可管理全站班级与教师账户。不会切换当前登录身份，教师或游客可照常使用班级功能。
        </p>
        <p
          v-if="isDev"
          class="mt-6 max-w-md rounded-xl border border-dashed border-[#f0c08a] bg-[#fff8f2] px-4 py-3 font-mono text-sm text-[#9a5a2b]"
        >
          调试默认密码：{{ devAdminPasswordHint }}
        </p>
        <form class="mt-8 max-w-md" @submit.prevent="handleAdminUnlock">
          <label class="block text-sm font-semibold text-[#9a735d]">管理密码</label>
          <input
            v-model="gatePassword"
            type="password"
            autocomplete="current-password"
            class="mt-2 w-full rounded-xl border border-[#ecdfd4] px-4 py-3 text-sm text-[#422d20] outline-none focus:border-orange-400"
            placeholder="请输入密码"
          />
          <p v-if="gateError" class="mt-2 text-sm text-red-600" role="alert">{{ gateError }}</p>
          <button
            type="submit"
            class="mt-5 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50"
            :disabled="gateLoading"
          >
            {{ gateLoading ? '验证中…' : '进入管理' }}
          </button>
        </form>
      </div>
    </section>

    <div v-else class="w-full">
      <section class="overflow-hidden rounded-[2rem] border border-[#f0e5da] bg-white shadow-[0_12px_40px_rgba(101,71,45,0.06)]">
        <div class="p-7 sm:p-10">
          <p class="text-sm font-bold tracking-[0.2em] text-[#d78248]">ADMIN</p>
          <div class="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 class="font-serif text-4xl font-bold tracking-tight text-[#422d20] sm:text-5xl">管理员</h1>
              <p class="mt-4 text-sm text-[#806b5b] sm:text-base">
                管理全站注册教师账户，以及全部班级与 VIP 授权状态。
              </p>
            </div>
            <button
              type="button"
              class="inline-flex h-11 items-center gap-2 rounded-xl border border-[#ecdfd4] bg-[#fffdfb] px-4 text-sm font-semibold text-[#765f50] transition hover:border-orange-200 hover:text-[#b85e25]"
              @click="handleExitAdmin"
            >
              <span class="material-symbols-rounded text-[18px] leading-none">logout</span>
              退出管理
            </button>
          </div>

          <div class="mt-7 flex flex-wrap gap-3">
            <template v-if="activeTab === 'overview' && overview">
              <div class="rounded-2xl bg-[#fff3e7] px-4 py-3">
                <p class="text-xl font-bold text-[#b76129]">{{ overview.registrationsToday }}</p>
                <p class="mt-0.5 text-sm font-medium text-[#9e704f]">今日新注册</p>
              </div>
              <div class="rounded-2xl bg-[#ecfdf5] px-4 py-3">
                <p class="text-xl font-bold text-[#059669]">{{ overview.activeClasses }}</p>
                <p class="mt-0.5 text-sm font-medium text-[#6b8f7d]">活跃班级</p>
              </div>
              <div class="rounded-2xl bg-[#fff7ed] px-4 py-3">
                <p class="text-xl font-bold text-[#ea580c]">{{ overview.vipActiveCount }}</p>
                <p class="mt-0.5 text-sm font-medium text-[#b07a4f]">VIP 生效</p>
              </div>
              <div class="rounded-2xl bg-[#f3f4f6] px-4 py-3">
                <p class="text-xl font-bold text-[#4b5563]">{{ overview.totalEvaluations }}</p>
                <p class="mt-0.5 text-sm font-medium text-[#6b7280]">评价记录</p>
              </div>
            </template>
            <template v-else-if="activeTab === 'classes'">
              <div class="rounded-2xl bg-[#fff3e7] px-4 py-3">
                <p class="text-xl font-bold text-[#b76129]">{{ summary.total }}</p>
                <p class="mt-0.5 text-sm font-medium text-[#9e704f]">全部班级</p>
              </div>
              <div class="rounded-2xl bg-[#ecfdf5] px-4 py-3">
                <p class="text-xl font-bold text-[#059669]">{{ summary.vipActive }}</p>
                <p class="mt-0.5 text-sm font-medium text-[#6b8f7d]">已生效</p>
              </div>
              <div class="rounded-2xl bg-[#fff7ed] px-4 py-3">
                <p class="text-xl font-bold text-[#ea580c]">{{ summary.vipInactive }}</p>
                <p class="mt-0.5 text-sm font-medium text-[#b07a4f]">未生效</p>
              </div>
            </template>
            <template v-else-if="activeTab === 'members'">
              <div class="rounded-2xl bg-[#fff3e7] px-4 py-3">
                <p class="text-xl font-bold text-[#b76129]">{{ memberSummary.totalMembers }}</p>
                <p class="mt-0.5 text-sm font-medium text-[#9e704f]">注册教师</p>
              </div>
              <div class="rounded-2xl bg-[#ecfdf5] px-4 py-3">
                <p class="text-xl font-bold text-[#059669]">{{ memberSummary.totalClasses }}</p>
                <p class="mt-0.5 text-sm font-medium text-[#6b8f7d]">关联班级</p>
              </div>
              <div class="rounded-2xl bg-[#fff7ed] px-4 py-3">
                <p class="text-xl font-bold text-[#ea580c]">{{ memberSummary.totalStudents }}</p>
                <p class="mt-0.5 text-sm font-medium text-[#b07a4f]">管理学生</p>
              </div>
            </template>
            <template v-else-if="activeTab === 'demo' && demoInfo">
              <div class="rounded-2xl bg-[#fff3e7] px-4 py-3">
                <p class="text-xl font-bold text-[#b76129]">{{ demoInfo.studentCount }}</p>
                <p class="mt-0.5 text-sm font-medium text-[#9e704f]">演示学生</p>
              </div>
              <div class="rounded-2xl bg-[#ecfdf5] px-4 py-3 min-w-[10rem]">
                <p class="text-sm font-bold leading-snug text-[#059669]">{{ formatDateTime(demoInfo.nextResetAt) }}</p>
                <p class="mt-0.5 text-sm font-medium text-[#6b8f7d]">下次自动重置</p>
              </div>
            </template>
          </div>
        </div>
      </section>

      <section class="mt-6 rounded-[1.75rem] border border-[#f0e5da] bg-white p-4 shadow-[0_10px_30px_rgba(101,71,45,0.04)] sm:p-5">
        <div class="flex flex-wrap gap-2 border-b border-[#f3ece4] pb-4">
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm font-semibold transition"
            :class="activeTab === 'overview' ? 'bg-[#fff0e2] text-[#b85e25] shadow-[inset_0_0_0_1px_rgba(234,151,86,0.18)]' : 'bg-[#fff8f2] text-[#765f50] hover:bg-[#fff7f1] hover:text-[#b85e25]'"
            @click="switchTab('overview')"
          >
            运营概览
          </button>
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm font-semibold transition"
            :class="activeTab === 'classes' ? 'bg-[#fff0e2] text-[#b85e25] shadow-[inset_0_0_0_1px_rgba(234,151,86,0.18)]' : 'bg-[#fff8f2] text-[#765f50] hover:bg-[#fff7f1] hover:text-[#b85e25]'"
            @click="switchTab('classes')"
          >
            班级管理
          </button>
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm font-semibold transition"
            :class="activeTab === 'members' ? 'bg-[#fff0e2] text-[#b85e25] shadow-[inset_0_0_0_1px_rgba(234,151,86,0.18)]' : 'bg-[#fff8f2] text-[#765f50] hover:bg-[#fff7f1] hover:text-[#b85e25]'"
            @click="switchTab('members')"
          >
            会员管理
          </button>
          <button
            type="button"
            class="rounded-full px-4 py-2 text-sm font-semibold transition"
            :class="activeTab === 'demo' ? 'bg-[#fff0e2] text-[#b85e25] shadow-[inset_0_0_0_1px_rgba(234,151,86,0.18)]' : 'bg-[#fff8f2] text-[#765f50] hover:bg-[#fff7f1] hover:text-[#b85e25]'"
            @click="switchTab('demo')"
          >
            演示班级
          </button>
        </div>

        <div v-if="activeTab === 'overview'">
          <div class="mt-4">
            <p class="text-sm font-bold tracking-[0.16em] text-[#d78248]">OPERATIONS</p>
            <h2 class="mt-1 font-serif text-2xl font-bold text-[#422d20]">运营概览</h2>
            <p class="mt-1 text-sm text-[#9a735d]">全站注册、班级活跃、评价量与 VIP 状态汇总（{{ overview?.timeZone || 'Asia/Shanghai' }} 自然日）</p>
          </div>
          <div v-if="overviewLoading" class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center text-sm text-[#a1836d]">加载中…</div>
          <template v-else-if="overview">
            <div class="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <article class="rounded-2xl border border-[#f3ece4] bg-[#fffdfb] p-4">
                <p class="text-sm font-semibold text-[#9a735d]">近 7 日新注册</p>
                <p class="mt-2 font-serif text-3xl font-bold text-[#422d20]">{{ overview.registrations7Days }}</p>
              </article>
              <article class="rounded-2xl border border-[#f3ece4] bg-[#fffdfb] p-4">
                <p class="text-sm font-semibold text-[#9a735d]">全站班级</p>
                <p class="mt-2 font-serif text-3xl font-bold text-[#422d20]">{{ overview.totalClasses }}</p>
              </article>
              <article class="rounded-2xl border border-[#f3ece4] bg-[#fffdfb] p-4">
                <p class="text-sm font-semibold text-[#9a735d]">数据更新时间</p>
                <p class="mt-2 text-sm font-semibold leading-6 text-[#422d20]">{{ formatDateTime(overview.generatedAt) }}</p>
              </article>
            </div>
            <div v-if="overview.vipExpiringSoon.length" class="mt-6">
              <h3 class="font-serif text-lg font-bold text-[#422d20]">7 日内 VIP 到期</h3>
              <ul class="mt-3 space-y-2">
                <li
                  v-for="item in overview.vipExpiringSoon"
                  :key="item.classId"
                  class="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[#fff8f2] px-4 py-3 text-sm"
                >
                  <span class="font-semibold text-[#422d20]">{{ item.className }}</span>
                  <span class="text-[#9a735d]">{{ formatVipPlan(item.plan) }} · {{ formatDateTime(item.expiresAt) }}</span>
                </li>
              </ul>
            </div>
            <p v-else class="mt-5 text-sm text-[#9a735d]">暂无 7 日内到期的 VIP 班级。</p>
          </template>
        </div>

        <div v-else-if="activeTab === 'demo'">
          <div class="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="text-sm font-bold tracking-[0.16em] text-[#d78248]">DEMO CLASS</p>
              <h2 class="mt-1 font-serif text-2xl font-bold text-[#422d20]">演示班级</h2>
              <p class="mt-1 text-sm text-[#9a735d]">{{ demoInfo?.schedule || '每日 0 点自动重置' }}，可手动立即恢复演示数据</p>
            </div>
            <button
              type="button"
              class="inline-flex h-11 items-center gap-2 rounded-xl bg-[#ea580c] px-4 text-sm font-bold text-white transition hover:bg-[#c2410c] disabled:opacity-50"
              :disabled="demoLoading || demoResetting"
              @click="showDemoResetConfirm = true"
            >
              <span class="material-symbols-rounded text-[18px] leading-none">refresh</span>
              立即重置
            </button>
          </div>
          <div v-if="demoLoading" class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center text-sm text-[#a1836d]">加载中…</div>
          <article v-else-if="demoInfo" class="mt-5 rounded-2xl border border-[#f3ece4] bg-[#fffdfb] p-5">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="font-serif text-xl font-bold text-[#422d20]">{{ demoInfo.className }}</h3>
              <span class="rounded-full bg-[#f3f4f6] px-2.5 py-0.5 text-xs font-bold text-[#6b7280]">演示</span>
            </div>
            <dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt class="text-[#9a735d]">班级 ID</dt>
                <dd class="mt-0.5 font-mono text-[#422d20]">{{ demoInfo.classId }}</dd>
              </div>
              <div>
                <dt class="text-[#9a735d]">学生数量</dt>
                <dd class="mt-0.5 font-semibold text-[#422d20]">{{ demoInfo.studentCount }} 名</dd>
              </div>
              <div>
                <dt class="text-[#9a735d]">时区</dt>
                <dd class="mt-0.5 text-[#422d20]">{{ demoInfo.timeZone }}</dd>
              </div>
              <div>
                <dt class="text-[#9a735d]">下次自动重置</dt>
                <dd class="mt-0.5 font-semibold text-[#422d20]">{{ formatDateTime(demoInfo.nextResetAt) }}</dd>
              </div>
            </dl>
          </article>
        </div>

        <div v-else-if="activeTab === 'classes'">
        <div class="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p class="text-sm font-bold tracking-[0.16em] text-[#d78248]">ALL CLASSES</p>
            <h2 class="mt-1 font-serif text-2xl font-bold text-[#422d20]">全站班级与 VIP 授权</h2>
            <p class="mt-1 text-sm text-[#9a735d]">可查看所属教师、编辑班级名称、删除班级，并手动设置 VIP 状态与到期时间</p>
          </div>
          <label class="flex h-11 w-full items-center gap-2 rounded-xl border border-[#ecdfd4] bg-[#fffdfb] px-3 text-[#a1836d] focus-within:border-orange-300 lg:w-72">
            <span class="material-symbols-rounded text-[18px] leading-none">search</span>
            <input
              v-model="searchQuery"
              type="search"
              class="min-w-0 flex-1 bg-transparent text-sm text-[#422d20] outline-none placeholder:text-[#b9a697]"
              placeholder="搜索班级名称或教师用户名"
              aria-label="搜索班级名称或教师用户名"
            />
          </label>
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2">
          <span class="text-sm font-semibold text-[#9a735d]">VIP 筛选</span>
          <button
            v-for="option in [
              { id: 'all', label: '全部' },
              { id: 'active', label: '已启用 VIP' },
              { id: 'inactive', label: '未启用 VIP' },
            ]"
            :key="option.id"
            type="button"
            class="rounded-full px-3.5 py-1.5 text-sm font-semibold transition"
            :class="vipFilter === option.id ? 'bg-[#fff0e2] text-[#b85e25] shadow-[inset_0_0_0_1px_rgba(234,151,86,0.18)]' : 'bg-[#fff8f2] text-[#765f50] hover:bg-[#fff7f1] hover:text-[#b85e25]'"
            @click="vipFilter = option.id as 'all' | 'active' | 'inactive'"
          >
            {{ option.label }}
          </button>
          <span v-if="!loading && classes.length" class="ml-auto text-sm text-[#b0927c]">
            显示 {{ filteredClasses.length }} / {{ classes.length }} 个班级
          </span>
        </div>

        <div v-if="loading" class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center text-sm text-[#a1836d]">加载中…</div>

        <div v-else-if="!classes.length" class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center">
          <span class="material-symbols-rounded text-[40px] text-[#e8c9ae]">school</span>
          <p class="mt-3 text-sm font-medium text-[#75533d]">系统中还没有班级</p>
        </div>

        <div v-else-if="!filteredClasses.length" class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center">
          <span class="material-symbols-rounded text-[40px] text-[#e8c9ae]">search_off</span>
          <p class="mt-3 text-sm font-medium text-[#75533d]">没有符合条件的班级</p>
          <button
            v-if="hasActiveFilters"
            type="button"
            class="mt-3 text-sm font-semibold text-orange-600 hover:text-orange-700"
            @click="searchQuery = ''; vipFilter = 'all'"
          >
            清空搜索与筛选
          </button>
        </div>

        <div v-else class="mt-5 space-y-3">
          <article
            v-for="item in filteredClasses"
            :key="item.id"
            class="rounded-2xl border border-[#f3ece4] bg-[#fffdfb] p-4"
          >
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="min-w-0 flex-1">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="truncate font-serif text-xl font-bold text-[#422d20]">{{ item.name }}</h3>
                  <span class="rounded-full px-2.5 py-0.5 text-xs font-bold" :class="getStatusMeta(item).className">
                    {{ getStatusMeta(item).label }}
                  </span>
                </div>
                <p class="mt-1 text-sm text-[#9a735d]">{{ item.studentCount }} 名学生 · 所属教师：{{ getOwnerLabel(item) }}</p>
                <p v-if="item.vip?.expiresAt" class="mt-2 text-sm text-[#8b6d57]">
                  当前到期：{{ formatDate(item.vip.expiresAt) }}
                </p>
                <div class="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="inline-flex h-9 items-center gap-1 rounded-xl border border-[#f0e5da] px-3 text-sm font-semibold text-[#765f50] transition hover:bg-[#fff7f1]"
                    @click="openEditClassModal(item)"
                  >
                    <span class="material-symbols-rounded text-[16px] leading-none">edit</span>
                    编辑名称
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-9 items-center gap-1 rounded-xl border border-[#fecdd3] px-3 text-sm font-semibold text-[#e11d48] transition hover:bg-[#fff1f2] disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="item.isDemo"
                    @click="requestDeleteClass(item)"
                  >
                    <span class="material-symbols-rounded text-[16px] leading-none">delete</span>
                    删除班级
                  </button>
                </div>
              </div>

              <div class="w-full rounded-2xl border border-[#f3ece4] bg-[#fff8f2] p-4 lg:max-w-md">
                <p class="text-sm font-bold text-[#4d3527]">VIP 授权</p>
                <label class="mt-3 flex items-center gap-3">
                  <input
                    type="checkbox"
                    class="h-4 w-4 rounded border-[#d6c4b5] text-[#ea580c] focus:ring-[#ea580c]"
                    :checked="vipDrafts[item.id]?.isVip"
                    :disabled="item.isDemo || saving"
                    @change="toggleVipDraft(item.id, ($event.target as HTMLInputElement).checked)"
                  />
                  <span class="text-sm font-medium text-[#765f50]">启用 VIP</span>
                </label>

                <label v-if="vipDrafts[item.id]?.isVip" class="mt-3 block">
                  <span class="text-sm font-medium text-[#765f50]">VIP 到期时间</span>
                  <input
                    type="datetime-local"
                    class="mt-2 w-full rounded-xl border border-[#ecdfd4] bg-white px-3 py-2 text-sm text-[#422d20] outline-none focus:border-orange-300"
                    :value="vipDrafts[item.id]?.expiresAt"
                    :disabled="item.isDemo || saving"
                    @input="vipDrafts[item.id].expiresAt = ($event.target as HTMLInputElement).value"
                  />
                </label>

                <p v-if="item.isDemo" class="mt-3 text-sm text-[#6b7280]">演示班级不支持 VIP 授权</p>

                <button
                  type="button"
                  class="mt-4 inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-[#ea580c] px-4 text-sm font-semibold text-white transition hover:bg-[#c2410c] disabled:cursor-not-allowed disabled:opacity-50"
                  :disabled="item.isDemo || saving"
                  @click="saveVipAuthorization(item)"
                >
                  <span class="material-symbols-rounded text-[18px] leading-none">verified</span>
                  保存 VIP 授权
                </button>
              </div>
            </div>
          </article>
        </div>
        </div>

        <div v-else-if="activeTab === 'members'">
          <div class="mt-4 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="text-sm font-bold tracking-[0.16em] text-[#d78248]">ALL MEMBERS</p>
              <h2 class="mt-1 font-serif text-2xl font-bold text-[#422d20]">注册教师账户</h2>
              <p class="mt-1 text-sm text-[#9a735d]">查看班主任注册信息，重置密码或删除账户（将一并删除其班级与学生数据）</p>
            </div>
            <label class="flex h-11 w-full items-center gap-2 rounded-xl border border-[#ecdfd4] bg-[#fffdfb] px-3 text-[#a1836d] focus-within:border-orange-300 lg:w-72">
              <span class="material-symbols-rounded text-[18px] leading-none">search</span>
              <input
                v-model="memberSearchQuery"
                type="search"
                class="min-w-0 flex-1 bg-transparent text-sm text-[#422d20] outline-none placeholder:text-[#b9a697]"
                placeholder="搜索用户名"
                aria-label="搜索用户名"
              />
            </label>
          </div>

          <div v-if="membersLoading" class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center text-sm text-[#a1836d]">加载中…</div>

          <div v-else-if="!members.length" class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center">
            <span class="material-symbols-rounded text-[40px] text-[#e8c9ae]">group_off</span>
            <p class="mt-3 text-sm font-medium text-[#75533d]">还没有注册教师账户</p>
          </div>

          <div v-else-if="!filteredMembers.length" class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center">
            <span class="material-symbols-rounded text-[40px] text-[#e8c9ae]">search_off</span>
            <p class="mt-3 text-sm font-medium text-[#75533d]">没有符合条件的会员</p>
            <button
              v-if="memberSearchQuery.trim()"
              type="button"
              class="mt-3 text-sm font-semibold text-orange-600 hover:text-orange-700"
              @click="memberSearchQuery = ''"
            >
              清空搜索
            </button>
          </div>

          <div v-else class="mt-5 space-y-3">
            <p class="text-sm text-[#b0927c]">显示 {{ filteredMembers.length }} / {{ members.length }} 位教师</p>
            <article
              v-for="item in filteredMembers"
              :key="item.id"
              class="rounded-2xl border border-[#f3ece4] bg-[#fffdfb] p-4"
            >
              <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <h3 class="truncate font-serif text-xl font-bold text-[#422d20]">{{ item.username }}</h3>
                    <span class="rounded-full bg-[#ecfdf5] px-2.5 py-0.5 text-xs font-bold text-[#059669]">注册教师</span>
                  </div>
                  <p class="mt-1 text-sm text-[#9a735d]">
                    注册于 {{ formatDate(item.createdAt) }} · {{ item.classCount }} 个班级 · {{ item.studentCount }} 名学生
                  </p>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button
                    type="button"
                    class="inline-flex h-9 items-center gap-1 rounded-xl border border-[#f0e5da] px-3 text-sm font-semibold text-[#765f50] transition hover:bg-[#fff7f1]"
                    @click="openResetPasswordModal(item)"
                  >
                    <span class="material-symbols-rounded text-[16px] leading-none">lock_reset</span>
                    重置密码
                  </button>
                  <button
                    type="button"
                    class="inline-flex h-9 items-center gap-1 rounded-xl border border-[#fecdd3] px-3 text-sm font-semibold text-[#e11d48] transition hover:bg-[#fff1f2]"
                    @click="requestDeleteMember(item)"
                  >
                    <span class="material-symbols-rounded text-[16px] leading-none">person_remove</span>
                    删除账户
                  </button>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>
    </div>

    <Transition>
      <div v-if="showClassModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
        <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
          <p class="text-sm font-bold tracking-wider text-orange-600">CLASS</p>
          <h2 class="mt-1 font-serif text-2xl font-bold">编辑班级</h2>
          <input
            v-model="newClassName"
            class="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400"
            placeholder="例如：三年二班"
            @keyup.enter="saveClass"
          />
          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="px-4 py-2 text-sm" @click="showClassModal = false">取消</button>
            <button
              type="button"
              class="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              :disabled="saving"
              @click="saveClass"
            >
              {{ saving ? '保存中…' : '确认' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <ConfirmDialog
      :show="showDeleteConfirm"
      title="删除班级"
      :message="`确定删除「${deletingClass?.name || ''}」？所有学生数据将一并删除！`"
      confirm-text="确认删除"
      cancel-text="取消"
      type="danger"
      @confirm="confirmDeleteClass"
      @cancel="showDeleteConfirm = false; deletingClass = null"
    />

    <Transition>
      <div v-if="showPasswordModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
        <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
          <p class="text-sm font-bold tracking-wider text-orange-600">MEMBER</p>
          <h2 class="mt-1 font-serif text-2xl font-bold">重置密码</h2>
          <p class="mt-2 text-sm text-[#806b5b]">为「{{ resettingMember?.username || '' }}」设置新密码</p>
          <input
            v-model="newPassword"
            type="password"
            class="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400"
            placeholder="至少 6 位新密码"
            @keyup.enter="savePasswordReset"
          />
          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="px-4 py-2 text-sm" @click="showPasswordModal = false; resettingMember = null">取消</button>
            <button
              type="button"
              class="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              :disabled="saving"
              @click="savePasswordReset"
            >
              {{ saving ? '保存中…' : '确认重置' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <ConfirmDialog
      :show="showDeleteMemberConfirm"
      title="删除会员账户"
      :message="`确定删除「${deletingMember?.username || ''}」？该账户下 ${deletingMember?.classCount || 0} 个班级与全部学生数据将一并删除！`"
      confirm-text="确认删除"
      cancel-text="取消"
      type="danger"
      @confirm="confirmDeleteMember"
      @cancel="showDeleteMemberConfirm = false; deletingMember = null"
    />

    <ConfirmDialog
      :show="showDemoResetConfirm"
      title="重置演示班级"
      message="将删除并重新生成演示班级全部学生、评价与任务数据。访客正在体验的内容也会被重置，是否继续？"
      confirm-text="立即重置"
      cancel-text="取消"
      type="warning"
      @confirm="confirmDemoReset"
      @cancel="showDemoResetConfirm = false"
    />
  </AppShell>
</template>
