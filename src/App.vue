<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { RouterView } from 'vue-router'
import { useBgm } from '@/composables/useBgm'

const { initBgm, destroyBgm } = useBgm()

onMounted(() => {
  initBgm()
})

onUnmounted(() => {
  destroyBgm()
})
</script>

<template>
  <RouterView />
</template>