<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'

function useWindowDrag(
  dragging: ReturnType<typeof ref<boolean>>,
  onMove: (event: PointerEvent) => void,
  onEnd: () => void
) {
  watch(dragging, (active) => {
    if (active) {
      window.addEventListener('pointermove', onMove)
      window.addEventListener('pointerup', onEnd)
      window.addEventListener('pointercancel', onEnd)
    } else {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onEnd)
      window.removeEventListener('pointercancel', onEnd)
    }
  })
  onBeforeUnmount(() => {
    window.removeEventListener('pointermove', onMove)
    window.removeEventListener('pointerup', onEnd)
    window.removeEventListener('pointercancel', onEnd)
  })
}

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  success: []
  close: []
}>()

const trackRef = ref<HTMLElement | null>(null)
const offset = ref(0)
const dragging = ref(false)
const verified = ref(false)
const handleWidth = 48
const threshold = 6

const statusText = computed(() => {
  if (verified.value) return '验证通过'
  if (dragging.value) return '请继续拖动'
  return '请拖动滑块完成验证'
})

const progressStyle = computed(() => ({
  width: `${Math.max(handleWidth / 2, offset.value + handleWidth)}px`
}))

function getMaxOffset() {
  const width = trackRef.value?.clientWidth ?? 0
  return Math.max(0, width - handleWidth)
}

function reset() {
  offset.value = 0
  dragging.value = false
  verified.value = false
}

watch(
  () => props.show,
  (visible) => {
    if (visible) reset()
  }
)

function onPointerDown(event: PointerEvent) {
  if (verified.value) return
  dragging.value = true
  ;(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value || verified.value || !trackRef.value) return
  const rect = trackRef.value.getBoundingClientRect()
  const next = event.clientX - rect.left - handleWidth / 2
  offset.value = Math.min(Math.max(0, next), getMaxOffset())
}

function finishDrag() {
  if (!dragging.value || verified.value) return
  dragging.value = false
  const max = getMaxOffset()
  if (offset.value >= max - threshold) {
    offset.value = max
    verified.value = true
    window.setTimeout(() => emit('success'), 400)
  } else {
    offset.value = 0
  }
}

function onPointerUp() {
  finishDrag()
}

useWindowDrag(dragging, onPointerMove, onPointerUp)

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onBeforeUnmount(() => {
  dragging.value = false
})
</script>

<template>
  <Teleport to="body">
    <Transition name="slide-verify-fade">
      <div
        v-if="show"
        class="fixed inset-0 z-[80] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm"
        @click.self="emit('close')"
        @keydown="onKeydown"
      >
        <div
          class="w-full max-w-md rounded-3xl border border-[#f0e7dd] bg-white p-6 shadow-2xl sm:p-7"
          role="dialog"
          aria-modal="true"
          aria-labelledby="slide-verify-title"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <h3 id="slide-verify-title" class="text-lg font-bold text-[#1a1a1a]">安全验证</h3>
              <p class="mt-1 text-sm text-[#666]">完成滑动验证后即可创建账号</p>
            </div>
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-full text-[#999] transition hover:bg-[#f5f5f5] hover:text-[#666]"
              aria-label="关闭"
              @click="emit('close')"
            >
              <span class="material-symbols-rounded text-[20px]">close</span>
            </button>
          </div>

          <div
            class="mt-5 overflow-hidden rounded-2xl border border-[#f0e7dd] bg-gradient-to-br from-[#fff8f2] to-[#fffdfb]"
          >
            <div class="flex items-center gap-2 px-4 py-3 text-sm text-[#9a5a2b]">
              <span class="material-symbols-rounded text-[18px] text-[#ff5c00]">verified_user</span>
              <span>{{ statusText }}</span>
            </div>
          </div>

          <div
            ref="trackRef"
            class="relative mt-4 h-12 select-none overflow-hidden rounded-full border border-[#edeff2] bg-[#f8f6f3]"
          >
            <div
              class="pointer-events-none absolute inset-y-0 left-0 rounded-full bg-[#ffe7d4] transition-[width] duration-100"
              :style="progressStyle"
            />
            <p
              class="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium"
              :class="verified ? 'text-emerald-600' : 'text-[#b9a697]'"
            >
              {{ verified ? '验证成功' : '向右滑动滑块' }}
            </p>
            <div
              class="absolute top-0 flex h-12 w-12 cursor-grab items-center justify-center rounded-full border shadow-sm transition-colors active:cursor-grabbing"
              :class="
                verified
                  ? 'border-emerald-200 bg-emerald-500 text-white'
                  : 'border-[#ffd4b8] bg-[#ff5c00] text-white'
              "
              :style="{ transform: `translateX(${offset}px)` }"
              @pointerdown="onPointerDown"
            >
              <span class="material-symbols-rounded text-[22px]">
                {{ verified ? 'check' : 'chevron_right' }}
              </span>
            </div>
          </div>

          <p class="mt-4 text-center text-xs text-[#999]">拖动滑块至最右侧以确认您不是机器人</p>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.slide-verify-fade-enter-active,
.slide-verify-fade-leave-active {
  transition: opacity 0.2s ease;
}
.slide-verify-fade-enter-from,
.slide-verify-fade-leave-to {
  opacity: 0;
}
</style>
