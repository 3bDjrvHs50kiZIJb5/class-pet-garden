<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useAuth } from '@/composables/useAuth'
import { CURRENT_CLASS_CHANGED_EVENT, useClassVip } from '@/composables/useClassVip'
import { useStudentImport, STUDENTS_IMPORTED_EVENT } from '@/composables/useStudentImport'

const route = useRoute()
const { isAdmin } = useAuth()
const { currentClassVipActive, refreshClassVipStatus } = useClassVip()
const showVipEntry = computed(() => !currentClassVipActive.value)

withDefaults(defineProps<{
  activePage: 'dashboard' | 'gallery' | 'rules' | 'records' | 'ranking' | 'vip' | 'tasks' | 'manage'
  eyebrow?: string
  title?: string
  navigationDimmed?: boolean
}>(), {
  eyebrow: 'CLASS PET GARDEN',
  title: '班级宠物园',
  navigationDimmed: false
})

const {
  showImportModal,
  importText,
  importing,
  importClasses,
  selectedImportClassId,
  showCreateClassInline,
  newImportClassName,
  creatingClass,
  showImportConfirm,
  importConfirmMessage,
  showImportStudents,
  refreshCurrentClassStudentCount,
  openImportModal,
  closeImportModal,
  selectImportClass,
  createClassInImport,
  requestImportStudents,
  cancelImportConfirm,
  confirmImportStudents
} = useStudentImport()

const navigationBeforeImport = computed(() => [
  { id: 'dashboard', label: '工作台', icon: 'dashboard', to: '/' }
])

const navigationAfterImport = computed(() => [
  { id: 'gallery', label: '宠物图鉴', icon: 'pets', to: '/preview' },
  { id: 'rules', label: '评价规则', icon: 'health_and_safety', to: '/rules' },
  { id: 'records', label: '喂养记录', icon: 'restaurant', to: '/records' },
  { id: 'tasks', label: '班级任务', icon: 'assignment', to: '/tasks' }
])

const navigation = computed(() => [...navigationBeforeImport.value, ...navigationAfterImport.value])

function handleStudentsImported() {
  void refreshCurrentClassStudentCount()
  void refreshClassVipStatus()
}

function handleCurrentClassChanged() {
  void refreshClassVipStatus()
}

onMounted(() => {
  void refreshCurrentClassStudentCount()
  void refreshClassVipStatus()
  window.addEventListener(STUDENTS_IMPORTED_EVENT, handleStudentsImported)
  window.addEventListener(CURRENT_CLASS_CHANGED_EVENT, handleCurrentClassChanged)
})

onUnmounted(() => {
  window.removeEventListener(STUDENTS_IMPORTED_EVENT, handleStudentsImported)
  window.removeEventListener(CURRENT_CLASS_CHANGED_EVENT, handleCurrentClassChanged)
})

watch(() => route.path, () => {
  void refreshClassVipStatus()
})
</script>

