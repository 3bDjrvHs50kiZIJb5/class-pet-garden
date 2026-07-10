<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { getPetLevelImage } from '@/data/pets'
import PetImage from '@/components/PetImage.vue'
import { BADGE_CLASS } from '@/utils/badge'

const props = withDefaults(defineProps<{
  petId: string
  alt?: string
  defaultLevel?: number
  intervalMs?: number
}>(), {
  alt: '',
  defaultLevel: 8,
  intervalMs: 550,
})

const currentLevel = ref(props.defaultLevel)
const isHovering = ref(false)
let timer: ReturnType<typeof setInterval> | null = null

const imageSrc = computed(() => getPetLevelImage(props.petId, currentLevel.value))

function preloadLevels() {
  for (let level = 1; level <= 8; level += 1) {
    const img = new Image()
    img.src = getPetLevelImage(props.petId, level)
  }
}

function clearTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function startCycle() {
  isHovering.value = true
  preloadLevels()
  currentLevel.value = 1
  clearTimer()
  timer = setInterval(() => {
    currentLevel.value = currentLevel.value >= 8 ? 1 : currentLevel.value + 1
  }, props.intervalMs)
}

function stopCycle() {
  isHovering.value = false
  clearTimer()
  currentLevel.value = props.defaultLevel
}

onBeforeUnmount(clearTimer)
</script>

<template>
  <div
    class="relative h-full w-full"
    @mouseenter="startCycle"
    @mouseleave="stopCycle"
  >
    <PetImage
      :src="imageSrc"
      :alt="alt"
      size="full"
      :rounded="false"
      :show-loading="false"
    />
    <Transition name="fade">
      <span
        v-if="isHovering"
        :class="[BADGE_CLASS, 'absolute bottom-2 left-2 bg-white/90 text-[#b86a37] shadow-sm']"
      >
        Lv.{{ currentLevel }}
      </span>
    </Transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
