<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from '@/components/AppShell.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import type { Class, EvaluationRecord } from '@/types'

const categories = ['学习', '行为', '健康', '其他'] as const

const categoryMeta: Record<string, { icon: string; color: string; bg: string }> = {
  学习: { icon: 'menu_book', color: 'text-[#2563eb]', bg: 'bg-[#eff6ff]' },
  行为: { icon: 'volunteer_activism', color: 'text-[#d97706]', bg: 'bg-[#fff7ed]' },
  健康: { icon: 'favorite', color: 'text-[#059669]', bg: 'bg-[#ecfdf5]' },
  其他: { icon: 'stars', color: 'text-[#7c3aed]', bg: 'bg-[#f5f3ff]' }
}

const DEMO_CLASS_ID = 'demo-class-2026'
const PAGE_SIZE = 100

const { api, user } = useAuth()
const toast = useToast()

const classes = ref<Class[]>([])
const currentClass = ref<Class | null>(null)
const records = ref<EvaluationRecord[]>([])
const totalRecords = ref(0)
const loading = ref(true)
const isDemoMode = ref(false)

const keyword = ref('')
const pointFilter = ref<'all' | 'positive' | 'negative'>('all')
const page = ref(1)

const confirmDialog = ref({
  show: false,
  title: '确认',
  message: '',
  confirmText: '确认',
  cancelText: '取消',
  type: 'warning' as 'info' | 'warning' | 'danger',
  onConfirm: () => {}
})

function getCurrentClassStorageKey() {
  return `pet-garden-current-class-${user.value?.id || 'guest'}`
}

function requestConfigForCurrentClass() {
  return isDemoMode.value ? { headers: { Authorization: 'Bearer guest' } } : undefined
}

function formatRecordTime(timestamp?: number) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return isToday ? `今天 ${time}` : date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

const filteredRecords = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return records.value.filter(record => {
    if (pointFilter.value === 'positive' && record.points <= 0) return false
    if (pointFilter.value === 'negative' && record.points >= 0) return false
    if (query) {
      const haystack = `${record.student_name || ''} ${record.reason} ${record.category}`.toLowerCase()
      if (!haystack.includes(query)) return false
    }
    return true
  })
})

const groupedRecords = computed(() =>
  categories.map(category => ({
    category,
    records: filteredRecords.value.filter(record => (record.category || '其他') === category)
  }))
)

const stats = computed(() => {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayTs = todayStart.getTime()
  return {
    total: totalRecords.value,
    positive: filteredRecords.value.filter(record => record.points > 0).length,
    negative: filteredRecords.value.filter(record => record.points < 0).length,
    today: filteredRecords.value.filter(record => record.timestamp >= todayTs).length
  }
})

const totalPages = computed(() => Math.max(1, Math.ceil(totalRecords.value / PAGE_SIZE)))

function showConfirm(options: {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'warning' | 'danger'
  onConfirm: () => void
}) {
  confirmDialog.value = {
    show: true,
    title: options.title,
    message: options.message,
    confirmText: options.confirmText || '确认',
    cancelText: options.cancelText || '取消',
    type: options.type || 'warning',
    onConfirm: options.onConfirm
  }
}

async function loadClasses() {
  try {
    const res = await api.get('/classes')
    classes.value = res.data.classes || []
    if (!classes.value.length) {
      currentClass.value = null
      return
    }
    const savedClassId = localStorage.getItem(getCurrentClassStorageKey())
    const savedClass = savedClassId ? classes.value.find(cls => cls.id === savedClassId) : null
    await selectClass(savedClass || classes.value[0])
  } catch (error) {
    console.error('加载班级失败:', error)
    toast.error('加载班级失败')
  }
}

async function selectClass(cls: Class) {
  isDemoMode.value = cls.id === DEMO_CLASS_ID
  currentClass.value = cls
  page.value = 1
  localStorage.setItem(getCurrentClassStorageKey(), cls.id)
  await loadRecords()
}

async function loadRecords() {
  if (!currentClass.value) {
    records.value = []
    totalRecords.value = 0
    return
  }
  loading.value = true
  try {
    const res = await api.get(
      `/evaluations?classId=${currentClass.value.id}&page=${page.value}&pageSize=${PAGE_SIZE}`,
      requestConfigForCurrentClass()
    )
    records.value = res.data.records || []
    totalRecords.value = res.data.total || 0
  } catch (error) {
    console.error('加载喂养记录失败:', error)
    toast.error('加载喂养记录失败')
    records.value = []
    totalRecords.value = 0
  } finally {
    loading.value = false
  }
}

function goToPage(nextPage: number) {
  if (nextPage < 1 || nextPage > totalPages.value || nextPage === page.value) return
  page.value = nextPage
  loadRecords()
}