<template>
  <div class="min-h-screen bg-[#fffaf5] font-sans text-[#38281f]">
    <header class="sticky top-0 z-40 border-b border-[#f1e5db] bg-[#fffdfb]/95 px-4 py-3 backdrop-blur transition-all duration-300 sm:px-6 lg:hidden" :class="navigationDimmed ? 'opacity-40 grayscale pointer-events-none select-none' : ''">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <router-link :to="{ path: '/', query: { landing: '1' } }" class="flex min-w-0 items-center gap-2.5">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#ffe7c8] text-xl text-[#d97706]">🐾</span>
          <span class="min-w-0"><span class="block truncate font-serif text-lg font-bold text-[#422d20]">{{ title }}</span><span class="block truncate text-sm text-[#9a735d]">{{ eyebrow }}</span></span>
        </router-link>
        <router-link to="/preview" class="flex h-10 items-center rounded-xl bg-[#fff1e6] px-3 text-sm font-semibold text-[#b85e25]">图鉴</router-link>
      </div>
    </header>

    <div class="mx-auto flex max-w-[1728px] gap-5 px-3 pb-3 pt-3 lg:px-5 lg:pb-5 lg:pt-5">
      <aside class="sticky top-3 hidden h-[calc(100vh-24px)] w-60 shrink-0 flex-col rounded-[1.75rem] border border-[#f1e5db] bg-[#fffdf9] p-4 shadow-[0_12px_36px_rgba(116,76,45,0.07)] transition-all duration-300 lg:top-5 lg:flex lg:h-[calc(100vh-40px)]" :class="navigationDimmed ? 'opacity-40 grayscale pointer-events-none select-none' : ''">
        <router-link :to="{ path: '/', query: { landing: '1' } }" class="flex min-w-0 items-center gap-3 px-2 py-2">
          <span class="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#ffe7c8] text-[#d97706] shadow-sm"><span class="material-symbols-rounded text-[24px]">pets</span></span>
          <span class="min-w-0 flex-1"><span class="block truncate font-serif text-xl font-bold text-[#422d20]">{{ title }}</span><span class="mt-0.5 block truncate text-sm font-semibold leading-none tracking-[0.05em] text-[#b58b70]">{{ eyebrow }}</span></span>
        </router-link>

        <nav class="mt-5 space-y-1.5" aria-label="主导航">
          <router-link v-for="item in navigationBeforeImport" :key="item.id" :to="item.to" class="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition" :class="activePage === item.id ? 'bg-[#fff0e2] text-[#b85e25] shadow-[inset_0_0_0_1px_rgba(234,151,86,0.18)]' : 'text-[#765f50] hover:bg-[#fff7f1] hover:text-[#b85e25]'">
            <span class="material-symbols-rounded text-[20px] leading-none">{{ item.icon }}</span>{{ item.label }}
          </router-link>
          <button v-if="showImportStudents" type="button" class="flex min-h-11 w-full items-center gap-3 rounded-2xl px-3 text-left text-sm font-semibold text-[#765f50] transition hover:bg-[#fff7f1] hover:text-[#b85e25]" @click="() => openImportModal()">
            <span class="material-symbols-rounded text-[20px] leading-none">upload</span>导入学生
          </button>
          <router-link v-for="item in navigationAfterImport" :key="item.id" :to="item.to" class="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition" :class="activePage === item.id ? 'bg-[#fff0e2] text-[#b85e25] shadow-[inset_0_0_0_1px_rgba(234,151,86,0.18)]' : 'text-[#765f50] hover:bg-[#fff7f1] hover:text-[#b85e25]'">
            <span class="material-symbols-rounded text-[20px] leading-none">{{ item.icon }}</span>{{ item.label }}
          </router-link>
          <router-link to="/ranking" class="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition" :class="activePage === 'ranking' ? 'bg-[#fff0e2] text-[#b85e25] shadow-[inset_0_0_0_1px_rgba(234,151,86,0.18)]' : 'text-[#765f50] hover:bg-[#fff7f1] hover:text-[#b85e25]'"><span class="material-symbols-rounded text-[20px] leading-none">emoji_events</span>班级排行榜</router-link>
          <router-link v-if="showVipEntry" to="/vip" class="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition" :class="activePage === 'vip' ? 'bg-[#fff0e2] text-[#b85e25] shadow-[inset_0_0_0_1px_rgba(234,151,86,0.18)]' : 'text-[#765f50] hover:bg-[#fff7f1] hover:text-[#b85e25]'"><span class="material-symbols-rounded text-[20px] leading-none">workspace_premium</span>灵犀计划</router-link>
          <router-link v-if="isAdmin" to="/manage" class="flex min-h-11 items-center gap-3 rounded-2xl px-3 text-sm font-semibold transition" :class="activePage === 'manage' ? 'bg-[#fff0e2] text-[#b85e25] shadow-[inset_0_0_0_1px_rgba(234,151,86,0.18)]' : 'text-[#765f50] hover:bg-[#fff7f1] hover:text-[#b85e25]'"><span class="material-symbols-rounded text-[20px] leading-none">manage_accounts</span>系统管理</router-link>
        </nav>

        <router-link
          v-if="showVipEntry"
          to="/vip"
          class="group mt-auto block overflow-hidden rounded-3xl bg-[#fff3e8] p-3 transition hover:bg-[#ffe8d4] hover:shadow-[0_8px_24px_rgba(154,90,43,0.12)]"
          aria-label="前往灵犀计划"
        >
          <img src="/companion-effect-crop.png" alt="灵犀计划陪伴插画" class="h-24 w-full rounded-2xl object-cover transition group-hover:scale-[1.02]" />
          <p class="mt-3 flex items-center gap-1 text-sm font-bold text-[#9a5a2b]">
            <span class="material-symbols-rounded text-[16px] leading-none text-[#f59e0b]">workspace_premium</span>
            灵犀计划 · 相伴成长
          </p>
          <p class="mt-1 text-sm leading-5 text-[#b27558]">开通后可领养神兽伙伴，解锁更多班级专属能力</p>
        </router-link>
      </aside>

      <div class="min-w-0 flex-1 pb-20 lg:pb-0">
        <slot />
      </div>
    </div>

    <Transition>
      <div v-if="showImportModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/30 p-4">
        <div class="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <h2 class="font-serif text-2xl font-bold">批量导入学生</h2>
              <p class="mt-2 text-sm text-slate-500">每行一位学生。可只写姓名；若有学号，姓名与学号可用空格、逗号、分号或制表符分隔。</p>
            </div>
            <button
              type="button"
              class="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-orange-200 bg-[#fff7ed] px-3 text-sm font-semibold text-[#c2410c] transition hover:bg-[#ffedd5]"
              @click="showCreateClassInline = !showCreateClassInline"
            >
              <span class="material-symbols-rounded text-[18px] leading-none">add</span>
              创建班级
            </button>
          </div>

          <div v-if="showCreateClassInline" class="mt-4 flex flex-col gap-2 rounded-xl border border-dashed border-orange-200 bg-[#fffaf5] p-3 sm:flex-row">
            <input
              v-model="newImportClassName"
              type="text"
              class="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-orange-400"
              placeholder="例如：三年二班"
              @keyup.enter="createClassInImport"
            />
            <button
              type="button"
              class="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              :disabled="creatingClass"
              @click="createClassInImport"
            >
              {{ creatingClass ? '创建中…' : '确认创建' }}
            </button>
          </div>

          <label v-if="importClasses.length" class="mt-4 flex h-11 items-center gap-2 rounded-xl border border-[#ecdfd4] bg-[#fffdfb] px-3 text-[#a1836d] focus-within:border-orange-300">
            <span class="material-symbols-rounded text-[18px] leading-none">school</span>
            <span class="shrink-0 text-sm font-semibold text-[#9a735d]">导入到</span>
            <select
              class="min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#422d20] outline-none"
              :value="selectedImportClassId"
              @change="selectImportClass(($event.target as HTMLSelectElement).value)"
            >
              <option v-for="cls in importClasses" :key="cls.id" :value="cls.id">{{ cls.name }}</option>
            </select>
          </label>
          <p v-else class="mt-4 rounded-xl bg-[#fff8f2] px-4 py-3 text-sm text-[#9a735d]">还没有班级，请先点击右上角「创建班级」。</p>

          <textarea
            v-model="importText"
            class="mt-4 h-48 w-full rounded-xl border border-slate-200 p-4 font-mono text-sm outline-none focus:border-orange-400"
            placeholder="张三, 01&#10;李四, 02&#10;王五"
          />

          <div class="mt-5 flex justify-end gap-2">
            <button type="button" class="px-4 py-2 text-sm" @click="closeImportModal">取消</button>
            <button
              type="button"
              class="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              :disabled="importing || !selectedImportClassId"
              @click="requestImportStudents"
            >
              {{ importing ? '导入中…' : '导入学生' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <ConfirmDialog
      :show="showImportConfirm"
      title="确认导入"
      :message="importConfirmMessage"
      confirm-text="确认导入"
      cancel-text="再检查一下"
      type="warning"
      @confirm="confirmImportStudents"
      @cancel="cancelImportConfirm"
    />

    <nav class="fixed inset-x-3 bottom-3 z-40 grid grid-cols-6 rounded-2xl border border-[#f1e5db] bg-white/95 p-1.5 shadow-[0_12px_36px_rgba(116,76,45,0.16)] backdrop-blur transition-all duration-300 lg:hidden" :class="navigationDimmed ? 'opacity-40 grayscale pointer-events-none select-none' : ''" aria-label="移动导航">
      <router-link v-for="item in navigation.slice(0, 4)" :key="item.id" :to="item.to" class="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-sm font-semibold leading-tight" :class="activePage === item.id ? 'bg-[#fff0e2] text-[#b85e25]' : 'text-[#8c7464]'"><span class="material-symbols-rounded text-[18px] leading-none">{{ item.icon }}</span>{{ item.label === '喂养记录' ? '记录' : item.label === '评价规则' ? '规则' : item.label === '宠物图鉴' ? '图鉴' : '工作台' }}</router-link>
      <router-link to="/tasks" class="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-sm font-semibold leading-tight" :class="activePage === 'tasks' ? 'bg-[#fff0e2] text-[#b85e25]' : 'text-[#8c7464]'"><span class="material-symbols-rounded text-[18px] leading-none">assignment</span>任务</router-link>
      <router-link to="/ranking" class="flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-xl text-sm font-semibold leading-tight" :class="activePage === 'ranking' ? 'bg-[#fff0e2] text-[#b85e25]' : 'text-[#8c7464]'"><span class="material-symbols-rounded text-[18px] leading-none">emoji_events</span>排行</router-link>
    </nav>
  </div>
</template>
