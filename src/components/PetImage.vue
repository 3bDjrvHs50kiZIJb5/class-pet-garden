<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  src: string
  alt?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  rounded?: boolean
  roundedClass?: string
  hoverScale?: boolean
  showLoading?: boolean
  fixedEmojiSize?: boolean
  objectFit?: 'contain' | 'cover'
  loading?: 'lazy' | 'eager'
}

const props = withDefaults(defineProps<Props>(), {
  alt: '',
  size: 'md',
  rounded: true,
  roundedClass: '',
  hoverScale: true,
  showLoading: true,
  fixedEmojiSize: false,
  objectFit: 'contain',
  loading: 'eager'
})

const isLoaded = ref(false)
const hasError = ref(false)

const sizeClasses = computed(() => {
  const sizes: Record<string, string> = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
    full: 'w-full h-full'
  }
  return sizes[props.size] || sizes.md
})

const roundedClass = computed(() => {
  if (props.roundedClass) return props.roundedClass
  return props.rounded ? 'rounded-full' : ''
})

// 根据尺寸调整表情大小
const emojiSizeClass = computed(() => {
  // 如果固定表情大小，使用固定的小尺寸
  if (props.fixedEmojiSize) {
    return 'text-xl'
  }
  const sizes: Record<string, string> = {
    sm: 'text-sm',
    md: 'text-xl',
    lg: 'text-3xl',
    xl: 'text-5xl',
    full: 'text-6xl'
  }
  return sizes[props.size] || sizes.md
})

function onLoad() {
  isLoaded.value = true
}

function onError() {
  hasError.value = true
  isLoaded.value = true
}

// 随机选择加载动画表情
const loadingEmojis = ['🐾', '🐕', '🐈', '🐇', '🐹', '🦆', '🦙', '🐼', '🐯', '🦄', '🐉', '🦅']
const randomEmoji = computed(() => loadingEmojis[Math.floor(Math.random() * loadingEmojis.length)])
</script>

<template>
  <div 
    class="relative overflow-hidden flex items-center justify-center"
    :class="[
      sizeClasses,
      roundedClass
    ]"
  >
    <!-- 加载状态 - 可爱动物爪印动画 -->
    <Transition name="fade">
      <div 
        v-if="showLoading && !isLoaded" 
        class="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-orange-100 to-pink-100"
      >
        <!-- 爪印动画 -->
        <div class="flex flex-col items-center gap-2">
          <span :class="[emojiSizeClass, 'animate-bounce']">{{ randomEmoji }}</span>
          <!-- 爪印轨迹 -->
          <div class="flex gap-1 text-sm">
            <span class="animate-pulse" style="animation-delay: 0ms">🐾</span>
            <span class="animate-pulse" style="animation-delay: 150ms">🐾</span>
            <span class="animate-pulse" style="animation-delay: 300ms">🐾</span>
          </div>
        </div>
      </div>
    </Transition>

    <!-- 错误状态 -->
    <Transition name="fade">
      <div 
        v-if="hasError" 
        class="absolute inset-0 flex items-center justify-center bg-gray-100"
      >
        <span :class="[emojiSizeClass, 'text-gray-400']">🐕</span>
      </div>
    </Transition>

    <!-- 图片 -->
    <img
      :src="src"
      :alt="alt"
      :loading="loading"
      class="w-full h-full transition-opacity duration-300"
      :class="[
        objectFit === 'cover' ? 'object-cover' : 'object-contain',
        isLoaded ? 'opacity-100' : 'opacity-0',
        hoverScale ? 'hover:scale-110' : ''
      ]"
      @load="onLoad"
      @error="onError"
    />
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
