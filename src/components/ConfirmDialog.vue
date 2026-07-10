<script setup lang="ts">
interface Props {
  show: boolean
  title?: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'warning' | 'danger'
}

withDefaults(defineProps<Props>(), {
  title: '确认',
  confirmText: '确认',
  cancelText: '取消',
  type: 'info'
})

const emit = defineEmits<{
  confirm: []
  cancel: []
}>()

const colors = {
  info: 'from-blue-400 to-cyan-500',
  warning: 'from-yellow-400 to-orange-500',
  danger: 'from-red-400 to-pink-500'
}

const icons = {
  info: 'ℹ️',
  warning: '⚠️',
  danger: '🗑️'
}
</script>

<template>
  <Transition name="modal">
    <div v-if="show" class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" @click.self="emit('cancel')">
      <div class="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
        <div class="flex items-center gap-3 mb-4">
          <span class="text-3xl">{{ icons[type] }}</span>
          <h3 class="text-xl font-bold text-gray-800">{{ title }}</h3>
        </div>
        
        <p class="text-gray-600 text-lg mb-8">{{ message }}</p>
        
        <div class="flex gap-3 justify-end">
          <button 
            @click="emit('cancel')" 
            class="px-6 py-3 text-gray-500 hover:text-gray-700 font-medium transition-colors rounded-xl hover:bg-gray-100"
          >
            {{ cancelText }}
          </button>
          <button 
            @click="emit('confirm')" 
            class="text-white px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all"
            :class="`bg-gradient-to-r ${colors[type]}`"
          >
            {{ confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from > div,
.modal-leave-to > div {
  opacity: 0;
  transform: scale(0.95);
}

.modal-enter-to > div,
.modal-leave-from > div {
  opacity: 1;
  transform: scale(1);
}
</style>
