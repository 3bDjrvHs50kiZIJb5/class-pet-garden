<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppShell from '@/components/AppShell.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import type { Rule } from '@/types'
import { BADGE_CLASS } from '@/utils/badge'

const categories = ['学习', '行为', '健康', '其他'] as const

const categoryMeta: Record<string, { icon: string; color: string; bg: string }> = {
  学习: { icon: 'menu_book', color: 'text-[#2563eb]', bg: 'bg-[#eff6ff]' },
  行为: { icon: 'volunteer_activism', color: 'text-[#d97706]', bg: 'bg-[#fff7ed]' },
  健康: { icon: 'favorite', color: 'text-[#059669]', bg: 'bg-[#ecfdf5]' },
  其他: { icon: 'stars', color: 'text-[#7c3aed]', bg: 'bg-[#f5f3ff]' }
}

const { api } = useAuth()
const toast = useToast()

const rules = ref<Rule[]>([])
const loading = ref(true)
const keyword = ref('')
const pointFilter = ref<'all' | 'positive' | 'negative'>('all')

const newRuleName = ref('')
const newRulePoints = ref(1)
const newRuleCategory = ref<string>('学习')
const adding = ref(false)
const showAddModal = ref(false)

const confirmDialog = ref({
  show: false,
  title: '确认',
  message: '',
  confirmText: '确认',
  cancelText: '取消',
  type: 'warning' as 'info' | 'warning' | 'danger',
  onConfirm: () => {}
})

const filteredRules = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return rules.value.filter(rule => {
    if (pointFilter.value === 'positive' && rule.points <= 0) return false
    if (pointFilter.value === 'negative' && rule.points >= 0) return false
    if (query && !rule.name.toLowerCase().includes(query)) return false
    return true
  })
})

const groupedRules = computed(() =>
  categories.map(category => ({
    category,
    rules: filteredRules.value.filter(rule => rule.category === category)
  }))
)

const stats = computed(() => ({
  total: rules.value.length,
  custom: rules.value.filter(rule => rule.is_custom).length,
  positive: rules.value.filter(rule => rule.points > 0).length,
  negative: rules.value.filter(rule => rule.points < 0).length
}))

async function loadRules() {
  loading.value = true
  try {
    const res = await api.get('/rules')
    rules.value = res.data.rules
  } catch (error) {
    console.error('加载规则失败:', error)
    toast.error('加载规则失败')
  } finally {
    loading.value = false
  }
}

function showConfirm(options: {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'warning' | 'danger'
  onConfirm: () => void | Promise<void>
}) {
  confirmDialog.value = {
    show: true,
    title: options.title,
    message: options.message,
    confirmText: options.confirmText || '确认',
    cancelText: options.cancelText || '取消',
    type: options.type || 'warning',
    onConfirm: async () => {
      confirmDialog.value.show = false
      await options.onConfirm()
    }
  }
}

function openAddModal() {
  newRuleName.value = ''
  newRulePoints.value = 1
  newRuleCategory.value = '学习'
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
}

async function addRule() {
  if (!newRuleName.value.trim()) {
    toast.warning('请输入规则名称')
    return
  }
  adding.value = true
  try {
    await api.post('/rules', {
      name: newRuleName.value.trim(),
      points: newRulePoints.value,
      category: newRuleCategory.value
    })
    toast.success('添加成功！')
    closeAddModal()
    await loadRules()
  } catch (error) {
    console.error('添加规则失败:', error)
    toast.error('添加失败，请重试')
  } finally {
    adding.value = false
  }
}

function deleteRule(id: string) {
  showConfirm({
    title: '删除规则',
    message: '确定删除该自定义规则？删除后不影响已有评价记录。',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger',
    onConfirm: async () => {
      try {
        await api.delete(`/rules/${id}`)
        await loadRules()
        toast.success('删除成功！')
      } catch (error) {
        console.error('删除失败:', error)
        toast.error((error as { response?: { data?: { error?: string } } })?.response?.data?.error || '删除失败')
      }
    }
  })
}

onMounted(loadRules)
</script>

