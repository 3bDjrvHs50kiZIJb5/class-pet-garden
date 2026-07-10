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
    cardWidth: 'min-w-0 flex-1 basis-[28%] sm:basis-auto sm:flex-none sm:min-w-[12rem]',
    image: 'h-[4.5rem] w-[4.5rem] sm:h-36 sm:w-36',
    card: 'bg-gradient-to-b from-slate-100 to-slate-200',
    medal: 'text-slate-400',
  },
  {
    rank: 1,
    order: 'order-2',
    cardWidth: 'min-w-0 flex-1 basis-[36%] sm:basis-auto sm:flex-none sm:min-w-[14.5rem]',
    image: 'h-24 w-24 sm:h-48 sm:w-48',
    card: 'bg-gradient-to-b from-amber-100 to-amber-200',
    medal: 'text-amber-500',
  },
  {
    rank: 3,
    order: 'order-3',
    cardWidth: 'min-w-0 flex-1 basis-[28%] sm:basis-auto sm:flex-none sm:min-w-[11rem]',
    image: 'h-16 w-16 sm:h-32 sm:w-32',
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
  <div v-if="podiumStudents.length" class="flex w-full items-end justify-center gap-1.5 sm:gap-4 lg:gap-6">
    <button
      v-for="item in podiumStudents"
      :key="item.rank"
      type="button"
      class="flex min-w-0 flex-col items-center transition hover:-translate-y-1"
      :class="item.order"
      @click="item.student && emit('select', item.student)"
    >
      <div
        class="flex w-full flex-col items-center rounded-xl px-2 pb-2 pt-2 shadow-sm sm:rounded-[1.5rem] sm:px-4 sm:pb-4 sm:pt-4"
        :class="[item.cardWidth, item.card]"
      >
        <div
          class="flex items-end justify-center overflow-hidden rounded-xl border border-white/80 bg-white/90 sm:rounded-2xl"
          :class="item.image"
        >
          <img
            v-if="item.student && getPetImage(item.student)"
            :src="getPetImage(item.student!)"
            :alt="item.student!.name"
            class="h-full w-full object-contain object-bottom"
          />
          <span v-else class="text-2xl text-[#ccc] sm:text-4xl">?</span>
        </div>
        <div class="mt-1.5 flex max-w-full items-center justify-center gap-1 sm:mt-3 sm:gap-1.5">
          <span class="material-symbols-rounded shrink-0 text-[14px] leading-none sm:text-[22px]" :class="item.medal">workspace_premium</span>
          <p class="min-w-0 truncate text-xs font-bold text-[#422d20] sm:text-base">{{ item.student!.name }}</p>
        </div>
        <p class="mt-0.5 text-xs font-bold text-[#ff5c00] sm:text-sm">{{ item.student!.total_points }} 分</p>
        <p class="mt-0.5 hidden max-w-full truncate text-sm text-[#8c7464] sm:mt-1 sm:block">{{ getRankSubtitle(item.student!) }}</p>
      </div>
    </button>
  </div>
</template>
