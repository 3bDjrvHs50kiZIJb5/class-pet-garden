import { ref, computed } from 'vue'

// 全局图片加载状态
const globalLoadedImages = ref<Set<string>>(new Set())

export function useImageLoader() {
  // 本地图片加载状态（用于组件级别）
  const localLoadedImages = ref<Set<string>>(new Set())
  const loadingImages = ref<Set<string>>(new Set())
  const errorImages = ref<Set<string>>(new Set())

  // 检查图片是否已加载
  function isLoaded(src: string): boolean {
    return globalLoadedImages.value.has(src) || localLoadedImages.value.has(src)
  }

  // 检查图片是否正在加载
  function isLoading(src: string): boolean {
    return loadingImages.value.has(src)
  }

  // 检查图片是否加载失败
  function hasError(src: string): boolean {
    return errorImages.value.has(src)
  }

  // 标记图片开始加载
  function startLoading(src: string) {
    loadingImages.value.add(src)
    errorImages.value.delete(src)
  }

  // 标记图片加载完成
  function markLoaded(src: string, global = false) {
    loadingImages.value.delete(src)
    errorImages.value.delete(src)
    
    if (global) {
      globalLoadedImages.value.add(src)
    } else {
      localLoadedImages.value.add(src)
    }
  }

  // 标记图片加载失败
  function markError(src: string) {
    loadingImages.value.delete(src)
    errorImages.value.add(src)
  }

  // 预加载图片
  function preloadImage(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (isLoaded(src)) {
        resolve()
        return
      }

      startLoading(src)
      const img = new Image()
      
      img.onload = () => {
        markLoaded(src, true)
        resolve()
      }
      
      img.onerror = () => {
        markError(src)
        reject(new Error(`Failed to load image: ${src}`))
      }
      
      img.src = src
    })
  }

  // 预加载多张图片
  async function preloadImages(srcs: string[]): Promise<void> {
    await Promise.all(srcs.map(src => preloadImage(src).catch(() => {})))
  }

  // 获取加载进度
  function getLoadProgress(srcs: string[]): number {
    if (srcs.length === 0) return 100
    const loaded = srcs.filter(src => isLoaded(src)).length
    return Math.round((loaded / srcs.length) * 100)
  }

  return {
    isLoaded,
    isLoading,
    hasError,
    startLoading,
    markLoaded,
    markError,
    preloadImage,
    preloadImages,
    getLoadProgress,
    globalLoadedImages: computed(() => globalLoadedImages.value),
    localLoadedImages: computed(() => localLoadedImages.value),
    loadingImages: computed(() => loadingImages.value),
    errorImages: computed(() => errorImages.value)
  }
}

// 可爱的加载动画表情
export const loadingEmojis = {
  paws: ['🐾', '🐾', '🐾'],
  dogs: ['🐕', '🐩', '🦮', '🐕‍🦺'],
  cats: ['🐈', '🐈‍⬛', '🐱'],
  small: ['🐇', '🐹', '🐿️', '🦔'],
  birds: ['🦆', '🐥', '🐤', '🐣'],
  mythical: ['🐉', '🐲', '🦄', '🦅', '🐯'],
  all: ['🐾', '🐕', '🐈', '🐇', '🐹', '🦆', '🦙', '🐼', '🐯', '🦄', '🐉', '🦅']
}

// 随机获取加载表情
export function getRandomLoadingEmoji(category: keyof typeof loadingEmojis = 'all'): string {
  const emojis = loadingEmojis[category] || loadingEmojis.all
  return emojis[Math.floor(Math.random() * emojis.length)]
}

// 获取多个随机表情（用于动画序列）
export function getRandomLoadingEmojis(count: number = 3, category: keyof typeof loadingEmojis = 'all'): string[] {
  const emojis = loadingEmojis[category] || loadingEmojis.all
  const result: string[] = []
  for (let i = 0; i < count; i++) {
    result.push(emojis[Math.floor(Math.random() * emojis.length)])
  }
  return result
}
