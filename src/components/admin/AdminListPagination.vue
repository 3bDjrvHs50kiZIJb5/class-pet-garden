<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    total: number
    page: number
    pageSize?: number
    unit?: string
  }>(),
  { pageSize: 10, unit: '条' },
)

const emit = defineEmits<{
  'update:page': [page: number]
}>()

const pageCount = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

const range = computed(() => {
  if (props.total === 0) return { start: 0, end: 0 }
  const start = (props.page - 1) * props.pageSize + 1
  const end = Math.min(props.page * props.pageSize, props.total)
  return { start, end }
})

const showPager = computed(() => props.total > props.pageSize)

const pageButtons = computed(() => {
  const count = pageCount.value
  const current = props.page
  if (count <= 7) {
    return Array.from({ length: count }, (_, i) => i + 1)
  }
  const pages = new Set<number>([1, count, current, current - 1, current + 1])
  return [...pages].filter((p) => p >= 1 && p <= count).sort((a, b) => a - b)
})

function goTo(page: number) {
  const next = Math.min(Math.max(1, page), pageCount.value)
  if (next !== props.page) emit('update:page', next)
}
</script>

<template>
  <div
    v-if="total > 0"
    class="flex flex-col gap-3 border-t border-[#f3ece4] pt-4 sm:flex-row sm:items-center sm:justify-between"
  >
    <p class="text-sm text-[#b0927c]">
      显示 {{ range.start }}–{{ range.end }} / 共 {{ total }} {{ unit }}
    </p>
    <nav v-if="showPager" class="flex flex-wrap items-center justify-end gap-1.5" aria-label="分页">
      <button
        type="button"
        class="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#ecdfd4] bg-white px-2 text-sm font-semibold text-[#765f50] transition hover:bg-[#fff7f1] disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="page <= 1"
        aria-label="上一页"
        @click="goTo(page - 1)"
      >
        <span class="material-symbols-rounded text-[18px] leading-none">chevron_left</span>
      </button>
      <template v-for="(p, idx) in pageButtons" :key="`p-${p}`">
        <span
          v-if="idx > 0 && p - pageButtons[idx - 1] > 1"
          class="px-1 text-sm text-[#c4a996]"
        >…</span>
        <button
          type="button"
          class="inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-2.5 text-sm font-semibold transition"
          :class="p === page
            ? 'bg-[#fff0e2] text-[#b85e25] shadow-[inset_0_0_0_1px_rgba(234,151,86,0.18)]'
            : 'border border-[#ecdfd4] bg-white text-[#765f50] hover:bg-[#fff7f1]'"
          :aria-current="p === page ? 'page' : undefined"
          @click="goTo(p)"
        >
          {{ p }}
        </button>
      </template>
      <button
        type="button"
        class="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-[#ecdfd4] bg-white px-2 text-sm font-semibold text-[#765f50] transition hover:bg-[#fff7f1] disabled:cursor-not-allowed disabled:opacity-40"
        :disabled="page >= pageCount"
        aria-label="下一页"
        @click="goTo(page + 1)"
      >
        <span class="material-symbols-rounded text-[18px] leading-none">chevron_right</span>
      </button>
    </nav>
  </div>
</template>