function undoRecord(record: EvaluationRecord) {
  showConfirm({
    title: '撤回喂养',
    message: `确定撤回 ${record.student_name} 的「${record.reason}」记录吗？`,
    confirmText: '撤回',
    cancelText: '取消',
    type: 'warning',
    onConfirm: async () => {
      try {
        const res = await api.delete(`/evaluations/${record.id}`)
        if (res.data.success) {
          toast.success(`已撤回：${record.student_name} ${record.points > 0 ? '+' : ''}${record.points} 分`)
          await loadRecords()
        }
      } catch (error) {
        console.error('撤回失败:', error)
        toast.error('撤回失败')
      }
    }
  })
}


onMounted(async () => {
  await loadClasses()
  if (!classes.value.length) {
    loading.value = false
  }
})
</script>

<template>
  <AppShell active-page="records" title="喂养记录" eyebrow="FEEDING LOG">
    <div class="w-full">
      <section class="grid overflow-hidden rounded-[2rem] border border-[#f0e5da] bg-white shadow-[0_12px_40px_rgba(101,71,45,0.06)] lg:grid-cols-[1.25fr_0.75fr]">
        <div class="p-7 sm:p-10">
          <p class="text-sm font-bold tracking-[0.2em] text-[#d78248]">FEEDING LOG</p>
          <h1 class="mt-3 font-serif text-4xl font-bold tracking-tight text-[#422d20] sm:text-5xl">喂养记录</h1>
          <p class="mt-4 whitespace-nowrap text-sm text-[#806b5b] sm:text-base">
            每一次评价，都是给小伙伴的一次喂养。在这里回顾班级的成长足迹，必要时也可以撤回误操作。
          </p>
          <div class="mt-7 flex flex-wrap gap-3">
            <div class="rounded-2xl bg-[#fff3e7] px-4 py-3">
              <p class="text-xl font-bold text-[#b76129]">{{ stats.total }}</p>
              <p class="mt-0.5 text-sm font-medium text-[#9e704f]">全部记录</p>
            </div>
            <div class="rounded-2xl bg-[#ecfdf5] px-4 py-3">
              <p class="text-xl font-bold text-[#059669]">{{ stats.positive }}</p>
              <p class="mt-0.5 text-sm font-medium text-[#6b8f7d]">加分记录</p>
            </div>
            <div class="rounded-2xl bg-[#fff1f2] px-4 py-3">
              <p class="text-xl font-bold text-[#e11d48]">{{ stats.negative }}</p>
              <p class="mt-0.5 text-sm font-medium text-[#b07a84]">扣分记录</p>
            </div>
            <div class="rounded-2xl bg-[#f5f3ff] px-4 py-3">
              <p class="text-xl font-bold text-[#7c3aed]">{{ stats.today }}</p>
              <p class="mt-0.5 text-sm font-medium text-[#8b7cb0]">今日喂养</p>
            </div>
          </div>
        </div>
        <div class="relative flex min-h-56 items-center justify-center overflow-hidden bg-[#fff4ea] px-8 pb-10 pt-8 sm:pb-14">
          <div class="absolute right-8 top-7 rounded-full bg-white/80 px-3 py-1.5 text-sm font-bold text-[#ae6a3e]">四类足迹</div>
          <div class="absolute bottom-0 h-20 w-[120%] rounded-t-[100%] bg-[#f8e6d4]"></div>
          <div class="relative z-10 grid grid-cols-2 gap-3">
            <div
              v-for="cat in categories"
              :key="cat"
              class="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_8px_20px_rgba(170,103,53,0.1)]"
            >
              <span class="material-symbols-rounded text-[22px]" :class="categoryMeta[cat].color">{{ categoryMeta[cat].icon }}</span>
              <span class="text-sm font-bold text-[#4d3527]">{{ cat }}</span>
            </div>
          </div>
        </div>
      </section>

      <main class="mt-6">
        <section class="rounded-[1.75rem] border border-[#f0e5da] bg-white p-4 shadow-[0_10px_30px_rgba(101,71,45,0.04)] sm:p-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="text-sm font-bold tracking-[0.16em] text-[#d78248]">RECORD LIST</p>
              <h2 class="mt-1 font-serif text-2xl font-bold text-[#422d20]">记录列表</h2>
              <p v-if="currentClass" class="mt-1 text-sm text-[#9a735d]">当前班级：{{ currentClass.name }}</p>
            </div>
            <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <label
                v-if="classes.length > 1"
                class="flex h-11 items-center gap-2 rounded-xl border border-[#ecdfd4] bg-[#fffdfb] px-3 text-[#a1836d] focus-within:border-orange-300 sm:w-44"
              >
                <span class="material-symbols-rounded text-[18px] leading-none">school</span>
                <select
                  class="min-w-0 flex-1 bg-transparent text-sm text-[#422d20] outline-none"
                  :value="currentClass?.id"
                  @change="selectClass(classes.find(cls => cls.id === ($event.target as HTMLSelectElement).value)!)"
                >
                  <option v-for="cls in classes" :key="cls.id" :value="cls.id">{{ cls.name }}</option>
                </select>
              </label>
              <label class="flex h-11 items-center gap-2 rounded-xl border border-[#ecdfd4] bg-[#fffdfb] px-3 text-[#a1836d] focus-within:border-orange-300 sm:w-56">
                <span class="material-symbols-rounded text-[18px] leading-none">search</span>
                <input
                  v-model="keyword"
                  type="search"
                  class="min-w-0 flex-1 bg-transparent text-sm text-[#422d20] outline-none placeholder:text-[#b9a697]"
                  placeholder="搜索学生或原因"
                  aria-label="搜索喂养记录"
                />
              </label>
              <div class="flex flex-wrap gap-1.5">
                <button
                  v-for="item in [{ id: 'all', label: '全部' }, { id: 'positive', label: '加分' }, { id: 'negative', label: '扣分' }]"
                  :key="item.id"
                  type="button"
                  class="rounded-full border px-3 py-1.5 text-sm font-semibold transition"
                  :class="pointFilter === item.id ? 'border-[#ff9f1c] bg-[#ff9f1c] text-white' : 'border-[#ededed] bg-white text-[#666]'"
                  @click="pointFilter = item.id as typeof pointFilter"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="!classes.length" class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center">
            <p class="text-sm font-medium text-[#75533d]">还没有班级，无法查看喂养记录</p>
            <router-link to="/" class="mt-3 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700">前往工作台创建班级</router-link>
          </div>

          <div v-else-if="loading" class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center text-sm text-[#a1836d]">加载中…</div>

          <template v-else>
            <div v-if="!filteredRecords.length" class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center">
              <span class="material-symbols-rounded text-[40px] text-[#e8c9ae]">restaurant</span>
              <p class="mt-3 text-sm font-medium text-[#75533d]">暂无匹配的喂养记录</p>
              <button
                type="button"
                class="mt-2 text-sm font-semibold text-orange-600 hover:text-orange-700"
                @click="keyword = ''; pointFilter = 'all'"
              >
                清空筛选
              </button>
            </div>

            <div v-else class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div
                v-for="group in groupedRecords"
                :key="group.category"
                class="flex min-h-0 flex-col rounded-xl border border-[#f3ece4] bg-[#fffdfb]"
              >
                <div class="flex items-center gap-2 border-b border-[#f3f0ec] px-3 py-2.5">
                  <span
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    :class="categoryMeta[group.category].bg"
                  >
                    <span class="material-symbols-rounded text-[16px]" :class="categoryMeta[group.category].color">
                      {{ categoryMeta[group.category].icon }}
                    </span>
                  </span>
                  <h3 class="min-w-0 flex-1 truncate text-sm font-bold text-[#795f50]">{{ group.category }}</h3>
                  <span class="shrink-0 text-sm text-[#b0927c]">{{ group.records.length }} 条</span>
                </div>
                <div v-if="group.records.length" class="max-h-[28rem] divide-y divide-[#f3f0ec] overflow-y-auto">
                  <div
                    v-for="record in group.records"
                    :key="record.id"
                    class="px-3 py-2.5"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <div class="min-w-0 flex-1">
                        <p class="truncate text-sm font-medium text-[#4d3527]">{{ record.student_name }}</p>
                        <p class="mt-0.5 truncate text-sm text-[#806b5b]">{{ record.reason }}</p>
                        <p class="mt-1 text-sm text-[#b0927c]">{{ formatRecordTime(record.timestamp) }}</p>
                      </div>
                      <div class="flex shrink-0 flex-col items-end gap-1">
                        <span
                          class="min-w-[2rem] text-right text-sm font-bold tabular-nums"
                          :class="record.points > 0 ? 'text-emerald-600' : record.points < 0 ? 'text-rose-600' : 'text-slate-500'"
                        >
                          {{ record.points > 0 ? '+' : '' }}{{ record.points }}
                        </span>
                        <button
                          type="button"
                          class="rounded-lg px-1.5 py-1 text-sm font-semibold text-orange-600 transition hover:bg-orange-50"
                          @click="undoRecord(record)"
                        >
                          撤回
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                <p v-else class="px-3 py-6 text-center text-sm text-[#b9a697]">暂无记录</p>
              </div>
            </div>

            <div v-if="totalPages > 1" class="mt-6 flex items-center justify-center gap-2">
              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ecdfd4] bg-white text-[#765f50] transition hover:border-orange-200 disabled:opacity-40"
                :disabled="page <= 1"
                @click="goToPage(page - 1)"
              >
                <span class="material-symbols-rounded text-[18px]">chevron_left</span>
              </button>
              <span class="px-3 text-sm text-[#806b5b]">第 {{ page }} / {{ totalPages }} 页</span>
              <button
                type="button"
                class="flex h-9 w-9 items-center justify-center rounded-xl border border-[#ecdfd4] bg-white text-[#765f50] transition hover:border-orange-200 disabled:opacity-40"
                :disabled="page >= totalPages"
                @click="goToPage(page + 1)"
              >
                <span class="material-symbols-rounded text-[18px]">chevron_right</span>
              </button>
            </div>
          </template>
        </section>
      </main>
    </div>

    <ConfirmDialog
      :show="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      :type="confirmDialog.type"
      @confirm="confirmDialog.onConfirm"
      @cancel="confirmDialog.show = false"
    />
  </AppShell>
</template>
