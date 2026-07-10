<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getRandomLoadingEmojis } from '@/composables/useImageLoader'

interface Props {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  text?: string
  showPawTrail?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  text: '加载中...',
  showPawTrail: true
})

const sizeClasses = computed(() => {
  const sizes: Record<string, string> = {
    sm: 'text-2xl',
    md: 'text-4xl',
    lg: 'text-6xl',
    xl: 'text-8xl'
  }
  return sizes[props.size] || sizes.md
})

const emojis = ref<string[]>([])

onMounted(() => {
  emojis.value = getRandomLoadingEmojis(3)
})
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4">
    <!-- 主动画区域 -->
    <div class="relative" :class="sizeClasses">
      <!-- 跳跃的动物 -->
      <div class="animate-bounce">
        {{ emojis[0] || '🐾' }}
      </div>
      
      <!-- 爪印轨迹 -->
      <template v-if="showPawTrail">
        <div class="absolute -bottom-2 left-1/2 -translate-x-1/2 flex gap-2">
          <span 
            v-for="(_, index) in emojis.slice(1)" 
            :key="index"
            class="text-lg opacity-60 animate-pulse"
            :style="{ animationDelay: `${index * 200}ms` }"
          >
            🐾
          </span>
        </div>
      </template>
    </div>
    
    <!-- 文字 -->
    <div v-if="text" class="text-gray-500 font-medium flex items-center gap-2">
      <span>{{ text }}</span>
      <span class="flex gap-1">
        <span class="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style="animation-delay: 0ms"></span>
        <span class="w-2 h-2 bg-pink-400 rounded-full animate-bounce" style="animation-delay: 150ms"></span>
        <span class="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style="animation-delay: 300ms"></span>
      </span>
    </div>
  </div>
</template>

<style scoped>
/* 自定义弹跳动画 */
@keyframes bounce-custom {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-20%) scale(1.1);
  }
}

.animate-bounce {
  animation: bounce-custom 1s ease-in-out infinite;
}
</style>
