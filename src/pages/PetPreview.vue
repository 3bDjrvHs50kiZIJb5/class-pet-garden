<script setup lang="ts">
import { computed, ref } from 'vue'
import { PET_TYPES, getPetLevelImage, type PetType } from '@/data/pets'
import PetImage from '@/components/PetImage.vue'
import PetLevelCycleImage from '@/components/PetLevelCycleImage.vue'
import AppShell from '@/components/AppShell.vue'
import { BADGE_CLASS } from '@/utils/badge'

const MAX_LEVEL = 8
const levelNames = ['初生', '成长', '闪光', '进阶', '稀有', '精英', '史诗', '传说']
const keyword = ref('')
const selectedPet = ref<PetType | null>(null)
const selectedLevel = ref(MAX_LEVEL)

const filteredPets = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return PET_TYPES.filter(pet => !query || pet.name.toLowerCase().includes(query))
})

const normalPets = computed(() => filteredPets.value.filter(pet => pet.category === 'normal'))
const mythicalPets = computed(() => filteredPets.value.filter(pet => pet.category === 'mythical'))
const resultTitle = computed(() => keyword.value.trim() ? '搜索结果' : '所有伙伴')

function selectPet(pet: PetType) {
  selectedPet.value = pet
  selectedLevel.value = MAX_LEVEL
}

function getGalleryDisplayLevel(pet: PetType): number {
  return pet.category === 'mythical' ? MAX_LEVEL : 1
}

function closeDetail() {
  selectedPet.value = null
}
</script>

