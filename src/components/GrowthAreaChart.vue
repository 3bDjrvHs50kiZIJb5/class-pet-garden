<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  values: number[]
  labels?: string[]
  height?: number
}>(), {
  labels: () => ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
  height: 132
})

const chartWidth = 320
const chartHeight = 120
const padding = { top: 16, right: 12, bottom: 8, left: 12 }

const chartPoints = computed(() => {
  const values = props.values.length ? props.values : [0, 0, 0, 0, 0, 0, 0]
  const chartW = chartWidth - padding.left - padding.right
  const chartH = chartHeight - padding.top - padding.bottom
  const max = Math.max(...values, 1)

  return values.map((value, index) => ({
    x: padding.left + (index / Math.max(values.length - 1, 1)) * chartW,
    y: padding.top + chartH - (value / max) * chartH,
    value
  }))
})

function smoothLinePath(points: { x: number; y: number }[]) {
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`

  let path = `M ${points[0].x} ${points[0].y}`
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index]
    const next = points[index + 1]
    const controlX = (current.x + next.x) / 2
    path += ` C ${controlX} ${current.y}, ${controlX} ${next.y}, ${next.x} ${next.y}`
  }
  return path
}

const linePath = computed(() => smoothLinePath(chartPoints.value))

const areaPath = computed(() => {
  const points = chartPoints.value
  if (!points.length) return ''
  const bottom = chartHeight - padding.bottom
  const start = points[0]
  const end = points[points.length - 1]
  return `${linePath.value} L ${end.x} ${bottom} L ${start.x} ${bottom} Z`
})

const weekTotal = computed(() => props.values.reduce((sum, value) => sum + value, 0))
const peakDay = computed(() => {
  if (!props.values.length) return props.labels[0]
  const peakIndex = props.values.indexOf(Math.max(...props.values))
  return props.labels[peakIndex] || props.labels[0]
})
</script>

<template>
  <div>
    <div class="mb-3 flex items-center justify-between gap-3">
      <div class="flex items-center gap-2 text-sm text-[#9a8575]">
        <span class="inline-flex h-2 w-2 rounded-full bg-[#ff9f3d]"></span>
        <span>本周累计 +{{ weekTotal }}</span>
      </div>
      <span class="text-sm text-[#b8a496]">活跃高峰 · {{ peakDay }}</span>
    </div>

    <div class="relative rounded-[14px] bg-[#fff9f3] px-2 pb-2 pt-3">
      <svg
        :viewBox="`0 0 ${chartWidth} ${chartHeight}`"
        class="w-full"
        :style="{ height: `${height}px` }"
        preserveAspectRatio="none"
        role="img"
        aria-label="班级本周成长趋势图"
      >
        <defs>
          <linearGradient id="growth-area-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="#ffc98a" stop-opacity="0.72" />
            <stop offset="55%" stop-color="#ffd9ad" stop-opacity="0.28" />
            <stop offset="100%" stop-color="#fff4e8" stop-opacity="0.04" />
          </linearGradient>
          <linearGradient id="growth-line-gradient" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#ffb25d" />
            <stop offset="100%" stop-color="#ff8a2b" />
          </linearGradient>
        </defs>

        <line
          v-for="line in 3"
          :key="line"
          :x1="padding.left"
          :x2="chartWidth - padding.right"
          :y1="padding.top + ((chartHeight - padding.top - padding.bottom) / 3) * line"
          :y2="padding.top + ((chartHeight - padding.top - padding.bottom) / 3) * line"
          stroke="#f3e3d4"
          stroke-width="1"
          stroke-dasharray="4 6"
        />

        <path :d="areaPath" fill="url(#growth-area-gradient)" />
        <path
          :d="linePath"
          fill="none"
          stroke="url(#growth-line-gradient)"
          stroke-width="2.5"
          stroke-linecap="round"
          stroke-linejoin="round"
        />

        <circle
          v-for="(point, index) in chartPoints"
          :key="index"
          :cx="point.x"
          :cy="point.y"
          r="3.5"
          fill="#fff"
          stroke="#ff9f3d"
          stroke-width="2"
        />
      </svg>

      <div class="flex justify-between px-1">
        <span
          v-for="label in labels"
          :key="label"
          class="flex-1 text-center text-sm text-[#999]"
        >
          {{ label }}
        </span>
      </div>
    </div>

    <p class="mt-2 text-center text-xs leading-5 text-[#b8a496]">
      曲线表示本周班级累计正向评价积分，越高说明本周获得的肯定越多
    </p>
  </div>
</template>
