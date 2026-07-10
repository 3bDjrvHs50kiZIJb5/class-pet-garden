<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppShell from '@/components/AppShell.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import { useAuth } from '@/composables/useAuth'
import { useToast } from '@/composables/useToast'
import { STUDENTS_IMPORTED_EVENT } from '@/composables/useStudentImport'
import { getCurrentClassStorageKey as buildCurrentClassStorageKey, saveCurrentClassId } from '@/composables/useClassVip'
import type { Class, ClassTask, ClassTaskDetail, Rule, Student, TaskStudentItem } from '@/types'
import { BADGE_CLASS } from '@/utils/badge'

const DEMO_CLASS_ID = 'demo-class-2026'

const { api, user } = useAuth()
const toast = useToast()
const route = useRoute()
const router = useRouter()

const classes = ref<Class[]>([])
const currentClass = ref<Class | null>(null)
const isDemoMode = ref(false)
const rules = ref<Rule[]>([])
const students = ref<Student[]>([])
const tasks = ref<ClassTask[]>([])
const loading = ref(true)
const statusFilter = ref<'active' | 'closed' | 'all'>('active')

const showCreateModal = ref(false)
const editingTask = ref<ClassTask | null>(null)
const detailTask = ref<ClassTaskDetail | null>(null)
const detailLoading = ref(false)
const detailSearch = ref('')
const selectedStudentIds = ref<Set<string>>(new Set())
const completing = ref(false)
const studentListRef = ref<HTMLElement | null>(null)

const formTitle = ref('')
const formDescription = ref('')
const formRuleId = ref('')
const formDeadline = ref('')
const formTargetType = ref<'all' | 'selected'>('all')
const formTargetStudentIds = ref<string[]>([])
const saving = ref(false)

const mockTaskTemplates = [
  {
    title: '今日晨读打卡',
    description: '早读认真专注，完成可获积分',
    ruleName: '遵守纪律',
    deadlineDays: 0,
    targetType: 'all' as const,
  },
  {
    title: '整理书包',
    description: '放学前整理好书包和课桌',
    ruleName: '遵守纪律',
    deadlineDays: 0,
    targetType: 'all' as const,
  },
  {
    title: '课堂举手发言',
    description: '积极举手回答问题，至少一次',
    ruleName: '课堂积极发言',
    deadlineDays: 0,
    targetType: 'all' as const,
  },
  {
    title: '今日作业提交',
    description: '按时上交各科作业',
    ruleName: '作业完成优秀',
    deadlineDays: 0,
    targetType: 'all' as const,
  },
  {
    title: '周五值日',
    description: '认真完成包干区打扫',
    ruleName: '主动打扫卫生',
    deadlineDays: 7,
    targetType: 'selected' as const,
    selectedCount: 3,
  },
  {
    title: '帮助同学',
    description: '主动帮助有困难的同学',
    ruleName: '帮助同学',
    deadlineDays: 3,
    targetType: 'selected' as const,
    selectedCount: 2,
  },
  {
    title: '一周运动打卡',
    description: '完成本周体育锻炼记录',
    ruleName: '坚持运动',
    deadlineDays: 7,
    targetType: 'all' as const,
  },
]

const confirmDialog = ref({
  show: false,
  title: '确认',
  message: '',
  confirmText: '确认',
  cancelText: '取消',
  type: 'warning' as 'info' | 'warning' | 'danger',
  onConfirm: () => {}
})

function currentClassStorageKey() {
  return buildCurrentClassStorageKey(user.value?.id)
}

function requestConfigForCurrentClass() {
  return isDemoMode.value ? { headers: { Authorization: 'Bearer guest' } } : undefined
}

