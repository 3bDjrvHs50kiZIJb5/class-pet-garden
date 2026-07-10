<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { BGM_TRACKS, useBgm } from '@/composables/useBgm'

const { currentTrackIndex, isMuted, playTrack, toggleMute } = useBgm()

const rootRef = ref<HTMLElement | null>(null)
const showPicker = ref(false)

function togglePicker() {
  showPicker.value = !showPicker.value
}

function closePicker() {
  showPicker.value = false
}

function selectTrack(index: number) {
  playTrack(index)
  closePicker()
}

function handleDocumentClick(event: MouseEvent) {
  if (!showPicker.value) return
  const target = event.target
  if (!(target instanceof Node)) return
  if (rootRef.value?.contains(target)) return
  closePicker()
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
})

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div ref="rootRef" class="relative flex items-center gap-2">
    <button
      type="button"
      class="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-[#edeff2] bg-white shadow-sm transition"
      :class="isMuted ? 'text-[#bbb]' : 'text-[#666]'"
      aria-label="选择背景音乐"
      :aria-expanded="showPicker"
      data-testid="bgm-mute-button"
      @click.stop="togglePicker"
    >
      <span class="material-symbols-rounded text-[20px]">{{ isMuted ? 'volume_off' : 'volume_up' }}</span>
    </button>

    <div
      v-if="showPicker"
      class="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-2xl border border-[#edeff2] bg-white shadow-lg"
      data-testid="bgm-track-picker-menu"
      @click.stop
    >
      <div class="flex items-center justify-between gap-3 border-b border-[#f3f0ec] px-4 py-3">
        <div class="min-w-0">
          <p class="text-xs font-bold tracking-[0.14em] text-[#d78248]">BGM</p>
          <p class="mt-1 text-sm font-semibold text-[#422d20]">选择背景音乐</p>
        </div>
        <button
          type="button"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#edeff2] bg-white text-[#666] shadow-sm transition hover:border-orange-200 hover:bg-[#fffaf5]"
          :class="isMuted ? 'text-[#bbb]' : 'text-[#666]'"
          :aria-label="isMuted ? '开启声音' : '静音'"
          data-testid="bgm-mute-toggle"
          @click="toggleMute"
        >
          <span class="material-symbols-rounded text-[20px]">{{ isMuted ? 'volume_off' : 'volume_up' }}</span>
        </button>
      </div>
      <ul class="max-h-56 overflow-auto py-1">
        <li v-for="(track, index) in BGM_TRACKS" :key="track.path">
          <button
            type="button"
            class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-[#fff8f2]"
            :class="index === currentTrackIndex ? 'bg-[#fff3e7] text-[#b85e25]' : 'text-[#666]'"
            :data-testid="`bgm-track-option-${index}`"
            @click="selectTrack(index)"
          >
            <span
              class="material-symbols-rounded text-[18px]"
              :class="index === currentTrackIndex ? 'text-[#ff7a1a]' : 'text-[#ccc]'"
            >
              {{ index === currentTrackIndex ? 'play_circle' : 'music_note' }}
            </span>
            <span class="min-w-0 flex-1 truncate">{{ track.title }}</span>
          </button>
        </li>
      </ul>
    </div>
  </div>
</template>