<template>
  <AppShell active-page="gallery" title="宠物图鉴" eyebrow="PET COMPANIONS">
    <div class="w-full">

      <section class="grid overflow-hidden rounded-[2rem] border border-[#f0e5da] bg-white shadow-[0_12px_40px_rgba(101,71,45,0.06)] lg:grid-cols-[1.25fr_0.75fr]">
        <div class="p-7 sm:p-10">
          <p class="text-sm font-bold tracking-[0.2em] text-[#d78248]">PET COMPANIONS</p>
          <h1 class="mt-3 font-serif text-4xl font-bold tracking-tight text-[#422d20] sm:text-5xl">宠物图鉴</h1>
          <p class="mt-4 max-w-xl text-sm leading-7 text-[#806b5b] sm:text-base">认识每一位会陪伴孩子成长的小伙伴。每一次积极表现，都会点亮它们的新模样。</p>
          <div class="mt-7 flex flex-wrap gap-3">
            <div class="rounded-2xl bg-[#fff3e7] px-4 py-3"><p class="text-xl font-bold text-[#b76129]">{{ PET_TYPES.length }}</p><p class="mt-0.5 text-sm font-medium text-[#9e704f]">可领养伙伴</p></div>
            <div class="rounded-2xl bg-[#fff8f3] px-4 py-3"><p class="text-xl font-bold text-[#b76129]">8</p><p class="mt-0.5 text-sm font-medium text-[#9e704f]">成长阶段</p></div>
            <div class="rounded-2xl bg-[#fff8f3] px-4 py-3"><p class="text-xl font-bold text-[#b76129]">{{ normalPets.length + mythicalPets.length }}</p><p class="mt-0.5 text-sm font-medium text-[#9e704f]">当前显示</p></div>
          </div>
        </div>
        <div class="relative flex min-h-56 items-end justify-center overflow-hidden bg-[#fff4ea] px-8 pb-10 pt-8 sm:pb-14">
          <div class="absolute right-8 top-7 rounded-full bg-white/80 px-3 py-1.5 text-sm font-bold text-[#ae6a3e]">一起长大 ♡</div>
          <div class="absolute bottom-0 h-20 w-[120%] rounded-t-[100%] bg-[#f8e6d4]"></div>
          <div class="relative z-10 flex items-end justify-center gap-4 sm:gap-5">
            <div class="h-32 w-32 overflow-hidden rounded-[2rem] bg-[#fff4ea] sm:h-36 sm:w-36">
              <PetImage :src="getPetLevelImage('corgi', MAX_LEVEL)" alt="柯基" size="full" :rounded="false" :show-loading="false" :hover-scale="false" object-fit="cover" />
            </div>
            <div class="h-32 w-32 overflow-hidden rounded-[2rem] bg-[#fff4ea] sm:h-36 sm:w-36">
              <PetImage :src="getPetLevelImage('lop-rabbit', MAX_LEVEL)" alt="垂耳兔" size="full" :rounded="false" :show-loading="false" :hover-scale="false" object-fit="cover" />
            </div>
          </div>
        </div>
      </section>

      <main class="mt-6">
        <section class="rounded-[1.75rem] border border-[#f0e5da] bg-white p-4 shadow-[0_10px_30px_rgba(101,71,45,0.04)] sm:p-5">
          <div class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p class="text-sm font-bold tracking-[0.16em] text-[#d78248]">COLLECTION</p>
              <h2 class="mt-1 font-serif text-2xl font-bold text-[#422d20]">{{ resultTitle }}</h2>
            </div>
            <label class="flex h-11 items-center gap-2 rounded-xl border border-[#ecdfd4] bg-[#fffdfb] px-3 text-[#a1836d] focus-within:border-orange-300 sm:w-60"><span class="material-symbols-rounded text-[18px] leading-none">search</span><input v-model="keyword" type="search" class="min-w-0 flex-1 bg-transparent text-sm text-[#422d20] outline-none placeholder:text-[#b9a697]" placeholder="搜索宠物名称" aria-label="搜索宠物名称"></label>
          </div>

          <div v-if="filteredPets.length" class="mt-5">
            <template v-for="group in [{ id: 'mythical', title: '神奇伙伴', pets: mythicalPets }, { id: 'normal', title: '小动物伙伴', pets: normalPets }]" :key="group.id">
              <div v-if="group.pets.length" :class="group.id === 'normal' && mythicalPets.length ? 'mt-10 border-t border-[#f3e9e1] pt-8' : ''">
                <div class="mb-4 flex items-center gap-3"><h3 class="text-sm font-bold text-[#795f50]">{{ group.title }}</h3><span class="h-px flex-1 bg-[#f3e9e1]"></span><span class="text-sm text-[#b0927c]">{{ group.pets.length }} 位</span></div>
                <div v-if="group.id === 'mythical'" class="mb-5 flex gap-3 rounded-2xl border border-[#f3e5d4] bg-gradient-to-r from-[#fffaf5] to-[#fff7ed] px-4 py-3.5 sm:items-start">
                  <span class="material-symbols-rounded shrink-0 text-[22px] leading-none text-[#f59e0b]">workspace_premium</span>
                  <div class="min-w-0 flex-1">
                    <p class="text-sm font-bold text-[#7c4a1a]">灵犀计划专属伙伴</p>
                    <p class="mt-1 text-sm leading-6 text-[#9a735d]">神奇伙伴属于灵犀计划专属内容。班级开通 VIP 后，学生才能在工作台领养；未开通前，仍可在此浏览全部成长形态。</p>
                    <router-link to="/vip" class="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-[#c2410c] transition hover:text-[#ea580c]">
                      了解灵犀计划
                      <span class="material-symbols-rounded text-[16px] leading-none">arrow_forward</span>
                    </router-link>
                  </div>
                </div>
                <div class="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
                  <button v-for="pet in group.pets" :key="pet.id" type="button" class="group rounded-2xl border border-[#f2e8e0] bg-[#fffefd] p-2.5 text-left transition hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_12px_22px_rgba(162,95,48,0.1)]" @click="selectPet(pet)">
                    <div class="relative aspect-square rounded-xl bg-[#fff5eb] p-2"><span v-if="pet.category === 'mythical'" :class="[BADGE_CLASS, 'absolute right-2 top-2 z-10 bg-white text-[#ae6b44]']">神兽</span><PetLevelCycleImage :pet-id="pet.id" :alt="pet.name" :default-level="getGalleryDisplayLevel(pet)" /></div>
                    <p class="mt-3 font-bold text-[#4d3527] transition group-hover:text-[#c9692b]">{{ pet.name }}</p><p class="mt-1 text-sm leading-4 text-[#ac9180]">查看成长形态 →</p>
                  </button>
                </div>
              </div>
            </template>
          </div>
          <div v-else class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center"><p class="text-3xl">🔎</p><p class="mt-3 font-bold text-[#75533d]">没有找到这位伙伴</p><button type="button" class="mt-3 text-sm font-semibold text-orange-600 hover:text-orange-700" @click="keyword = ''">清空搜索</button></div>
        </section>
      </main>
    </div>
  </AppShell>

    <Transition>
      <div v-if="selectedPet" class="fixed inset-0 z-50 flex items-end bg-[#38281f]/35 p-0 backdrop-blur-[2px] sm:items-center sm:justify-center sm:p-5" @click.self="closeDetail">
        <section class="max-h-[92vh] w-full max-w-4xl overflow-auto rounded-t-[2rem] bg-white shadow-2xl sm:rounded-[2rem]" role="dialog" aria-modal="true" :aria-label="`${selectedPet.name}成长图鉴`">
          <div class="flex items-center justify-between border-b border-[#f2e8e0] px-5 py-4 sm:px-7"><div><p class="text-sm leading-4 font-bold tracking-[0.16em] text-[#d78248]">GROWTH ALBUM</p><h2 class="mt-1 font-serif text-2xl font-bold text-[#422d20]">{{ selectedPet.name }}</h2></div><button type="button" class="flex h-9 w-9 items-center justify-center rounded-full bg-[#fff4ea] text-[#9a6848] transition hover:bg-orange-100" aria-label="关闭详情" @click="closeDetail"><span class="material-symbols-rounded text-[20px]">close</span></button></div>
          <div class="grid gap-6 p-5 sm:p-7 md:grid-cols-[minmax(0,1fr)_280px]">
            <div class="relative min-h-72 rounded-[1.5rem] bg-[#fff5eb] p-5"><span :class="[BADGE_CLASS, 'absolute left-5 top-5 bg-white text-[#b86a37]']">Lv.{{ selectedLevel }} · {{ levelNames[selectedLevel - 1] }}</span><PetImage :src="getPetLevelImage(selectedPet.id, selectedLevel)" :alt="selectedPet.name" size="full" :rounded="false" :show-loading="true" /></div>
            <div><p class="text-sm font-bold text-[#624434]">成长轨迹</p><p class="mt-2 text-sm leading-6 text-[#947763]">积极表现会积累成长值，让 {{ selectedPet.name }} 解锁更闪亮的新形态。</p><div class="mt-5 grid grid-cols-4 gap-2"><button v-for="level in 8" :key="level" type="button" class="overflow-hidden rounded-xl border p-1.5 transition" :class="selectedLevel === level ? 'border-orange-400 bg-[#fff9f3] ring-2 ring-orange-100' : 'border-[#f1e6dc] hover:border-orange-200'" :aria-label="`查看等级 ${level}`" @click="selectedLevel = level"><div class="aspect-square rounded-lg bg-[#fff5eb]"><PetImage :src="getPetLevelImage(selectedPet.id, level)" size="full" :rounded="false" :show-loading="false" /></div><span class="block pt-1.5 text-center text-sm font-bold text-[#826651]">Lv.{{ level }}</span></button></div><div class="mt-6 rounded-2xl bg-[#fff8f2] p-4"><p class="text-sm font-bold text-[#704a32]">当前：{{ levelNames[selectedLevel - 1] }}</p><p class="mt-1 text-sm leading-5 text-[#a57658]">每一份用心看见，都在帮助孩子成为更好的自己。</p></div></div>
          </div>
        </section>
      </div>
    </Transition>
</template>