function formatDeadline(ts: number | null) {
  if (!ts) return '无截止时间'
  const date = new Date(ts)
  return date.toLocaleString('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function statusLabel(status: string) {
  if (status === 'active') return '进行中'
  if (status === 'closed') return '已结束'
  return '已归档'
}

function statusClass(status: string) {
  if (status === 'active') return 'bg-emerald-50 text-emerald-700'
  if (status === 'closed') return 'bg-slate-100 text-slate-600'
  return 'bg-amber-50 text-amber-700'
}

const filteredDetailStudents = computed(() => {
  if (!detailTask.value) return []
  const query = detailSearch.value.trim().toLowerCase()
  return detailTask.value.students.filter(student => {
    if (!query) return true
    return `${student.name} ${student.student_no || ''}`.toLowerCase().includes(query)
  })
})

const detailProgressPercent = computed(() => {
  if (!detailTask.value?.totalCount) return 0
  return Math.round((detailTask.value.completedCount || 0) / detailTask.value.totalCount * 100)
})

const taskStats = computed(() => ({
  total: tasks.value.length,
  active: tasks.value.filter(task => task.status === 'active').length,
  closed: tasks.value.filter(task => task.status === 'closed').length,
  pendingSlots: tasks.value.reduce(
    (sum, task) => sum + Math.max((task.totalCount || 0) - (task.completedCount || 0), 0),
    0
  )
}))

function showConfirm(options: {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'warning' | 'danger'
  onConfirm: () => void | Promise<void>
}) {
  confirmDialog.value = {
    show: true,
    title: options.title,
    message: options.message,
    confirmText: options.confirmText || '确认',
    cancelText: options.cancelText || '取消',
    type: options.type || 'warning',
    onConfirm: async () => {
      confirmDialog.value.show = false
      await options.onConfirm()
    }
  }
}

async function loadClasses() {
  const res = await api.get('/classes')
  classes.value = res.data.classes || []
  if (!classes.value.length) {
    currentClass.value = null
    return
  }
  const savedClassId = localStorage.getItem(currentClassStorageKey())
  const savedClass = savedClassId ? classes.value.find(c => c.id === savedClassId) : null
  await selectClass(savedClass || classes.value[0])
}

async function selectClass(cls: Class) {
  isDemoMode.value = cls.id === DEMO_CLASS_ID
  currentClass.value = cls
  saveCurrentClassId(cls.id, user.value?.id)
  detailTask.value = null
  selectedStudentIds.value = new Set()
  await Promise.all([loadTasks(), loadStudents(), loadRules()])
}

async function loadRules() {
  const res = await api.get('/rules')
  rules.value = res.data.rules || []
}

async function loadStudents() {
  if (!currentClass.value) return
  const res = await api.get(`/classes/${currentClass.value.id}/students`, requestConfigForCurrentClass())
  students.value = res.data.students || []
}

async function loadTasks() {
  if (!currentClass.value) return
  loading.value = true
  try {
    const res = await api.get('/tasks', {
      params: { classId: currentClass.value.id, status: statusFilter.value },
      ...requestConfigForCurrentClass()
    })
    tasks.value = res.data.tasks || []
  } catch (error) {
    console.error('加载任务失败:', error)
    toast.error('加载任务失败')
  } finally {
    loading.value = false
  }
}

function openCreateModal() {
  editingTask.value = null
  formTitle.value = ''
  formDescription.value = ''
  formRuleId.value = rules.value.find(r => r.points > 0)?.id || ''
  const today = new Date()
  today.setHours(23, 59, 0, 0)
  formDeadline.value = today.toISOString().slice(0, 16)
  formTargetType.value = 'all'
  formTargetStudentIds.value = []
  showCreateModal.value = true
}

function findRuleIdByName(name: string) {
  const rule = rules.value.find(item => item.name === name)
  if (rule) return rule.id
  return rules.value.find(item => item.points > 0)?.id || rules.value[0]?.id || ''
}

function fillMockTask() {
  const template = mockTaskTemplates[Math.floor(Math.random() * mockTaskTemplates.length)]
  formTitle.value = template.title
  formDescription.value = template.description
  formRuleId.value = findRuleIdByName(template.ruleName)

  const deadline = new Date()
  deadline.setDate(deadline.getDate() + template.deadlineDays)
  deadline.setHours(23, 59, 0, 0)
  formDeadline.value = deadline.toISOString().slice(0, 16)

  formTargetType.value = template.targetType
  if (template.targetType === 'selected' && students.value.length) {
    const count = Math.min(template.selectedCount || 3, students.value.length)
    const picked = [...students.value].sort(() => Math.random() - 0.5).slice(0, count)
    formTargetStudentIds.value = picked.map(student => student.id)
  } else {
    formTargetStudentIds.value = []
  }

  toast.success(`已填充模拟任务：${template.title}`)
}

function openEditModal(task: ClassTask) {
  editingTask.value = task
  formTitle.value = task.title
  formDescription.value = task.description || ''
  formRuleId.value = task.rule_id
  formDeadline.value = task.deadline ? new Date(task.deadline).toISOString().slice(0, 16) : ''
  formTargetType.value = task.target_type
  formTargetStudentIds.value = task.target_student_ids ? [...task.target_student_ids] : []
  showCreateModal.value = true
}

async function saveTask() {
  if (!currentClass.value || !formTitle.value.trim() || !formRuleId.value) {
    toast.warning('请填写任务标题并选择评价规则')
    return
  }
  if (formTargetType.value === 'selected' && !formTargetStudentIds.value.length) {
    toast.warning('请至少选择一名学生')
    return
  }

  saving.value = true
  const deadline = formDeadline.value ? new Date(formDeadline.value).getTime() : null
  const payload = {
    classId: currentClass.value.id,
    title: formTitle.value.trim(),
    description: formDescription.value.trim() || null,
    ruleId: formRuleId.value,
    deadline,
    targetType: formTargetType.value,
    targetStudentIds: formTargetType.value === 'selected' ? formTargetStudentIds.value : []
  }

  try {
    if (editingTask.value) {
      await api.put(`/tasks/${editingTask.value.id}`, payload, requestConfigForCurrentClass())
      toast.success('任务已更新')
    } else {
      await api.post('/tasks', payload, requestConfigForCurrentClass())
      toast.success('任务已创建')
    }
    showCreateModal.value = false
    await loadTasks()
    if (detailTask.value && editingTask.value?.id === detailTask.value.id) {
      await openTaskDetail(editingTask.value.id, { silent: true })
    }
  } catch (error: any) {
    console.error('保存任务失败:', error)
    toast.error(error.response?.data?.error || '保存任务失败')
  } finally {
    saving.value = false
  }
}

async function openTaskDetail(taskId: string, options: { silent?: boolean } = {}) {
  const { silent = false } = options
  const savedScrollTop = silent ? studentListRef.value?.scrollTop ?? 0 : 0

  if (!silent) {
    detailLoading.value = true
    selectedStudentIds.value = new Set()
  }

  try {
    const res = await api.get(`/tasks/${taskId}`, requestConfigForCurrentClass())
    detailTask.value = res.data
    if (!silent) {
      router.replace({ query: { taskId } })
    } else {
      await nextTick()
      if (studentListRef.value) {
        studentListRef.value.scrollTop = savedScrollTop
      }
    }
  } catch (error) {
    console.error('加载任务详情失败:', error)
    toast.error('加载任务详情失败')
  } finally {
    if (!silent) {
      detailLoading.value = false
    }
  }
}

function closeTaskDetail() {
  detailTask.value = null
  selectedStudentIds.value = new Set()
  router.replace({ query: {} })
}

async function closeTask(task: ClassTask) {
  showConfirm({
    title: '结束任务',
    message: `确定结束「${task.title}」吗？结束后将无法继续标记完成。`,
    confirmText: '结束任务',
    onConfirm: async () => {
      await api.post(`/tasks/${task.id}/close`, {}, requestConfigForCurrentClass())
      toast.success('任务已结束')
      await loadTasks()
      if (detailTask.value?.id === task.id) {
        await openTaskDetail(task.id, { silent: true })
      }
    }
  })
}

function toggleStudentSelection(studentId: string) {
  const next = new Set(selectedStudentIds.value)
  if (next.has(studentId)) next.delete(studentId)
  else next.add(studentId)
  selectedStudentIds.value = next
}

function toggleFormStudent(studentId: string) {
  const ids = [...formTargetStudentIds.value]
  const index = ids.indexOf(studentId)
  if (index >= 0) ids.splice(index, 1)
  else ids.push(studentId)
  formTargetStudentIds.value = ids
}

async function markStudentComplete(student: TaskStudentItem) {
  if (!detailTask.value || detailTask.value.status !== 'active') return

  if (student.completed) {
    showConfirm({
      title: '撤销完成',
      message: `确定撤销「${student.name}」的完成记录吗？关联积分将回退。`,
      type: 'warning',
      onConfirm: async () => {
        await api.delete(`/tasks/${detailTask.value!.id}/complete/${student.id}`, requestConfigForCurrentClass())
        toast.success('已撤销完成')
        await Promise.all([openTaskDetail(detailTask.value!.id, { silent: true }), loadTasks()])
      }
    })
    return
  }

  completing.value = true
  try {
    const res = await api.post(
      `/tasks/${detailTask.value.id}/complete`,
      { studentIds: [student.id] },
      requestConfigForCurrentClass()
    )
    const result = res.data.results?.[0]
    if (result?.skipped) {
      toast.warning(result.reason || '未能标记完成')
    } else {
      toast.success(`${student.name} 已完成任务`)
      if (result?.evaluation?.graduated) {
        toast.success(`🎓 恭喜！${student.name} 的宠物毕业了！`)
      }
    }
    await Promise.all([openTaskDetail(detailTask.value.id, { silent: true }), loadTasks()])
  } catch (error: any) {
    toast.error(error.response?.data?.error || '标记完成失败')
  } finally {
    completing.value = false
  }
}

async function batchComplete() {
  if (!detailTask.value || !selectedStudentIds.value.size) return
  const pendingIds = [...selectedStudentIds.value].filter(id => {
    const student = detailTask.value!.students.find(s => s.id === id)
    return student && !student.completed
  })
  if (!pendingIds.length) {
    toast.warning('所选学生均已完成')
    return
  }

  completing.value = true
  try {
    const res = await api.post(
      `/tasks/${detailTask.value.id}/complete`,
      { studentIds: pendingIds },
      requestConfigForCurrentClass()
    )
    const successCount = (res.data.results || []).filter((r: { skipped: boolean }) => !r.skipped).length
    toast.success(`已为 ${successCount} 名学生标记完成`)
    selectedStudentIds.value = new Set()
    await Promise.all([openTaskDetail(detailTask.value.id, { silent: true }), loadTasks()])
  } catch (error: any) {
    toast.error(error.response?.data?.error || '批量完成失败')
  } finally {
    completing.value = false
  }
}

watch(statusFilter, () => {
  loadTasks()
})

async function handleStudentsImported() {
  await loadStudents()
}

onMounted(async () => {
  window.addEventListener(STUDENTS_IMPORTED_EVENT, handleStudentsImported)
  try {
    await loadClasses()
    const taskId = route.query.taskId as string | undefined
    if (taskId) {
      await openTaskDetail(taskId)
    }
  } catch (error) {
    console.error('初始化失败:', error)
  }
})

onUnmounted(() => {
  window.removeEventListener(STUDENTS_IMPORTED_EVENT, handleStudentsImported)
})
</script>

<template>
  <AppShell active-page="tasks" title="班级任务" eyebrow="CLASS TASKS">
    <div class="w-full">
      <section class="grid overflow-hidden rounded-[2rem] border border-[#f0e5da] bg-white shadow-[0_12px_40px_rgba(101,71,45,0.06)] lg:grid-cols-[1.25fr_0.75fr]">
        <div class="p-7 sm:p-10">
          <p class="text-sm font-bold tracking-[0.2em] text-[#d78248]">CLASS TASKS</p>
          <h1 class="mt-3 font-serif text-4xl font-bold tracking-tight text-[#422d20] sm:text-5xl">班级任务</h1>
          <p class="mt-4 whitespace-nowrap text-sm text-[#806b5b] sm:text-base">
            发布可追踪目标，学生完成后自动按规则加分。适合晨读打卡、值日安排、作业提交等班级日常管理。
          </p>
          <div class="mt-7 flex flex-wrap gap-3">
            <div class="rounded-2xl bg-[#fff3e7] px-4 py-3">
              <p class="text-xl font-bold text-[#b76129]">{{ taskStats.total }}</p>
              <p class="mt-0.5 text-sm font-medium text-[#9e704f]">当前列表</p>
            </div>
            <div class="rounded-2xl bg-[#ecfdf5] px-4 py-3">
              <p class="text-xl font-bold text-[#059669]">{{ taskStats.active }}</p>
              <p class="mt-0.5 text-sm font-medium text-[#6b8f7d]">进行中</p>
            </div>
            <div class="rounded-2xl bg-[#fff1f2] px-4 py-3">
              <p class="text-xl font-bold text-[#e11d48]">{{ taskStats.closed }}</p>
              <p class="mt-0.5 text-sm font-medium text-[#b07a84]">已结束</p>
            </div>
            <div class="rounded-2xl bg-[#f5f3ff] px-4 py-3">
              <p class="text-xl font-bold text-[#7c3aed]">{{ taskStats.pendingSlots }}</p>
              <p class="mt-0.5 text-sm font-medium text-[#8b7cb0]">待完成</p>
            </div>
          </div>
        </div>
        <div class="relative hidden min-h-56 items-center justify-center overflow-hidden bg-[#fff4ea] px-8 lg:flex">
          <div class="absolute right-8 top-7 rounded-full bg-white/80 px-3 py-1.5 text-sm font-bold text-[#ae6a3e]">自动加分</div>
          <div class="absolute bottom-0 h-20 w-[120%] rounded-t-[100%] bg-[#f8e6d4]"></div>
          <div class="relative z-10 grid grid-cols-2 gap-3">
            <div class="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_8px_20px_rgba(170,103,53,0.1)]">
              <span class="material-symbols-rounded text-[22px] text-[#d97706]">assignment</span>
              <span class="text-sm font-bold text-[#4d3527]">发布任务</span>
            </div>
            <div class="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_8px_20px_rgba(170,103,53,0.1)]">
              <span class="material-symbols-rounded text-[22px] text-[#059669]">task_alt</span>
              <span class="text-sm font-bold text-[#4d3527]">标记完成</span>
            </div>
            <div class="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_8px_20px_rgba(170,103,53,0.1)]">
              <span class="material-symbols-rounded text-[22px] text-[#2563eb]">health_and_safety</span>
              <span class="text-sm font-bold text-[#4d3527]">绑定规则</span>
            </div>
            <div class="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-[0_8px_20px_rgba(170,103,53,0.1)]">
              <span class="material-symbols-rounded text-[22px] text-[#7c3aed]">emoji_events</span>
              <span class="text-sm font-bold text-[#4d3527]">积分奖励</span>
            </div>
          </div>
        </div>
      </section>

      <main class="mt-6">
        <section class="rounded-[1.75rem] border border-[#f0e5da] bg-white p-4 shadow-[0_10px_30px_rgba(101,71,45,0.04)] sm:p-5">
          <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p class="text-sm font-bold tracking-[0.16em] text-[#d78248]">TASK LIST</p>
              <h2 class="mt-1 font-serif text-2xl font-bold text-[#422d20]">任务列表</h2>
              <p v-if="currentClass" class="mt-1 text-sm text-[#9a735d]">当前班级：{{ currentClass.name }}</p>
            </div>
            <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
              <button
                type="button"
                class="inline-flex h-11 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#ea580c] px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c2410c] disabled:opacity-50"
                :disabled="!currentClass"
                @click="openCreateModal"
              >
                <span class="material-symbols-rounded text-[18px] leading-none">add</span>
                新建任务
              </button>
              <label
                v-if="classes.length > 1"
                class="flex h-11 items-center gap-2 rounded-xl border border-[#ecdfd4] bg-[#fffdfb] px-3 text-[#a1836d] focus-within:border-orange-300 sm:w-44"
              >
                <span class="material-symbols-rounded text-[18px] leading-none">school</span>
                <select
                  class="min-w-0 flex-1 bg-transparent text-sm text-[#422d20] outline-none"
                  :value="currentClass?.id"
                  @change="selectClass(classes.find(c => c.id === ($event.target as HTMLSelectElement).value)!)"
                >
                  <option v-for="cls in classes" :key="cls.id" :value="cls.id">{{ cls.name }}</option>
                </select>
              </label>
              <div class="flex gap-1.5">
                <button
                  v-for="item in [{ id: 'active', label: '进行中' }, { id: 'closed', label: '已结束' }, { id: 'all', label: '全部' }]"
                  :key="item.id"
                  type="button"
                  class="rounded-full border px-3 py-1.5 text-sm font-semibold transition"
                  :class="statusFilter === item.id ? 'border-[#ff9f1c] bg-[#ff9f1c] text-white' : 'border-[#ededed] bg-white text-[#666]'"
                  @click="statusFilter = item.id as typeof statusFilter"
                >
                  {{ item.label }}
                </button>
              </div>
            </div>
          </div>

          <div v-if="!classes.length" class="mt-5 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center">
            <span class="material-symbols-rounded text-[40px] text-[#e8c9ae]">assignment</span>
            <p class="mt-3 text-sm font-medium text-[#75533d]">还没有班级，无法发布任务</p>
            <router-link to="/" class="mt-3 inline-flex text-sm font-semibold text-orange-600 hover:text-orange-700">前往工作台创建班级</router-link>
          </div>

          <div v-else class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <section class="space-y-3">
              <div v-if="loading" class="rounded-2xl bg-[#fff8f2] px-5 py-14 text-center text-sm text-[#a1836d]">加载中…</div>
              <div v-else-if="!tasks.length" class="rounded-2xl bg-[#fff8f2] px-5 py-14 text-center">
                <span class="material-symbols-rounded text-[40px] text-[#e8c9ae]">task_alt</span>
                <p class="mt-3 text-sm font-medium text-[#75533d]">还没有任务</p>
                <p class="mt-1 text-sm text-[#9a735d]">发布第一个任务，例如「今日晨读」「整理书包」</p>
                <button type="button" class="mt-4 rounded-xl bg-[#ff5c00] px-4 py-2 text-sm font-bold text-white" @click="openCreateModal">新建任务</button>
              </div>
              <article
                v-for="task in tasks"
                :key="task.id"
                class="cursor-pointer rounded-xl border border-[#f3ece4] bg-[#fffdfb] p-4 transition hover:-translate-y-0.5 hover:shadow-[0_8px_20px_rgba(101,71,45,0.06)]"
                :class="detailTask?.id === task.id ? 'ring-2 ring-orange-300' : ''"
                @click="openTaskDetail(task.id)"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2">
                      <h3 class="text-lg font-bold text-[#333]">{{ task.title }}</h3>
                      <span :class="[BADGE_CLASS, statusClass(task.status)]">{{ statusLabel(task.status) }}</span>
                    </div>
                    <p v-if="task.description" class="mt-1 text-sm text-[#888]">{{ task.description }}</p>
                    <p class="mt-2 text-sm text-[#666]">
                      <span v-if="task.rule">{{ task.rule.name }}（{{ task.rule.points > 0 ? '+' : '' }}{{ task.rule.points }}）</span>
                      <span class="mx-2 text-[#ddd]">·</span>
                      {{ formatDeadline(task.deadline) }}
                    </p>
                  </div>
                  <div class="text-right">
                    <p class="font-mono text-2xl font-extrabold text-[#ff7a1a]">{{ task.completedCount }}/{{ task.totalCount }}</p>
                    <p class="text-sm text-[#999]">完成进度</p>
                  </div>
                </div>
                <div class="mt-3 h-2 overflow-hidden rounded-full bg-[#f3f0ec]">
                  <div
                    class="h-full rounded-full bg-[#ff9f1c] transition-all"
                    :style="{ width: `${task.totalCount ? Math.round((task.completedCount || 0) / task.totalCount * 100) : 0}%` }"
                  ></div>
                </div>
              </article>
            </section>

            <aside class="rounded-xl border border-[#f3ece4] bg-[#fffdfb] p-4 xl:sticky xl:top-5 xl:self-start">
              <div v-if="!detailTask && !detailLoading" class="py-12 text-center text-sm text-[#999]">
                <span class="material-symbols-rounded text-4xl text-[#ddd]">touch_app</span>
                <p class="mt-3">点击左侧任务查看详情并标记完成</p>
              </div>
              <div v-else-if="detailLoading" class="py-12 text-center text-sm text-[#999]">加载详情...</div>
              <template v-else-if="detailTask">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="text-sm font-bold tracking-wider text-orange-600">TASK DETAIL</p>
                <h2 class="mt-1 font-serif text-xl font-bold">{{ detailTask.title }}</h2>
              </div>
              <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100" @click="closeTaskDetail">
                <span class="material-symbols-rounded text-[20px]">close</span>
              </button>
            </div>

            <p v-if="detailTask.description" class="mt-2 text-sm text-[#888]">{{ detailTask.description }}</p>
            <div class="mt-3 flex flex-wrap gap-2">
              <span :class="[BADGE_CLASS, 'bg-[#fff0e2] text-[#b85e25]']">{{ statusLabel(detailTask.status) }}</span>
              <span v-if="detailTask.rule" :class="[BADGE_CLASS, 'bg-emerald-50 text-emerald-700']">
                {{ detailTask.rule.name }} {{ detailTask.rule.points > 0 ? '+' : '' }}{{ detailTask.rule.points }}
              </span>
              <span :class="[BADGE_CLASS, 'bg-slate-100 text-slate-600']">{{ formatDeadline(detailTask.deadline) }}</span>
            </div>

            <div class="mt-4">
              <div class="flex items-center justify-between text-sm">
                <span class="font-semibold text-[#666]">完成进度</span>
                <span class="font-mono font-bold text-[#ff7a1a]">{{ detailTask.completedCount }}/{{ detailTask.totalCount }}（{{ detailProgressPercent }}%）</span>
              </div>
              <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-[#f3f0ec]">
                <div class="h-full rounded-full bg-[#ff9f1c]" :style="{ width: `${detailProgressPercent}%` }"></div>
              </div>
            </div>

            <div v-if="detailTask.status === 'active'" class="mt-4 flex flex-wrap gap-2">
              <button type="button" class="rounded-xl border border-[#edeff2] px-3 py-2 text-sm font-semibold text-[#666]" @click="openEditModal(detailTask)">编辑</button>
              <button type="button" class="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-600" @click="closeTask(detailTask)">结束任务</button>
              <button
                type="button"
                class="rounded-xl bg-[#ff5c00] px-3 py-2 text-sm font-bold text-white disabled:opacity-50"
                :disabled="!selectedStudentIds.size || completing"
                @click="batchComplete"
              >
                批量完成（{{ selectedStudentIds.size }}）
              </button>
            </div>

            <label class="mt-4 flex h-10 items-center gap-2 rounded-xl border border-[#edeff2] bg-[#fffaf5] px-3 text-sm text-[#888]">
              <span class="material-symbols-rounded text-[18px]">search</span>
              <input v-model="detailSearch" type="search" placeholder="搜索学生" class="min-w-0 flex-1 bg-transparent outline-none" />
            </label>

            <div ref="studentListRef" class="mt-3 max-h-[420px] space-y-2 overflow-auto">
              <button
                v-for="student in filteredDetailStudents"
                :key="student.id"
                type="button"
                class="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition"
                :class="[
                  student.completed ? 'border-emerald-200 bg-emerald-50/60' : 'border-[#f0e7dd] bg-white hover:bg-[#fffaf5]',
                  selectedStudentIds.has(student.id) && !student.completed ? 'ring-2 ring-orange-300' : ''
                ]"
                :disabled="completing"
                @click="detailTask.status === 'active' && !student.completed ? toggleStudentSelection(student.id) : undefined"
                @dblclick="markStudentComplete(student)"
              >
                <span
                  class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold"
                  :class="student.completed ? 'bg-emerald-100 text-emerald-700' : 'bg-[#fff0e2] text-[#b85e25]'"
                >
                  {{ student.completed ? '✓' : student.name.slice(0, 1) }}
                </span>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-bold">{{ student.name }}</p>
                  <p class="text-sm text-[#999]">
                    <template v-if="student.student_no">学号 {{ student.student_no }} · </template>
                    {{ student.completed ? `已完成 · ${formatDeadline(student.completedAt)}` : '未完成' }}
                  </p>
                </div>
                <button
                  v-if="detailTask.status === 'active'"
                  type="button"
                  class="shrink-0 rounded-lg px-2.5 py-1 text-sm font-bold"
                  :class="student.completed ? 'bg-white text-rose-500' : 'bg-[#ff5c00] text-white'"
                  @click.stop="markStudentComplete(student)"
                >
                  {{ student.completed ? '撤销' : '完成' }}
                </button>
              </button>
            </div>
            <p class="mt-2 text-center text-sm text-[#bbb]">单击选中 · 双击或点按钮标记完成</p>
          </template>
            </aside>
          </div>
        </section>
      </main>
    </div>

    <Transition>
      <div v-if="showCreateModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4">
        <div class="max-h-[90vh] w-full max-w-lg overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
          <div class="flex items-center justify-between">
            <h2 class="font-serif text-2xl font-bold">{{ editingTask ? '编辑任务' : '新建任务' }}</h2>
            <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100" @click="showCreateModal = false">
              <span class="material-symbols-rounded text-[20px]">close</span>
            </button>
          </div>

          <div class="mt-5 space-y-4">
            <label class="block">
              <span class="text-sm font-semibold text-[#666]">任务标题</span>
              <input v-model="formTitle" type="text" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400" placeholder="例如：今日晨读打卡" />
            </label>

            <label class="block">
              <span class="text-sm font-semibold text-[#666]">绑定评价规则</span>
              <select v-model="formRuleId" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400" :disabled="!!editingTask && (editingTask.completedCount || 0) > 0">
                <option v-for="rule in rules" :key="rule.id" :value="rule.id">{{ rule.category }} · {{ rule.name }}（{{ rule.points > 0 ? '+' : '' }}{{ rule.points }}）</option>
              </select>
            </label>

            <label class="block">
              <span class="text-sm font-semibold text-[#666]">说明（可选）</span>
              <input v-model="formDescription" type="text" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400" placeholder="一句话说明任务要求" />
            </label>

            <label class="block">
              <span class="text-sm font-semibold text-[#666]">截止时间（可选）</span>
              <input v-model="formDeadline" type="datetime-local" class="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400" />
            </label>

            <div>
              <span class="text-sm font-semibold text-[#666]">面向对象</span>
              <div class="mt-2 flex gap-2">
                <button type="button" class="rounded-full px-4 py-2 text-sm font-semibold" :class="formTargetType === 'all' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'" :disabled="!!editingTask && (editingTask.completedCount || 0) > 0" @click="formTargetType = 'all'">全班</button>
                <button type="button" class="rounded-full px-4 py-2 text-sm font-semibold" :class="formTargetType === 'selected' ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'" :disabled="!!editingTask && (editingTask.completedCount || 0) > 0" @click="formTargetType = 'selected'">指定学生</button>
              </div>
            </div>

            <div v-if="formTargetType === 'selected'" class="max-h-40 space-y-1 overflow-auto rounded-xl border border-slate-200 p-2">
              <label v-for="student in students" :key="student.id" class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                <input type="checkbox" :checked="formTargetStudentIds.includes(student.id)" @change="toggleFormStudent(student.id)" />
                <span class="text-sm">{{ student.name }}</span>
                <span v-if="student.student_no" class="text-sm text-[#999]">{{ student.student_no }}</span>
              </label>
            </div>
          </div>

          <div class="mt-6 flex items-center gap-2">
            <button
              v-if="!editingTask"
              type="button"
              class="mr-auto rounded-xl border border-dashed border-orange-300 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-600 transition hover:bg-orange-100"
              @click="fillMockTask"
            >
              一键生成模拟任务
            </button>
            <div class="ml-auto flex gap-2">
              <button type="button" class="px-4 py-2 text-sm" @click="showCreateModal = false">取消</button>
              <button type="button" class="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50" :disabled="saving" @click="saveTask">
                {{ saving ? '保存中...' : editingTask ? '保存修改' : '创建任务' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>

    <ConfirmDialog
      :show="confirmDialog.show"
      :title="confirmDialog.title"
      :message="confirmDialog.message"
      :confirm-text="confirmDialog.confirmText"
      :cancel-text="confirmDialog.cancelText"
      :type="confirmDialog.type"
      @confirm="confirmDialog.onConfirm"
      @cancel="confirmDialog.show = false"
    />
  </AppShell>
</template>
