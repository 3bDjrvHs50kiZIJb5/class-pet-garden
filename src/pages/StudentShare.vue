<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import axios from 'axios'
import { calculateLevel, getLevelProgress, getPetLevelImage, getPetType } from '@/data/pets'
import { useToast } from '@/composables/useToast'

interface ShareStudent {
  id: string
  name: string
  student_no: string | null
  total_points: number
  pet_type: string | null
  pet_level: number
  pet_exp: number
  class_name: string
}

interface ShareRecord {
  id: string
  points: number
  reason: string
  category: string
  timestamp: number
}

const route = useRoute()
const toast = useToast()

const loading = ref(true)
const notFound = ref(false)
const student = ref<ShareStudent | null>(null)
const records = ref<ShareRecord[]>([])

const publicApi = axios.create({
  baseURL: '/pet-garden/api'
})

const displayLevel = computed(() => (
  student.value ? calculateLevel(student.value.pet_exp) : 1
))

const levelProgress = computed(() => (
  student.value ? getLevelProgress(student.value.pet_exp) : getLevelProgress(0)
))

const petImage = computed(() => {
  if (!student.value?.pet_type) return ''
  return getPetLevelImage(student.value.pet_type, student.value.pet_level)
})

const shareUrl = computed(() => window.location.href)

function formatRecordTime(timestamp?: number) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return isToday ? `今天 ${time}` : date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value)
    toast.success('分享链接已复制')
  } catch {
    toast.error('复制失败，请手动复制地址栏链接')
  }
}

onMounted(async () => {
  const studentId = route.params.studentId
  if (typeof studentId !== 'string' || !studentId) {
    notFound.value = true
    loading.value = false
    return
  }

  try {
    const res = await publicApi.get(`/public/students/${studentId}/share`)
    student.value = res.data.student
    records.value = res.data.records || []
  } catch (error) {
    console.error('加载分享记录失败:', error)
    notFound.value = true
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-[#fffaf5] font-sans text-[#38281f]">
    <div class="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <div v-if="loading" class="rounded-3xl bg-white px-6 py-16 text-center text-sm text-[#9a735d] shadow-sm">
        加载中…
      </div>

      <div v-else-if="notFound || !student" class="rounded-3xl bg-white px-6 py-16 text-center shadow-sm">
        <span class="material-symbols-rounded text-[48px] text-[#e8c9ae]">pets</span>
        <p class="mt-4 text-lg font-bold text-[#422d20]">成长记录不存在</p>
        <p class="mt-2 text-sm text-[#9a735d]">链接可能已失效，请联系老师获取最新分享链接。</p>
        <router-link to="/" class="mt-6 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700">
          前往班级宠物园
        </router-link>
      </div>

      <template v-else>
        <section class="overflow-hidden rounded-3xl bg-white shadow-[0_12px_40px_rgba(101,71,45,0.08)]">
          <div class="bg-orange-600 px-6 pb-4 pt-5 text-white">
            <div class="flex items-start justify-between gap-3">
              <div>
                <p class="text-sm text-orange-100">{{ student.class_name }}</p>
                <h1 class="mt-1 font-serif text-3xl font-bold">{{ student.name }}</h1>
                <p class="mt-1 text-sm text-orange-100">
                  {{ getPetType(student.pet_type || '')?.name || '等待领养' }}
                  · Lv.{{ displayLevel }}
                  · {{ student.total_points }} 积分
                </p>
              </div>
              <button
                type="button"
                class="inline-flex h-9 items-center gap-1 rounded-full bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-white/20"
                @click="copyShareLink"
              >
                <span class="material-symbols-rounded text-[18px]">share</span>
                <span class="hidden sm:inline">复制链接</span>
              </button>
            </div>

            <div class="mt-4 flex gap-4">
              <div class="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/20 sm:h-28 sm:w-28">
                <img v-if="student.pet_type" :src="petImage" :alt="getPetType(student.pet_type)?.name" class="h-full w-full rounded-2xl object-contain" />
                <span v-else class="text-4xl">?</span>
              </div>
              <div class="min-w-0 flex-1 pt-1">
                <div class="mb-1 flex items-center justify-between text-xs text-orange-100">
                  <span>成长进度</span>
                  <span>Lv.{{ displayLevel }} · {{ levelProgress.current }}/{{ levelProgress.required }}</span>
                </div>
                <div class="h-2.5 overflow-hidden rounded-full bg-white/30">
                  <div class="h-full rounded-full bg-white" :style="{ width: `${levelProgress.percentage}%` }" />
                </div>
                <p v-if="student.student_no" class="mt-3 text-sm text-orange-100">学号：{{ student.student_no }}</p>
              </div>
            </div>
          </div>

          <div class="p-6">
            <div class="flex items-center justify-between">
              <h2 class="font-serif text-xl font-bold text-[#422d20]">成长记录</h2>
              <span class="text-sm text-[#9a735d]">共 {{ records.length }} 条</span>
            </div>

            <div v-if="records.length" class="mt-4 space-y-2">
              <article
                v-for="record in records"
                :key="record.id"
                class="flex items-center justify-between rounded-xl bg-[#fff8f2] px-4 py-3"
              >
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-medium text-[#4d3527]">{{ record.reason }}</p>
                  <p class="mt-1 text-sm text-[#b0927c]">{{ record.category }} · {{ formatRecordTime(record.timestamp) }}</p>
                </div>
                <span
                  class="ml-3 shrink-0 text-sm font-bold tabular-nums"
                  :class="record.points > 0 ? 'text-emerald-600' : record.points < 0 ? 'text-rose-600' : 'text-slate-500'"
                >
                  {{ record.points > 0 ? '+' : '' }}{{ record.points }}
                </span>
              </article>
            </div>

            <p v-else class="mt-6 rounded-2xl bg-[#fff8f2] px-4 py-10 text-center text-sm text-[#9a735d]">
              还没有成长记录，继续加油！
            </p>
          </div>
        </section>

        <p class="mt-6 text-center text-sm text-[#9a735d]">
          来自
          <router-link to="/" class="font-semibold text-orange-600 hover:text-orange-700">班级宠物园</router-link>
          ，每一次进步都在被看见。
        </p>
      </template>
    </div>
  </div>
</template>
