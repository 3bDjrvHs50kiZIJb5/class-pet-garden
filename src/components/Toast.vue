<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface Props {
  message: string
  type?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 3000
})

const visible = ref(false)

const icons = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
}

const colors = {
  success: 'from-green-400 to-emerald-500',
  error: 'from-red-400 to-pink-500',
  warning: 'from-yellow-400 to-orange-500',
  info: 'from-blue-400 to-cyan-500'
}

onMounted(() => {
  visible.value = true
  setTimeout(() => {
    visible.value = false
  }, props.duration)
})
</script>

<template>
  <Transition name="toast">
    <div 
      v-if="visible"
      class="fixed top-6 left-1/2 -translate-x-1/2 z-50"
    >
      <div 
        class="px-6 py-4 rounded-2xl shadow-2xl text-white font-medium flex items-center gap-3 min-w-[300px] max-w-[500px]"
        :class="`bg-gradient-to-r ${colors[props.type]}`"
      >
        <span class="text-2xl">{{ icons[props.type] }}</span>
        <span class="text-base">{{ message }}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
</style>
