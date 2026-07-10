<script setup lang="ts">
import { computed } from 'vue'
import { useToast } from '@/composables/useToast'

interface Props {
  // 老师推荐链接的 ref 值（老师 id），有则展示老师邀请老师入口
  referralCode?: string | null
  // 班级邀请码，有则展示学生加入入口
  classCode?: string | null
  className?: string | null
}

const props = withDefaults(defineProps<Props>(), {
  referralCode: null,
  classCode: null,
  className: null
})

const toast = useToast()

const origin = computed(() => window.location.origin)

const referralLink = computed(() =>
  props.referralCode ? `${origin.value}/pet-garden/?ref=${props.referralCode}` : ''
)

const joinLink = computed(() =>
  props.classCode ? `${origin.value}/pet-garden/join/${props.classCode}` : ''
)

const teacherShareText = computed(() =>
  `我们班在用「班级宠物园」管积分，学生领养宠物超积极，你也来试试 👉 ${referralLink.value}`
)

const studentShareText = computed(() =>
  `快来加入${props.className ? `「${props.className}」` : '我们班'}的班级宠物园，选一只宠物一起养成 👉 ${joinLink.value}`
)

async function copy(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text)
    toast.success(`${label}已复制，去粘贴分享吧`)
  } catch {
    toast.error('复制失败，请手动复制')
  }
}
</script>

<template>
  <div class="space-y-4">
    <!-- 老师邀请老师 -->
    <div v-if="referralCode" class="bg-white rounded-2xl p-5 shadow-md">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-2xl">🧑‍🏫</span>
        <h4 class="font-bold text-gray-800">邀请同事一起用</h4>
      </div>
      <div class="flex items-center gap-2 mb-3">
        <input
          :value="referralLink"
          readonly
          class="flex-1 min-w-0 bg-gray-50 border-2 border-gray-100 rounded-xl px-3 py-2 text-sm text-gray-600"
        />
        <button
          @click="copy(referralLink, '邀请链接')"
          class="shrink-0 px-4 py-2 bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
        >
          复制链接
        </button>
      </div>
      <button
        @click="copy(teacherShareText, '分享文案')"
        class="text-sm text-orange-500 hover:text-orange-600 font-medium"
      >
        复制分享文案
      </button>
    </div>

    <!-- 学生加入领养 -->
    <div v-if="classCode" class="bg-white rounded-2xl p-5 shadow-md">
      <div class="flex items-center gap-2 mb-3">
        <span class="text-2xl">🎒</span>
        <h4 class="font-bold text-gray-800">邀请学生加入领养</h4>
      </div>
      <div class="flex items-center gap-3 mb-3">
        <div class="text-sm text-gray-500">班级邀请码</div>
        <div class="text-2xl font-bold tracking-widest text-gradient">{{ classCode }}</div>
      </div>
      <div class="flex items-center gap-2 mb-3">
        <input
          :value="joinLink"
          readonly
          class="flex-1 min-w-0 bg-gray-50 border-2 border-gray-100 rounded-xl px-3 py-2 text-sm text-gray-600"
        />
        <button
          @click="copy(joinLink, '加入链接')"
          class="shrink-0 px-4 py-2 bg-gradient-to-r from-orange-400 to-pink-500 text-white rounded-xl font-medium hover:shadow-lg transition-all"
        >
          复制链接
        </button>
      </div>
      <button
        @click="copy(studentShareText, '分享文案')"
        class="text-sm text-orange-500 hover:text-orange-600 font-medium"
      >
        复制分享文案
      </button>
    </div>
  </div>
</template>
