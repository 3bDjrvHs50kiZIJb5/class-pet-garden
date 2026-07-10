import { computed, ref } from 'vue'
import {
  BGM_AUTO_PLAY_KEY,
  BGM_MUTED_KEY,
  formatTrackTitle,
  pickRandomTrackIndex,
  readBgmAutoPlay,
  readBgmMuted,
} from '@/utils/bgm'
import { BGM_TRACKS } from '@/utils/bgmTracks'

export {
  BGM_AUTO_PLAY_KEY,
  BGM_MUTED_KEY,
  formatTrackTitle,
  pickRandomTrackIndex,
  readBgmAutoPlay,
  readBgmMuted,
} from '@/utils/bgm'
export { BGM_TRACKS } from '@/utils/bgmTracks'

const BGM_VOLUME = 0.22

let audio: HTMLAudioElement | null = null
const currentTrackIndex = ref(-1)
let interactionHandlerAttached = false

const autoPlayEnabled = ref(readBgmAutoPlay())
const isMuted = ref(readBgmMuted())
const currentTrackTitle = ref('')
const currentTrackDisplayTitle = computed(() => formatTrackTitle(currentTrackTitle.value))

function persistAutoPlay(enabled: boolean) {
  localStorage.setItem(BGM_AUTO_PLAY_KEY, String(enabled))
}

function persistMuted(muted: boolean) {
  localStorage.setItem(BGM_MUTED_KEY, String(muted))
}

function shouldPlayNow() {
  return autoPlayEnabled.value && !isMuted.value
}

function ensureAudio() {
  if (audio) return audio

  audio = new Audio()
  audio.volume = BGM_VOLUME
  audio.preload = 'auto'
  audio.addEventListener('ended', () => {
    playRandomTrack()
  })

  return audio
}

function playTrackAt(index: number, options?: { forcePlay?: boolean }) {
  if (index < 0 || index >= BGM_TRACKS.length) return

  currentTrackIndex.value = index
  currentTrackTitle.value = BGM_TRACKS[index].title

  const player = ensureAudio()
  player.src = BGM_TRACKS[index].path

  if (!options?.forcePlay && !shouldPlayNow()) return

  player.play().catch(() => {
    attachInteractionResume()
  })
}

function playRandomTrack() {
  if (!shouldPlayNow()) return

  const nextIndex = pickRandomTrackIndex(BGM_TRACKS.length, currentTrackIndex.value)
  if (nextIndex < 0) return

  playTrackAt(nextIndex)
}

function attachInteractionResume() {
  if (interactionHandlerAttached || typeof window === 'undefined') return

  const resume = () => {
    if (!shouldPlayNow()) return
    if (!audio || audio.paused) {
      playRandomTrack()
    } else {
      audio.play().catch(() => {})
    }
    window.removeEventListener('pointerdown', resume)
    interactionHandlerAttached = false
  }

  interactionHandlerAttached = true
  window.addEventListener('pointerdown', resume, { once: true })
}

function pausePlayback() {
  audio?.pause()
}

export function useBgm() {
  function initBgm() {
    autoPlayEnabled.value = readBgmAutoPlay()
    isMuted.value = readBgmMuted()
    currentTrackIndex.value = -1

    if (shouldPlayNow()) {
      playRandomTrack()
    }
  }

  function destroyBgm() {
    if (audio) {
      audio.pause()
      audio.src = ''
      audio = null
    }
    currentTrackIndex.value = -1
    currentTrackTitle.value = ''
    interactionHandlerAttached = false
  }

  function playTrack(index: number) {
    if (isMuted.value) {
      isMuted.value = false
      persistMuted(false)
    }

    playTrackAt(index, { forcePlay: true })
  }

  function toggleMute() {
    isMuted.value = !isMuted.value
    persistMuted(isMuted.value)

    if (isMuted.value) {
      pausePlayback()
      return
    }

    if (autoPlayEnabled.value) {
      playRandomTrack()
    }
  }

  function setAutoPlay(enabled: boolean) {
    autoPlayEnabled.value = enabled
    persistAutoPlay(enabled)

    if (enabled && !isMuted.value) {
      playRandomTrack()
      return
    }

    pausePlayback()
  }

  return {
    autoPlayEnabled,
    isMuted,
    currentTrackTitle,
    currentTrackDisplayTitle,
    currentTrackIndex,
    tracks: BGM_TRACKS,
    initBgm,
    destroyBgm,
    toggleMute,
    setAutoPlay,
    playTrack,
  }
}
