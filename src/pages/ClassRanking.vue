<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import RankListRow from '@/components/ranking/RankListRow.vue'
import RankPodium from '@/components/ranking/RankPodium.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import type { Class } from '@/types'
import {
  categoryMeta,
  getRankSubtitle,
  RANKING_CATEGORIES,
  takeTopRanking,
  totalRankingMeta,
  type RankingCategory,
  type RankingStudent,
} from '@/utils/ranking'

const DEMO_CLASS_ID = 'demo-class-2026'

const { api, user } = useAuth()
const toast = useToast()
const router = useRouter()

const classes = ref<Class[]>([])
const currentClass = ref<Class | null>(null)
const ranking = ref<RankingStudent[]>([])
const categoryRankings = ref<Record<RankingCategory, RankingStudent[]>>({
  学习: [],
  行为: [],
  健康: [],
  其他: [],
})
const loading = ref(true)
const isDemoMode = ref(false)

const groupedRankings = computed(() => [
  {
    id: 'total',
    label: totalRankingMeta.label,
    icon: totalRankingMeta.icon,
    color: totalRankingMeta.color,
    bg: totalRankingMeta.bg,
    students: takeTopRanking(ranking.value),
    isTotal: true,
  },
  ...RANKING_CATEGORIES.map(category => ({
    id: category,
    label: category,
    icon: categoryMeta[category].icon,
    color: categoryMeta[category].color,
    bg: categoryMeta[category].bg,
    students: takeTopRanking(categoryRankings.value[category] || []),
    isTotal: false,
  })),
])

function getCurrentClassStorageKey() {
  return `pet-garden-current-class-${user.value?.id || 'guest'}`
}

function requestConfigForCurrentClass() {
  return isDemoMode.value ? { headers: { Authorization: 'Bearer guest' } } : undefined
}

async function loadClasses() {
  try {
    const res = await api.get('/classes')
    classes.value = res.data.classes || []
    if (!classes.value.length) {
      currentClass.value = null
      ranking.value = []
      categoryRankings.value = { 学习: [], 行为: [], 健康: [], 其他: [] }
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
  localStorage.setItem(getCurrentClassStorageKey(), cls.id)
  await loadRanking()
}

async function loadRanking() {
  if (!currentClass.value) {
    ranking.value = []
    categoryRankings.value = { 学习: [], 行为: [], 健康: [], 其他: [] }
    return
  }
  loading.value = true
  try {
    const res = await api.get(
      `/settings/ranking/${currentClass.value.id}`,
      requestConfigForCurrentClass()
    )
    ranking.value = res.data.ranking || []
    const nextCategoryRankings = { 学习: [], 行为: [], 健康: [], 其他: [] } as Record<RankingCategory, RankingStudent[]>
    for (const category of RANKING_CATEGORIES) {
      nextCategoryRankings[category] = res.data.categoryRankings?.[category] || []
    }
    categoryRankings.value = nextCategoryRankings
  } catch (error) {
    console.error('加载排行榜失败:', error)
    toast.error('加载排行榜失败')
    ranking.value = []
    categoryRankings.value = { 学习: [], 行为: [], 健康: [], 其他: [] }
  } finally {
    loading.value = false
  }
}

function openStudent(student: RankingStudent) {
  router.push({ path: '/', query: { studentId: student.id } })
}

onMounted(async () => {
  loading.value = true
  await loadClasses()
  if (!classes.value.length) {
    loading.value = false
  }
})
</script>

<template>
  <AppShell active-page="ranking" title="班级排行榜" eyebrow="LEADERBOARD">
    <div class="w-full">
      <main>
        <section class="rounded-[1.75rem] border border-[#f0e5da] bg-white p-4 shadow-[0_10px_30px_rgba(101,71,45,0.04)] sm:p-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div class="flex items-center gap-2">
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-[#fff4e6]">
                <span class="material-symbols-rounded text-sm leading-none text-[#ff9f1c]">emoji_events</span>
              </span>
              <div>
                <h2 class="text-[15px] font-bold text-[#1a1a1a]">排行榜</h2>
                <p v-if="currentClass" class="mt-0.5 text-sm text-[#9a735d]">当前班级：{{ currentClass.name }} · 总榜与四类分项排名</p>
              </div>
            </div>
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
          </div>

          <div v-if="!classes.length" class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center">
            <p class="text-sm font-medium text-[#75533d]">还没有班级，无法查看排行榜</p>
            <router-link to="/" class="mt-3 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700">前往工作台创建班级</router-link>
          </div>

          <div v-else-if="loading" class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center text-sm text-[#a1836d]">加载中…</div>

          <template v-else-if="!ranking.length">
            <div class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center">
              <span class="material-symbols-rounded text-[40px] text-[#e8c9ae]">emoji_events</span>
              <p class="mt-3 text-sm font-medium text-[#75533d]">班级还没有学生，榜单空空如也</p>
              <router-link to="/" class="mt-3 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700">去添加学生</router-link>
            </div>
          </template>

          <template v-else>
            <div class="mt-6 rounded-[1.25rem] bg-[#fff8f2] px-4 py-6 sm:px-6">
              <RankPodium :students="ranking" @select="openStudent" />
            </div>

            <div class="mt-6 grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-5">
              <div
                v-for="group in groupedRankings"
                :key="group.id"
                class="flex h-full flex-col rounded-xl border border-[#f3ece4] bg-[#fffdfb]"
              >
                <div class="flex items-center gap-2 border-b border-[#f3f0ec] px-3 py-2.5">
                  <span
                    class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                    :class="group.bg"
                  >
                    <span class="material-symbols-rounded text-[16px]" :class="group.color">
                      {{ group.icon }}
                    </span>
                  </span>
                  <h3 class="min-w-0 flex-1 truncate text-sm font-bold text-[#795f50]">{{ group.label }}</h3>
                  <span class="shrink-0 text-sm text-[#b0927c]">{{ group.students.length }} 人</span>
                </div>
                <div v-if="group.students.length" class="flex flex-1 flex-col gap-1 p-2.5">
                  <RankListRow
                    v-for="(student, index) in group.students"
                    :key="`${group.id}-${student.id}`"
                    :student="student"
                    :index="index"
                    :display-points="group.isTotal ? student.total_points : (student.category_points ?? 0)"
                    :display-subtitle="group.isTotal ? getRankSubtitle(student) : ''"
                    @select="openStudent"
                  />
                </div>
                <p v-else class="flex flex-1 items-center justify-center px-3 py-6 text-center text-sm text-[#b9a697]">暂无记录</p>
              </div>
            </div>
          </template>
        </section>
      </main>
    </div>
  </AppShell>
</template>
