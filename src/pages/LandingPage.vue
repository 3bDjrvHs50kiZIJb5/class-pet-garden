<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { prefetchDemoGarden } from '@/utils/demoPrefetch'

const router = useRouter()

const LANDING_HEADLINES = [
  '孩子的专属宠物，言行驱动成长。',
  '老师轻点评分，学生宠物同步成长。',
  '一声表扬，一只宠物，一份看得见的成长。',
] as const

const landingHeadline = ref(
  LANDING_HEADLINES[Math.floor(Math.random() * LANDING_HEADLINES.length)]!,
)

function openDemoDashboard() {
  prefetchDemoGarden()
  router.push({ name: 'dashboard', query: { demo: '1' } })
}

onMounted(() => {
  prefetchDemoGarden()
})
</script>

<template>
  <div class="min-h-screen overflow-hidden bg-white font-sans text-[#1a1a1a]">
    <section class="flex items-center justify-center px-5 pt-16 pb-8 sm:px-8 sm:pb-10">
      <div class="flex w-full max-w-[860px] flex-col items-center text-center">
        <div class="flex h-[34px] items-center justify-center gap-2 rounded-full bg-[#fff3ec] px-4">
          <span class="h-2 w-2 rounded-full bg-[#ff5c00]"></span>
          <span class="font-brand text-sm font-bold text-[#ff5c00]">班级宠物园</span>
        </div>
        <h1 class="mt-[22px] max-w-[820px] font-serif text-5xl font-bold leading-[0.98] text-[#1a1a1a] sm:text-[68px]">{{ landingHeadline }}</h1>
        <p class="mt-[22px] max-w-[660px] text-base leading-[1.45] text-[#666] sm:text-xl">老师快速加分，学生的宠物随习惯一起升级。</p>
        <div class="mt-[22px] flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            class="font-brand h-12 rounded-full bg-[#ff5c00] px-8 text-[15px] font-bold text-white shadow-[0_16px_40px_rgba(0,0,0,0.07)] transition hover:bg-[#e95300]"
            @mouseenter="prefetchDemoGarden"
            @focus="prefetchDemoGarden"
            @click="openDemoDashboard"
          >进入演示班级</button>
          <router-link to="/register" class="font-brand inline-flex h-12 items-center rounded-full border border-[#ff5c00] bg-white px-8 text-[15px] font-bold text-[#ff5c00] transition hover:bg-[#fff3ec]">我是老师，创建新班级</router-link>
        </div>
        <div class="mt-[22px] flex h-[86px] w-full max-w-[420px] items-center justify-center gap-[18px] rounded-xl border border-[#f3f4f6] bg-white px-[18px] py-[14px] text-left shadow-[0_16px_40px_rgba(0,0,0,0.07)]">
          <div class="relative h-[58px] w-[58px] shrink-0 rounded-xl bg-[#fff3ec]">
            <span class="absolute left-[15px] top-[14px] h-7 w-7 rounded-full bg-[#ff8533]"></span>
            <span class="absolute left-3 top-[10px] h-2.5 w-2.5 rounded-full bg-[#ff8533]"></span>
            <span class="absolute right-3 top-[10px] h-2.5 w-2.5 rounded-full bg-[#ff8533]"></span>
          </div>
          <div class="min-w-0">
            <p class="font-brand text-sm font-bold text-[#1a1a1a]">评价一次，成长一点</p>
            <p class="mt-1 text-sm leading-5 text-[#888]">积分、等级、徽章都围绕学生的日常表现。</p>
          </div>
        </div>
      </div>
    </section>

    <section class="flex flex-col items-center justify-center gap-[18px] px-5 py-10 sm:h-[700px] sm:px-8 lg:h-auto lg:min-h-[820px] lg:gap-6 lg:py-14">
      <div class="text-center">
        <p class="font-brand text-sm leading-5 font-semibold text-[#ff5c00]">产品截图</p>
        <h2 class="mt-4 font-serif text-3xl font-bold leading-[1.05] text-[#1a1a1a] sm:text-[34px]">把喂养、成长与班级记录放在同一屏。</h2>
      </div>
      <div class="flex w-full max-w-[1040px] items-center justify-center rounded-xl border border-[#f3f4f6] bg-white p-3 shadow-[0_16px_40px_rgba(0,0,0,0.07)] sm:h-[590px] sm:p-4 lg:max-w-[1180px] lg:h-[660px] lg:p-5 xl:max-w-[1280px] xl:h-[720px]">
        <img src="/class-pet-garden-product.png" alt="班级宠物园产品截图" class="w-full rounded-lg sm:h-full sm:object-contain" loading="lazy" decoding="async" />
      </div>
    </section>

    <section class="relative flex min-h-[230px] flex-col items-center justify-center gap-5 px-5 py-12 sm:px-8">
      <span class="absolute left-[18%] top-[42px] h-[7px] w-[7px] rounded-full bg-[#ff8533]"></span>
      <span class="absolute right-[18%] top-[40px] text-base text-[#ff5c00]">✦</span>
      <span class="absolute bottom-[34px] left-[24%] h-1 w-[18px] rotate-[-18deg] rounded-full bg-[#ff5c00]"></span>
      <div class="text-center">
        <p class="font-brand text-sm leading-5 font-semibold text-[#ff5c00]">CLASS PET GARDEN</p>
        <h2 class="mt-4 font-serif text-3xl font-bold leading-[1.05] text-[#1a1a1a] sm:text-[34px]">让班级反馈，变成孩子看得见的成长</h2>
      </div>
      <div class="flex w-full max-w-[900px] flex-col gap-6 md:flex-row md:items-center md:gap-6">
        <article class="flex flex-1 items-center gap-3"><div class="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#fff3eb] text-[#ff5c00]"><span class="material-symbols-rounded text-[20px]">rate_review</span></div><div><h3 class="text-[17px] font-[650]">快速评价</h3><p class="font-brand mt-1 text-sm leading-[1.25] text-[#666]">老师轻点完成课堂反馈</p></div></article>
        <div class="hidden h-12 w-px bg-[#f3f4f6] md:block"></div>
        <article class="flex flex-1 items-center gap-3"><div class="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#fff3eb] text-[#ff5c00]"><span class="material-symbols-rounded text-[20px]">pets</span></div><div><h3 class="text-[17px] font-[650]">宠物成长</h3><p class="font-brand mt-1 text-sm leading-[1.25] text-[#666]">每次进步都喂养专属小宠物</p></div></article>
        <div class="hidden h-12 w-px bg-[#f3f4f6] md:block"></div>
        <article class="flex flex-1 items-center gap-3"><div class="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-[#fff3eb] text-[#ff5c00]"><span class="material-symbols-rounded text-[20px]">emoji_events</span></div><div><h3 class="text-[17px] font-[650]">班级荣誉</h3><p class="font-brand mt-1 text-sm leading-[1.25] text-[#666]">把个人努力汇成班级勋章</p></div></article>
      </div>
    </section>

    <footer class="flex h-[210px] items-center justify-center bg-[#f7f8fa] px-5 text-center sm:px-8">
      <div class="flex flex-col items-center gap-[14px]">
        <h2 class="font-serif text-3xl font-bold text-[#1a1a1a] sm:text-[34px]">先从一个班级开始。</h2>
        <div class="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-base">
          <span class="text-[#666]">导入学生，设置评价规则，让成长被看见。</span>
          <button type="button" class="font-brand font-bold text-[#ff5c00] underline-offset-2 transition hover:text-[#e95300] hover:underline" @click="openDemoDashboard">进入演示班级</button>
          <span class="text-[#ccc]">·</span>
          <router-link to="/register" class="font-brand font-bold text-[#ff5c00] underline-offset-2 transition hover:text-[#e95300] hover:underline">我是老师，创建新班级</router-link>
        </div>
        <p class="font-brand text-sm text-[#888]">© 2026 班级宠物园。保留所有权利。</p>
      </div>
    </footer>
  </div>
</template>
