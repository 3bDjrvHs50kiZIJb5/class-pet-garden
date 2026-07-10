export const BGM_AUTO_PLAY_KEY = 'pet-garden-bgm-auto-play'
export const BGM_MUTED_KEY = 'pet-garden-bgm-muted'

const BGM_TITLE_MAX_WORDS = 3

export function formatTrackTitle(title: string, maxWords = BGM_TITLE_MAX_WORDS): string {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  if (words.length <= maxWords) return words.join(' ')
  return words.slice(0, maxWords).join(' ')
}

export function pickRandomTrackIndex(trackCount: number, excludeIndex = -1): number {
  if (trackCount <= 0) return -1
  if (trackCount === 1) return 0

  let index = 0
  do {
    index = Math.floor(Math.random() * trackCount)
  } while (index === excludeIndex)

  return index
}

export function readBgmAutoPlay(): boolean {
  return localStorage.getItem(BGM_AUTO_PLAY_KEY) !== 'false'
}

export function readBgmMuted(): boolean {
  return localStorage.getItem(BGM_MUTED_KEY) === 'true'
}
