<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import { useBgm } from '@/composables/useBgm'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'

const { initBgm, destroyBgm } = useBgm()
const { api } = useAuth()
const toast = useToast()

onMounted(() => {
  initBgm()
  if (import.meta.env.DEV) {
    void api.get('/health').catch(() => {
      toast.error('未连上后端 API（3002）。请另开终端运行 npm run server，或使用 npm start 同时启动。')
    })
  }
})

onUnmounted(() => {
  destroyBgm()
})
</script>

<template>
  <RouterView />
</template>