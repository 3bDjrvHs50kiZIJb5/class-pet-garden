import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const BGM_AUTO_PLAY_KEY = 'pet-garden-bgm-auto-play'
const BGM_MUTED_KEY = 'pet-garden-bgm-muted'
const BGM_TITLE_MAX_WORDS = 3

function formatTrackTitle(title, maxWords = BGM_TITLE_MAX_WORDS) {
  const words = title.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return ''
  if (words.length <= maxWords) return words.join(' ')
  return words.slice(0, maxWords).join(' ')
}

function pickRandomTrackIndex(trackCount, excludeIndex = -1) {
  if (trackCount <= 0) return -1
  if (trackCount === 1) return 0

  let index = 0
  do {
    index = Math.floor(Math.random() * trackCount)
  } while (index === excludeIndex)

  return index
}

function readBgmAutoPlay() {
  return localStorage.getItem(BGM_AUTO_PLAY_KEY) !== 'false'
}

function readBgmMuted() {
  return localStorage.getItem(BGM_MUTED_KEY) === 'true'
}

describe('bgm helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('picks a different random track when possible', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.74)

    expect(pickRandomTrackIndex(4, 3)).toBe(2)
    expect(pickRandomTrackIndex(1, 0)).toBe(0)
    expect(pickRandomTrackIndex(0)).toBe(-1)
  })

  it('defaults auto play to enabled and muted to false', () => {
    expect(readBgmAutoPlay()).toBe(true)
    expect(readBgmMuted()).toBe(false)
  })

  it('reads persisted bgm preferences', () => {
    localStorage.setItem(BGM_AUTO_PLAY_KEY, 'false')
    localStorage.setItem(BGM_MUTED_KEY, 'true')

    expect(readBgmAutoPlay()).toBe(false)
    expect(readBgmMuted()).toBe(true)
  })

  it('shortens long track titles to the first few words', () => {
    expect(formatTrackTitle('Carefree')).toBe('Carefree')
    expect(formatTrackTitle('Friendly Town')).toBe('Friendly Town')
    expect(formatTrackTitle('Puzzle Game Loop Bright Casual Video Game Music')).toBe('Puzzle Game Loop')
    expect(formatTrackTitle('Cute Cheerful Whistle Music')).toBe('Cute Cheerful Whistle')
  })
})