<template>
  <AppShell active-page="rules" title="评价规则" eyebrow="EVALUATION RULES">
    <div class="w-full">
      <section class="grid overflow-hidden rounded-[2rem] border border-[#f0e5da] bg-white shadow-[0_12px_40px_rgba(101,71,45,0.06)] lg:grid-cols-[1.25fr_0.75fr]">
        <div class="p-7 sm:p-10">
          <p class="text-sm font-bold tracking-[0.2em] text-[#d78248]">EVALUATION RULES</p>
          <h1 class="mt-3 font-serif text-4xl font-bold tracking-tight text-[#422d20] sm:text-5xl">评价规则</h1>
          <p class="mt-4 whitespace-nowrap text-sm text-[#806b5b] sm:text-base">
            管理班级加减分标准。系统预置规则全员可见；自定义规则仅自己可见，且只能删除自己创建的规则。
          </p>
          <div class="mt-7 flex flex-wrap gap-3">
            <div class="rounded-2xl bg-[#fff3e7] px-4 py-3">
              <p class="text-xl font-bold text-[#b76129]">{{ stats.total }}</p>
              <p class="mt-0.5 text-sm font-medium text-[#9e704f]">全部规则</p>
            </div>
            <div class="rounded-2xl bg-[#ecfdf5] px-4 py-3">
              <p class="text-xl font-bold text-[#059669]">{{ stats.positive }}</p>
              <p class="mt-0.5 text-sm font-medium text-[#6b8f7d]">加分项</p>
            </div>
            <div class="rounded-2xl bg-[#fff1f2] px-4 py-3">
              <p class="text-xl font-bold text-[#e11d48]">{{ stats.negative }}</p>
              <p class="mt-0.5 text-sm font-medium text-[#b07a84]">扣分项</p>
            </div>
            <div class="rounded-2xl bg-[#f5f3ff] px-4 py-3">
              <p class="text-xl font-bold text-[#7c3aed]">{{ stats.custom }}</p>
              <p class="mt-0.5 text-sm font-medium text-[#8b7cb0]">自定义</p>
            </div>
          </div>
        </div>
        <div class="relative hidden min-h-56 items-center justify-center overflow-hidden bg-[#fff4ea] px-8 lg:flex">
          <div class="absolute right-8 top-7 rounded-full bg-white/80 px-3 py-1.5 text-sm font-bold text-[#ae6a3e]">四类标准</div>
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
          <div class="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="text-sm font-bold tracking-[0.16em] text-[#d78248]">RULE LIST</p>
              <h2 class="mt-1 font-serif text-2xl font-bold text-[#422d20]">规则列表</h2>
            </div>
            <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                class="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#ea580c] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c2410c]"
                @click="openAddModal"
              >
                <span class="material-symbols-rounded text-[18px] leading-none">add</span>
                添加
              </button>
              <label class="flex h-11 items-center gap-2 rounded-xl border border-[#ecdfd4] bg-[#fffdfb] px-3 text-[#a1836d] focus-within:border-orange-300 sm:w-56">
                <span class="material-symbols-rounded text-[18px] leading-none">search</span>
                <input
                  v-model="keyword"
                  type="search"
                  class="min-w-0 flex-1 bg-transparent text-sm text-[#422d20] outline-none placeholder:text-[#b9a697]"
                  placeholder="搜索规则名称"
                  aria-label="搜索规则名称"
                />
              </label>
              <div class="flex gap-1.5">
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

          <div v-if="loading" class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center text-sm text-[#a1836d]">加载中…</div>

          <template v-else>
            <div v-if="!filteredRules.length" class="mt-4 rounded-xl bg-[#fff8f2] px-4 py-3 text-center">
              <p class="text-sm font-medium text-[#75533d]">没有匹配的规则</p>
              <button
                type="button"
                class="mt-1 text-sm font-semibold text-orange-600 hover:text-orange-700"
                @click="keyword = ''; pointFilter = 'all'"
              >
                清空筛选
              </button>
            </div>
            <div class="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div
              v-for="group in groupedRules"
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
                <span class="shrink-0 text-sm text-[#b0927c]">{{ group.rules.length }} 条</span>
              </div>
              <div v-if="group.rules.length" class="divide-y divide-[#f3f0ec]">
                <div
                  v-for="rule in group.rules"
                  :key="rule.id"
                  class="flex items-center justify-between gap-2 px-3 py-2"
                >
                  <div class="flex min-w-0 flex-1 items-center gap-1.5">
                    <span class="truncate text-sm font-medium text-[#4d3527]">{{ rule.name }}</span>
                    <span
                      v-if="rule.is_custom"
                      :class="[BADGE_CLASS, 'bg-violet-100 text-violet-700']"
                    >
                      自定义
                    </span>
                  </div>
                  <div class="flex shrink-0 items-center gap-1">
                    <span
                      class="min-w-[2rem] text-right text-sm font-bold tabular-nums"
                      :class="rule.points > 0 ? 'text-emerald-600' : rule.points < 0 ? 'text-rose-600' : 'text-slate-500'"
                    >
                      {{ rule.points > 0 ? '+' : '' }}{{ rule.points }}
                    </span>
                    <button
                      v-if="rule.is_custom"
                      type="button"
                      class="rounded-lg px-1.5 py-1 text-sm font-semibold text-rose-500 transition hover:bg-rose-50"
                      @click="deleteRule(rule.id)"
                    >
                      删除
                    </button>
                  </div>
                </div>
              </div>
              <p v-else class="px-3 py-6 text-center text-sm text-[#b9a697]">暂无匹配规则</p>
            </div>
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

    <Transition>
      <div
        v-if="showAddModal"
        class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4"
        @click.self="closeAddModal"
      >
        <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm font-bold tracking-wider text-[#d78248]">ADD RULE</p>
              <h2 class="mt-1 font-serif text-2xl font-bold text-[#422d20]">新增自定义规则</h2>
            </div>
            <button
              type="button"
              class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100"
              @click="closeAddModal"
            >
              <span class="material-symbols-rounded text-[20px]">close</span>
            </button>
          </div>
          <p class="mt-2 text-sm text-[#a1836d]">系统预置规则不可删除；自定义规则仅自己可见，且只能删除自己创建的</p>
          <form class="mt-5 space-y-3" @submit.prevent="addRule">
            <div>
              <label class="mb-1.5 block text-sm font-semibold text-[#795f50]">规则名称</label>
              <input
                v-model="newRuleName"
                class="h-11 w-full rounded-xl border border-[#ecdfd4] bg-[#fffdfb] px-3 text-sm text-[#422d20] outline-none placeholder:text-[#b9a697] focus:border-orange-300"
                placeholder="如：作业按时完成"
                aria-label="规则名称"
              />
            </div>
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="mb-1.5 block text-sm font-semibold text-[#795f50]">分类</label>
                <select
                  v-model="newRuleCategory"
                  class="h-11 w-full rounded-xl border border-[#ecdfd4] bg-[#fffdfb] px-3 text-sm text-[#422d20] outline-none focus:border-orange-300"
                  aria-label="规则分类"
                >
                  <option v-for="cat in categories" :key="cat" :value="cat">{{ cat }}</option>
                </select>
              </div>
              <div>
                <label class="mb-1.5 block text-sm font-semibold text-[#795f50]">分值</label>
                <input
                  v-model.number="newRulePoints"
                  type="number"
                  class="h-11 w-full rounded-xl border border-[#ecdfd4] bg-[#fffdfb] px-3 text-sm text-[#422d20] outline-none focus:border-orange-300"
                  aria-label="分值"
                />
              </div>
            </div>
            <div class="flex h-10 items-center justify-center rounded-xl bg-[#fff8f3] text-sm font-semibold text-[#9e704f]">
              {{ newRulePoints > 0 ? '加分' : newRulePoints < 0 ? '扣分' : '零分' }}
            </div>
            <div class="flex justify-end gap-2 pt-2">
              <button
                type="button"
                class="rounded-xl px-4 py-2.5 text-sm font-medium text-[#806b5b] transition hover:bg-slate-100"
                @click="closeAddModal"
              >
                取消
              </button>
              <button
                type="submit"
                class="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#ea580c] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c2410c] disabled:opacity-60"
                :disabled="adding"
              >
                <span class="material-symbols-rounded text-[18px] leading-none">add</span>
                {{ adding ? '添加中…' : '确认添加' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </AppShell>
</template>
