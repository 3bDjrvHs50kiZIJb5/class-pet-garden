<script setup lang="ts">
import { computed } from 'vue'
import { getPetLevelImage } from '@/data/pets'
import { getRankBadgeStyle, getRankSubtitle, type RankingStudent } from '@/utils/ranking'

const props = withDefaults(defineProps<{
  student: RankingStudent
  index: number
  displayPoints?: number
  displaySubtitle?: string
}>(), {
  displayPoints: undefined,
  displaySubtitle: undefined,
})

const emit = defineEmits<{
  select: [student: RankingStudent]
}>()

const styles = computed(() => getRankBadgeStyle(props.index))
const subtitle = computed(() => props.displaySubtitle ?? getRankSubtitle(props.student))
const points = computed(() => props.displayPoints ?? props.student.total_points)
const petImage = computed(() => {
  if (!props.student.pet_type) return ''
  return getPetLevelImage(props.student.pet_type, props.student.pet_level)
})
</script>

<template>
  <button
    type="button"
    class="flex w-full items-center gap-2 rounded-xl px-1.5 py-1.5 text-left transition hover:bg-[#fff8f2]"
    @click="emit('select', student)"
  >
    <span
      class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold font-mono"
      :class="[styles.badgeBg, styles.badgeText]"
    >
      {{ index + 1 }}
    </span>
    <span class="flex h-[26px] w-[26px] shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#ffe0b8] bg-[#fff8ef]">
      <img v-if="petImage" :src="petImage" :alt="student.name" class="h-full w-full object-contain" />
      <span v-else class="text-sm text-[#bbb]">?</span>
    </span>
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm text-[#333]">{{ student.name }}</span>
      <span v-if="subtitle" class="block truncate text-sm text-[#a0a0a0]">{{ subtitle }}</span>
    </span>
    <span class="shrink-0 text-sm font-bold font-mono" :class="styles.pointsText">
      {{ points }}
    </span>
  </button>
</template>
