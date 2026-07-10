<script setup lang="ts">
import { computed } from 'vue'
import { getPetLevelImage } from '@/data/pets'
import { getRankSubtitle, type RankingStudent } from '@/utils/ranking'

const props = defineProps<{
  students: RankingStudent[]
}>()

const emit = defineEmits<{
  select: [student: RankingStudent]
}>()

const podiumConfig = [
  {
    rank: 2,
    order: 'order-1',
    width: 'min-w-[10.5rem] sm:min-w-[12rem]',
    image: 'h-32 w-32 sm:h-36 sm:w-36',
    card: 'bg-gradient-to-b from-slate-100 to-slate-200',
    medal: 'text-slate-400',
  },
  {
    rank: 1,
    order: 'order-2',
    width: 'min-w-[12.5rem] sm:min-w-[14.5rem]',
    image: 'h-40 w-40 sm:h-48 sm:w-48',
    card: 'bg-gradient-to-b from-amber-100 to-amber-200',
    medal: 'text-amber-500',
  },
  {
    rank: 3,
    order: 'order-3',
    width: 'min-w-[9.5rem] sm:min-w-[11rem]',
    image: 'h-28 w-28 sm:h-32 sm:w-32',
    card: 'bg-gradient-to-b from-orange-100 to-orange-200',
    medal: 'text-amber-700',
  },
] as const

const podiumStudents = computed(() =>
  podiumConfig
    .map(config => ({
      ...config,
      student: props.students[config.rank - 1] ?? null,
    }))
    .filter(item => item.student)
)

function getPetImage(student: RankingStudent) {
  if (!student.pet_type) return ''
  return getPetLevelImage(student.pet_type, student.pet_level)
}
</script>

<template>
  <div v-if="podiumStudents.length" class="flex items-end justify-center gap-4 sm:gap-6">
    <button
      v-for="item in podiumStudents"
      :key="item.rank"
      type="button"
      class="flex flex-col items-center transition hover:-translate-y-1"
      :class="item.order"
      @click="item.student && emit('select', item.student)"
    >
      <div
        class="flex flex-col items-center rounded-[1.5rem] px-4 pb-4 pt-4 shadow-sm"
        :class="[item.width, item.card]"
      >
        <div
          class="flex items-end justify-center overflow-hidden rounded-2xl border border-white/80 bg-white/90"
          :class="item.image"
        >
          <img
            v-if="item.student && getPetImage(item.student)"
            :src="getPetImage(item.student!)"
            :alt="item.student!.name"
            class="h-full w-full object-contain object-bottom"
          />
          <span v-else class="text-4xl text-[#ccc]">?</span>
        </div>
        <div class="mt-3 flex max-w-full items-center justify-center gap-1.5">
          <span class="material-symbols-rounded shrink-0 text-[20px] leading-none sm:text-[22px]" :class="item.medal">workspace_premium</span>
          <p class="min-w-0 truncate text-sm font-bold text-[#422d20] sm:text-base">{{ item.student!.name }}</p>
        </div>
        <p class="mt-0.5 text-sm font-bold text-[#ff5c00]">{{ item.student!.total_points }} 分</p>
        <p class="mt-1 max-w-full truncate text-sm text-[#8c7464]">{{ getRankSubtitle(item.student!) }}</p>
      </div>
    </button>
  </div>
</template>
