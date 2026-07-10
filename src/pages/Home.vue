<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { PET_TYPES, getPetType, getLevelProgress, calculateLevel, getPetLevelImage, getPetLevel1Image, isMythicalPet, type PetType } from '@/data/pets'
import PetImage from '@/components/PetImage.vue'
import AppShell from '@/components/AppShell.vue'
import GrowthAreaChart from '@/components/GrowthAreaChart.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'
import RankListRow from '@/components/ranking/RankListRow.vue'
import { useToast } from '@/composables/useToast'
import { useAuth } from '@/composables/useAuth'
import { useLandingGate } from '@/composables/useLandingGate'
import { useStudentImport, STUDENTS_IMPORTED_EVENT, setCurrentClassStudentCount } from '@/composables/useStudentImport'
import { getSavedClassId, saveCurrentClassId, useClassVip } from '@/composables/useClassVip'
import { sortRanking } from '@/utils/ranking'
import { BADGE_CLASS } from '@/utils/badge'
import type { TeacherProfile } from '@/types'

const { openImportModal } = useStudentImport()
const { currentClassVipActive, refreshClassVipStatus } = useClassVip()

// Types
interface Class {
  id: string
  name: string
  created_at: number
}

interface Student {
  id: string
  class_id: string
  name: string
  student_no: string | null
  total_points: number
  pet_type: string | null
  pet_level: number
  pet_exp: number
}

// Toast 提示
const toast = useToast()

// 用户认证
const { isGuest, username, logout, api, user } = useAuth()
const { shouldShowLanding } = useLandingGate()
const route = useRoute()
const router = useRouter()

// 教师资料弹窗
const showTeacherProfile = ref(false)
const teacherProfileLoading = ref(false)
const teacherProfile = ref<TeacherProfile | null>(null)

interface Rule {
  id: string
  name: string
  points: number
  category: string
  is_custom?: boolean
}

// State
const classes = ref<Class[]>([])
const currentClass = ref<Class | null>(null)
const students = ref<Student[]>([])
const rules = ref<Rule[]>([])
const searchQuery = ref('')

// Modals
const showClassModal = ref(false)
const showStudentModal = ref(false)
const showAddModal = ref(false)
const showPetModal = ref(false)
const newClassName = ref('')
const editingClass = ref<Class | null>(null)
const newStudentName = ref('')
const newStudentNo = ref('')
const selectedStudent = ref<Student | null>(null)
const evaluationRecords = ref<any[]>([])
const todayEvaluationCount = ref(0)
const weeklyChartRecords = ref<any[]>([])
const selectedEvalTab = ref('学习')
const stampMode = ref(false)
const activeStampRule = ref<Rule | null>(null)
const stampEvalTab = ref('学习')
const showClassMenu = ref(false)
const showStudentMenu = ref(false)
const showEvalMenu = ref(false)
const showDeleteStudentMode = ref(false)
const deleteStudentList = ref<string[]>([])
const recordsPage = ref(1)
const recordsPageSize = 20
const totalRecords = ref(0)
const sortBy = ref<'name' | 'studentNo' | 'progress' | 'points'>('studentNo')
const sortOrder = ref<'asc' | 'desc'>('asc')
const studentDisplayOrder = ref<string[]>([])
const showSortMenu = ref(false)
const showPetMenu = ref(false)
const showAllStudents = ref(false)
const studentViewMode = ref<'grid' | 'list'>('grid')
const cardEvalFilterPositive = ref<boolean | null>(null)
const isRefreshing = ref(false)
const showLanding = ref(true)
const isDemoMode = ref(false)
const DEMO_CLASS_ID = 'demo-class-2026'

interface ActiveTaskSummary {
  id: string
  title: string
  completedCount?: number
  totalCount?: number
  status: string
}

const activeTasks = ref<ActiveTaskSummary[]>([])

function isPetAdoptionLocked(pet: PetType) {
  return isMythicalPet(pet.id) && !currentClassVipActive.value
}

function enterGarden() {
  showLanding.value = false
}

function formatProfileDate(timestamp?: number) {
  if (!timestamp) return '未知'
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

async function openTeacherProfile() {
  showTeacherProfile.value = true
  teacherProfileLoading.value = true
  try {
    const res = await api.get('/auth/me')
    teacherProfile.value = res.data
  } catch (error) {
    console.error('加载教师信息失败:', error)
    toast.error('加载账号信息失败')
    showTeacherProfile.value = false
  } finally {
    teacherProfileLoading.value = false
  }
}

function closeTeacherProfile() {
  showTeacherProfile.value = false
}

async function switchClassFromProfile(summary: { id: string; name: string }) {
  if (summary.id === currentClass.value?.id) return

  let cls = classes.value.find(item => item.id === summary.id)
  if (!cls) {
    await loadClasses()
    cls = classes.value.find(item => item.id === summary.id)
  }
  if (!cls) {
    toast.warning('班级不存在或已删除')
    return
  }

  await selectClass(cls)
  closeTeacherProfile()
}

async function handleTeacherLogout() {
  closeTeacherProfile()
  logout()
  router.push('/login')
}

function requestConfigForCurrentClass() {
  return isDemoMode.value
    ? { headers: { Authorization: 'Bearer guest' } }
    : undefined
}

async function enterDemoGarden() {
  try {
    const res = await api.get('/classes/demo', { headers: { Authorization: 'Bearer guest' } })
    const demoClass = res.data.class as Class
    isDemoMode.value = true
    showAllStudents.value = false
    classes.value = [demoClass, ...classes.value.filter(cls => cls.id !== demoClass.id)]
    currentClass.value = demoClass
    students.value = res.data.students || []
    setCurrentClassStudentCount(students.value.length)
    applyStudentSort()
    saveCurrentClassId(demoClass.id, user.value?.id)
    evaluationRecords.value = res.data.records || []
    totalRecords.value = res.data.total || evaluationRecords.value.length
    todayEvaluationCount.value = evaluationRecords.value.length
    enterGarden()
    const [rulesResult, recordsResult, chartResult] = await Promise.allSettled([
      loadRules(),
      loadEvaluationRecords(),
      loadWeeklyChartRecords()
    ])
    if (rulesResult.status === 'rejected') {
      console.error('加载演示规则失败:', rulesResult.reason)
    }
    if (recordsResult.status === 'rejected') {
      console.error('加载演示评价记录失败:', recordsResult.reason)
    }
    if (chartResult.status === 'rejected') {
      console.error('加载演示周趋势失败:', chartResult.reason)
    }
  } catch (error) {
    console.error('加载演示班级失败:', error)
    toast.error('演示班级暂时无法加载，请稍后重试')
  }
}

// 确认对话框状态
const confirmDialog = ref({
  show: false,
  title: '确认',
  message: '',
  confirmText: '确认',
  cancelText: '取消',
  type: 'info' as 'info' | 'warning' | 'danger',
  onConfirm: () => {}
})

// 通用确认函数
function showConfirm(options: {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  type?: 'info' | 'warning' | 'danger'
  onConfirm: () => void
}) {
  confirmDialog.value = {
    show: true,
    title: options.title,
    message: options.message,
    confirmText: options.confirmText || '确认',
    cancelText: options.cancelText || '取消',
    type: options.type || 'info',
    onConfirm: () => {
      options.onConfirm()
      confirmDialog.value.show = false
    }
  }
}

// 图片加载状态（用于升级动画）
const levelUpImagesLoaded = ref({ prev: false, current: false })
const levelUpPhase = ref<'show-prev' | 'transition' | 'show-current'>('show-prev')

// 动画状态
const showLevelUpAnimation = ref(false)
const levelUpInfo = ref({ name: '', level: 0, petType: '', prevLevel: 0 })
const isLoaded = ref(false)
const isLoading = ref(true)

// 图片加载状态
const imageLoaded = ref<Record<string, boolean>>({})

// 详情面板
const showDetailPanel = ref(false)
const detailStudent = ref<Student | null>(null)
const detailEvalTab = ref('学习')

// 评分动效
const scoreAnimations = ref<Map<string, { points: number, show: boolean }>>(new Map())

// 学生评价记录
const studentRecords = ref<any[]>([])



function toggleSortMenu() {
  showSortMenu.value = !showSortMenu.value
}

function toggleClassMenu() {
  if (classes.value.length <= 1) return
  showClassMenu.value = !showClassMenu.value
}

function closeClassMenu() {
  showClassMenu.value = false
}

async function pickClass(cls: Class) {
  closeClassMenu()
  if (cls.id === currentClass.value?.id) return
  await selectClass(cls)
}

function handleDocumentClick(event: MouseEvent) {
  if (!showClassMenu.value) return
  const target = event.target as HTMLElement
  if (!target.closest('[data-class-switcher]')) {
    closeClassMenu()
  }
}

function setSort(by: 'name' | 'studentNo' | 'progress' | 'points', order: 'asc' | 'desc') {
  sortBy.value = by
  sortOrder.value = order
  showSortMenu.value = false
  applyStudentSort()
}

function cycleStudentSort() {
  if (sortBy.value === 'studentNo') {
    sortBy.value = 'points'
    sortOrder.value = 'desc'
  } else if (sortBy.value === 'points' && sortOrder.value === 'desc') {
    sortOrder.value = 'asc'
  } else {
    sortBy.value = 'studentNo'
    sortOrder.value = 'asc'
  }
  applyStudentSort()
}

const studentSortLabel = computed(() => (
  sortBy.value === 'studentNo' ? '按学号排序' : '按积分排序'
))

const studentSortIcon = computed(() => {
  if (sortBy.value === 'studentNo') return 'format_list_numbered'
  return sortOrder.value === 'asc' ? 'arrow_upward' : 'arrow_downward'
})

const studentSortAriaLabel = computed(() => {
  if (sortBy.value === 'studentNo') return '按学号排序'
  return sortOrder.value === 'desc' ? '按积分降序排序' : '按积分升序排序'
})

function compareStudents(a: Student, b: Student) {
  let comparison = 0
  switch (sortBy.value) {
    case 'name':
      comparison = a.name.localeCompare(b.name)
      break
    case 'studentNo':
      comparison = (a.student_no || '').localeCompare(b.student_no || '')
      break
    case 'progress': {
      const levelA = a.pet_level || 0
      const levelB = b.pet_level || 0
      if (levelA !== levelB) {
        comparison = levelA - levelB
      } else {
        comparison = (a.pet_exp || 0) - (b.pet_exp || 0)
      }
      break
    }
    case 'points':
      comparison = (a.total_points || 0) - (b.total_points || 0)
      break
  }
  return sortOrder.value === 'asc' ? comparison : -comparison
}

function applyStudentSort() {
  const sorted = [...students.value].sort(compareStudents)
  studentDisplayOrder.value = sorted.map(student => student.id)
}

function syncStudentDisplayOrder() {
  const studentIds = new Set(students.value.map(student => student.id))
  const keptOrder = studentDisplayOrder.value.filter(id => studentIds.has(id))
  const keptSet = new Set(keptOrder)
  const newIds = students.value
    .filter(student => !keptSet.has(student.id))
    .map(student => student.id)
  studentDisplayOrder.value = [...keptOrder, ...newIds]
}

function updateStudentAfterEvaluation(
  studentId: string,
  pointsDelta: number,
  apiData?: { petLevel?: number; petExp?: number }
) {
  const index = students.value.findIndex(student => student.id === studentId)
  if (index === -1) return

  const student = students.value[index]
  const updatedStudent: Student = {
    ...student,
    total_points: student.total_points + pointsDelta,
  }

  if (apiData?.petExp !== undefined) {
    updatedStudent.pet_exp = apiData.petExp
  } else if (student.pet_type) {
    updatedStudent.pet_exp = Math.max(0, student.pet_exp + pointsDelta)
  }

  if (apiData?.petLevel !== undefined) {
    updatedStudent.pet_level = apiData.petLevel
  } else if (student.pet_type) {
    updatedStudent.pet_level = calculateLevel(updatedStudent.pet_exp)
  }

  students.value[index] = updatedStudent

  if (detailStudent.value?.id === studentId) {
    detailStudent.value = updatedStudent
  }
  if (selectedStudent.value?.id === studentId) {
    selectedStudent.value = updatedStudent
  }
}

function setStudentViewMode(mode: 'grid' | 'list') {
  studentViewMode.value = mode
}

function viewModeButtonClass(mode: 'grid' | 'list') {
  return studentViewMode.value === mode
    ? 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#ff9f1c] bg-[#fff1e8] text-[#ff7a1a]'
    : 'inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#f0e7dd] text-[#666] transition hover:bg-[#fff8f2]'
}

async function refreshDashboard() {
  if (!currentClass.value || isRefreshing.value) return
  isRefreshing.value = true
  try {
    await Promise.all([loadStudents(true), loadEvaluationRecords(), loadWeeklyChartRecords()])
    if (detailStudent.value) {
      detailStudent.value = students.value.find(student => student.id === detailStudent.value?.id) || null
      if (detailStudent.value) {
        await loadStudentRecords(detailStudent.value.id)
      }
    }
  } catch (error) {
    console.error('刷新失败:', error)
    toast.error('刷新失败，请重试')
  } finally {
    isRefreshing.value = false
  }
}

// Computed
const filteredStudents = computed(() => {
  const studentMap = new Map(students.value.map(student => [student.id, student]))
  const orderedStudents = studentDisplayOrder.value
    .map(id => studentMap.get(id))
    .filter((student): student is Student => Boolean(student))

  const orderedIds = new Set(orderedStudents.map(student => student.id))
  for (const student of students.value) {
    if (!orderedIds.has(student.id)) {
      orderedStudents.push(student)
    }
  }

  const query = searchQuery.value.trim().toLowerCase()
  if (!query) return orderedStudents

  return orderedStudents.filter(student => {
    const petName = student.pet_type ? getPetType(student.pet_type)?.name || '' : ''
    return student.name.toLowerCase().includes(query)
      || (student.student_no || '').toLowerCase().includes(query)
      || petName.toLowerCase().includes(query)
  })
})

const displayedStudents = computed(() => {
  if (showAllStudents.value) return filteredStudents.value
  return filteredStudents.value.slice(0, 6)
})

function toggleShowAllStudents() {
  showAllStudents.value = !showAllStudents.value
}

const categories = ['学习', '行为', '健康', '其他']

const currentCategoryRules = computed(() => {
  return rules.value.filter(r => r.category === selectedEvalTab.value)
})

const modalEvaluationRules = computed(() => {
  let list = currentCategoryRules.value
  if (cardEvalFilterPositive.value === true) {
    list = list.filter(rule => rule.points > 0)
  } else if (cardEvalFilterPositive.value === false) {
    list = list.filter(rule => rule.points < 0)
  }
  return list
})

const stampCategoryRules = computed(() => {
  return rules.value.filter(rule => rule.category === stampEvalTab.value)
})

const stampDimClass = computed(() =>
  stampMode.value ? 'opacity-40 grayscale pointer-events-none select-none transition-all duration-300' : ''
)

const stampFocusClass = computed(() =>
  stampMode.value ? 'relative z-30' : ''
)

const totalClassPoints = computed(() => students.value.reduce((total, student) => total + student.total_points, 0))



const ranking = computed(() => sortRanking(students.value))

const FEATURED_GALLERY_PET_IDS = ['red-panda', 'unicorn', 'call-duck', 'lop-rabbit', 'hamster'] as const
const FEATURED_GALLERY_PET_IDS_ROW2 = ['shiba', 'corgi', 'golden-retriever', 'tabby-cat', 'white-tiger'] as const

const PET_GALLERY_STYLES: Record<string, { label: string; badge: string; card: string }> = {
  'red-panda': { label: '传说级', badge: 'bg-[#ff8533] text-white', card: 'bg-gradient-to-b from-[#f4fcf6] to-[#dff5e8]' },
  unicorn: { label: '史诗级', badge: 'bg-[#a67fd4] text-white', card: 'bg-gradient-to-b from-[#faf5ff] to-[#efe2ff]' },
  'call-duck': { label: '稀有级', badge: 'bg-[#5b9fd4] text-white', card: 'bg-gradient-to-b from-[#f3f9ff] to-[#dceeff]' },
  'lop-rabbit': { label: '优秀级', badge: 'bg-[#5cb87a] text-white', card: 'bg-gradient-to-b from-[#fffdf4] to-[#fff0c9]' },
  hamster: { label: '普通级', badge: 'bg-[#c4a882] text-white', card: 'bg-gradient-to-b from-[#fffaf4] to-[#ffe9d2]' }
}

const featuredGalleryPets = computed(() =>
  FEATURED_GALLERY_PET_IDS
    .map(id => PET_TYPES.find(pet => pet.id === id))
    .filter((pet): pet is PetType => Boolean(pet))
)

const featuredGalleryPetsRow2 = computed(() =>
  FEATURED_GALLERY_PET_IDS_ROW2
    .map(id => PET_TYPES.find(pet => pet.id === id))
    .filter((pet): pet is PetType => Boolean(pet))
)

const featuredGalleryPetRows = computed(() => [featuredGalleryPets.value, featuredGalleryPetsRow2.value])

const collectedPetCount = computed(() =>
  new Set(students.value.filter(student => student.pet_type).map(student => student.pet_type)).size
)

const collectionProgress = computed(() =>
  PET_TYPES.length ? Math.min((collectedPetCount.value / PET_TYPES.length) * 100, 100) : 0
)

const weekDayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function getCurrentWeekStart() {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(now.getDate() - diff)
  return monday.getTime()
}

const weeklyGrowthValues = computed(() => {
  const weekStart = getCurrentWeekStart()
  const dayMs = 24 * 60 * 60 * 1000
  const dailyValues = Array(7).fill(0)

  for (const record of weeklyChartRecords.value) {
    if (!record.timestamp) continue
    const recordDate = new Date(record.timestamp)
    const recordDayStart = new Date(recordDate)
    recordDayStart.setHours(0, 0, 0, 0)
    const dayIndex = Math.floor((recordDayStart.getTime() - weekStart) / dayMs)
    if (dayIndex < 0 || dayIndex > 6) continue
    dailyValues[dayIndex] += Math.max(record.points, 0)
  }

  let runningTotal = 0
  return dailyValues.map(value => {
    runningTotal += value
    return runningTotal
  })
})

function getPetGalleryStyle(pet: PetType) {
  return PET_GALLERY_STYLES[pet.id] || {
    label: pet.category === 'mythical' ? '史诗级' : '普通级',
    badge: pet.category === 'mythical' ? 'bg-[#a67fd4] text-white' : 'bg-[#c4a882] text-white',
    card: pet.category === 'mythical' ? 'bg-gradient-to-b from-[#faf5ff] to-[#efe2ff]' : 'bg-gradient-to-b from-[#fffaf4] to-[#ffe9d2]',
  }
}

function getLevelBgClass(level: number): string {
  if (level >= 10) return 'from-yellow-400 via-amber-400 to-orange-400'
  if (level >= 7) return 'from-pink-400 via-rose-400 to-red-400'
  if (level >= 5) return 'from-purple-400 via-violet-400 to-indigo-400'
  if (level >= 3) return 'from-blue-400 via-cyan-400 to-teal-400'
  return 'from-gray-400 via-slate-400 to-zinc-400'
}

// 等级边框样式 - 每个等级都不同
function getLevelBorderClass(level: number): string {
  const borders: Record<number, string> = {
    1: 'border border-gray-200', // 浅灰色细边框
    2: 'border-2 border-gray-300', // 灰色
    3: 'border-2 border-blue-400 shadow-md shadow-blue-400/10', // 蓝色
    4: 'border-2 border-cyan-400 shadow-md shadow-cyan-400/15', // 青色
    5: 'border-2 border-purple-400 shadow-lg shadow-purple-400/20', // 紫色
    6: 'border-2 border-pink-400 shadow-lg shadow-pink-400/25', // 粉色
    7: 'border-2 border-rose-400 shadow-xl shadow-rose-400/30', // 红色
    8: 'border-3 border-yellow-400 shadow-xl shadow-yellow-400/40', // 金色
  }
  return borders[level] || ''
}

function getLevelBadgeClass(level: number): string {
  const badges: Record<number, string> = {
    1: 'bg-slate-500 text-white shadow-sm shadow-slate-400/35',
    2: 'bg-stone-500 text-white shadow-sm shadow-stone-400/35',
    3: 'bg-sky-500 text-white shadow-sm shadow-sky-400/40',
    4: 'bg-cyan-500 text-white shadow-sm shadow-cyan-400/40',
    5: 'bg-violet-500 text-white shadow-md shadow-violet-400/45',
    6: 'bg-purple-500 text-white shadow-md shadow-purple-400/45',
    7: 'bg-rose-500 text-white shadow-md shadow-rose-400/50',
    8: 'bg-gradient-to-r from-amber-400 to-orange-500 text-white shadow-md shadow-amber-400/55'
  }
  return badges[level] || badges[1]
}

// 计算显示等级（基于经验值实时计算，修复数据不一致问题）
function getDisplayLevel(student: Student): number {
  return calculateLevel(student.pet_exp)
}

function getStudentStatusTag(student: Student) {
  if (!student.pet_type) {
    return { label: '待领养', class: 'bg-slate-100 text-slate-600' }
  }
  const level = getDisplayLevel(student)
  if (level >= 8) return { label: '优秀', class: 'bg-emerald-50 text-emerald-600' }
  if (level >= 5) return { label: '成长', class: 'bg-sky-50 text-sky-600' }
  if (level >= 3) return { label: '进步', class: 'bg-violet-50 text-violet-600' }
  return { label: '新秀', class: 'bg-orange-50 text-orange-600' }
}

function getStudentProgress(student: Student) {
  const progress = getLevelProgress(student.pet_exp)
  return {
    percent: progress.percentage,
    current: progress.current,
    required: progress.required,
    isMaxLevel: progress.isMaxLevel
  }
}

function formatRecordTime(timestamp?: number) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
  return isToday ? `今天 ${time}` : date.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function openCardQuickEval(student: Student, positive: boolean) {
  selectedStudent.value = student
  cardEvalFilterPositive.value = positive
  selectedEvalTab.value = positive ? '学习' : '行为'
  showAddModal.value = true
}

function closeAddModal() {
  showAddModal.value = false
  cardEvalFilterPositive.value = null
}

// API calls
async function loadClasses() {
  try {
    const res = await api.get('/classes')
    classes.value = res.data.classes
    if (classes.value.length > 0) {
      const savedClassId = getSavedClassId(user.value?.id)
      const savedClass = savedClassId ? classes.value.find(c => c.id === savedClassId) : null
      
      if (savedClass) {
        await selectClass(savedClass)
      } else if (!currentClass.value || !classes.value.find(c => c.id === currentClass.value?.id)) {
        await selectClass(classes.value[0])
      }
    } else {
      currentClass.value = null
      students.value = []
      setCurrentClassStudentCount(null)
    }
  } catch (error) {
    console.error('加载班级失败:', error)
  }
}

async function selectClass(cls: Class) {
  isDemoMode.value = cls.id === DEMO_CLASS_ID
  currentClass.value = cls
  showAllStudents.value = false
  saveCurrentClassId(cls.id, user.value?.id)
  await Promise.all([loadStudents(true), loadEvaluationRecords(), loadWeeklyChartRecords(), loadActiveTasks(), refreshClassVipStatus()])
}

async function loadActiveTasks() {
  if (!currentClass.value) {
    activeTasks.value = []
    return
  }
  try {
    const res = await api.get('/tasks', {
      params: { classId: currentClass.value.id, status: 'active' },
      ...requestConfigForCurrentClass()
    })
    activeTasks.value = (res.data.tasks || []).slice(0, 3)
  } catch (error) {
    console.error('加载任务摘要失败:', error)
    activeTasks.value = []
  }
}

async function loadStudents(applySort = false) {
  if (!currentClass.value) {
    setCurrentClassStudentCount(null)
    return
  }
  const res = await api.get(`/classes/${currentClass.value.id}/students`, requestConfigForCurrentClass())
  students.value = res.data.students
  setCurrentClassStudentCount(students.value.length)
  if (applySort || studentDisplayOrder.value.length === 0) {
    applyStudentSort()
  } else {
    syncStudentDisplayOrder()
  }
}

async function loadRules() {
  const res = await api.get('/rules')
  rules.value = res.data.rules
}

async function createClass() {
  if (!newClassName.value.trim()) {
    toast.warning('请输入班级名称')
    return
  }
  try {
    const res = await api.post('/classes', { name: newClassName.value.trim() })
    newClassName.value = ''
    showClassModal.value = false
    await loadClasses()
    if (res.data.welcomeVipGranted) {
      toast.success('班级创建成功！已为您自动开通 1 个月灵犀计划')
    } else {
      toast.success('班级创建成功！')
    }
  } catch (error) {
    console.error('创建班级失败:', error)
    toast.error('创建班级失败，请重试')
  }
}

async function updateClass() {
  if (!newClassName.value.trim()) {
    toast.warning('请输入班级名称')
    return
  }
  const classToEdit = editingClass.value
  if (!classToEdit) return
  try {
    const newName = newClassName.value.trim()
    await api.put(`/classes/${classToEdit.id}`, { name: newName })
    // 如果当前选中的班级被修改，更新当前班级名称
    if (currentClass.value?.id === classToEdit.id) {
      currentClass.value = { ...currentClass.value, name: newName } as Class
    }
    newClassName.value = ''
    editingClass.value = null
    showClassModal.value = false
    await loadClasses()
  } catch (error) {
    console.error('更新班级失败:', error)
    toast.error('更新班级失败，请重试')
  }
}

function openCreateClassModal() {
  editingClass.value = null
  newClassName.value = ''
  showClassModal.value = true
}

function openEditClassModal() {
  if (!currentClass.value) return
  editingClass.value = currentClass.value
  newClassName.value = currentClass.value.name
  showClassModal.value = true
}

async function deleteClass(id: string) {
  showConfirm({
    title: '删除班级',
    message: '确定删除该班级？所有学生数据将一并删除！',
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger',
    onConfirm: async () => {
      await api.delete(`/classes/${id}`)
      if (currentClass.value?.id === id) {
        currentClass.value = null
        students.value = []
        setCurrentClassStudentCount(null)
      }
      await loadClasses()
      toast.success('班级删除成功！')
    }
  })
}

async function addStudent() {
  if (!newStudentName.value.trim() || !currentClass.value) return
  try {
    await api.post('/students', {
      classId: currentClass.value.id,
      name: newStudentName.value.trim(),
      studentNo: newStudentNo.value.trim() || null
    })
    newStudentName.value = ''
    newStudentNo.value = ''
    showStudentModal.value = false
    await loadStudents()
  } catch (error) {
    console.error('添加学生失败:', error)
    toast.error('添加学生失败，请重试')
  }
}

async function openPetSelect(student: Student) {
  selectedStudent.value = student
  await refreshClassVipStatus()
  showPetModal.value = true
}

async function refreshAfterPetChange() {
  showPetModal.value = false
  selectedStudent.value = null
  await loadStudents()
  if (detailStudent.value) {
    detailStudent.value = students.value.find(s => s.id === detailStudent.value?.id) || null
  }
}

async function applyPetChange(petId: string) {
  if (!selectedStudent.value) return
  if (isMythicalPet(petId) && !currentClassVipActive.value) {
    toast.info('神兽伙伴需开通灵犀计划（VIP）后才能领养')
    return
  }
  const student = selectedStudent.value
  const isSwitch = Boolean(student.pet_type)
  try {
    await api.put(`/students/${student.id}/pet`, { petType: petId })
    const pet = getPetType(petId)
    toast.success(
      isSwitch
        ? `已将 ${student.name} 的宠物更换为 ${pet?.name || '新宠物'}`
        : `🎉 ${student.name} 领养了一只 ${pet?.name || '宠物'}！`
    )
    await refreshAfterPetChange()
  } catch (error) {
    console.error('领养宠物失败:', error)
    const message = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
    toast.error(message || '领养失败，请重试')
  }
}

async function applyPetRemoval() {
  if (!selectedStudent.value?.pet_type) return
  const student = selectedStudent.value
  try {
    await api.delete(`/students/${student.id}/pet`)
    toast.success(`已取消 ${student.name} 的宠物`)
    await refreshAfterPetChange()
  } catch (error) {
    console.error('取消宠物失败:', error)
    const message = (error as { response?: { data?: { error?: string } } }).response?.data?.error
    toast.error(message || '取消宠物失败，请重试')
  }
}

function removePet() {
  if (!selectedStudent.value?.pet_type) return
  const student = selectedStudent.value
  const petType = student.pet_type
  if (!petType) return
  const currentPet = getPetType(petType)
  showConfirm({
    title: '取消宠物',
    message: `取消「${currentPet?.name || '宠物'}」后，等级、成长进度和积分都会归零，${student.name} 将回到待领养状态。确定要取消吗？`,
    confirmText: '确认取消',
    cancelText: '保留',
    type: 'warning',
    onConfirm: () => {
      void applyPetRemoval()
    }
  })
}

function selectPet(petId: string) {
  if (!selectedStudent.value) return
  if (isMythicalPet(petId) && !currentClassVipActive.value) {
    toast.info('神兽伙伴需开通灵犀计划（VIP）后才能领养')
    return
  }
  const student = selectedStudent.value

  if (student.pet_type === petId) {
    showPetModal.value = false
    return
  }

  if (!student.pet_type) {
    void applyPetChange(petId)
    return
  }

  const nextPet = getPetType(petId)
  const currentPet = getPetType(student.pet_type)
  showConfirm({
    title: '更换宠物',
    message: `更换为「${nextPet?.name || '新宠物'}」后，当前「${currentPet?.name || '宠物'}」的等级、成长进度和积分都会归零，需要重新培养。确定要更换吗？`,
    confirmText: '确认更换',
    cancelText: '取消',
    type: 'warning',
    onConfirm: () => {
      void applyPetChange(petId)
    }
  })
}

// 打开详情面板
async function openDetailPanel(student: Student) {
  detailStudent.value = student
  detailEvalTab.value = '学习'
  showDetailPanel.value = true

  // 加载该学生的评价记录
  await loadStudentRecords(student.id)
}

// 加载学生评价记录
async function loadStudentRecords(studentId: string) {
  try {
    const res = await api.get(`/evaluations?studentId=${studentId}&pageSize=20`)
    studentRecords.value = res.data.records || []
  } catch (error) {
    console.error('加载记录失败:', error)
    studentRecords.value = []
  }
}

async function shareDetailStudentRecords() {
  if (!detailStudent.value) return
  const url = `${window.location.origin}/pet-garden/share/${detailStudent.value.id}`
  try {
    await navigator.clipboard.writeText(url)
    toast.success('成长分享链接已复制，可发给家长查看')
  } catch {
    toast.error('复制失败，请手动复制链接')
  }
}

// 关闭详情面板
function closeDetailPanel() {
  showDetailPanel.value = false
  detailStudent.value = null
  studentRecords.value = []
}

async function deleteDetailStudent() {
  if (!detailStudent.value) return
  const student = detailStudent.value
  showConfirm({
    title: '删除学生',
    message: `确定删除 ${student.name}？相关评价记录将一并删除，此操作不可恢复！`,
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger',
    onConfirm: async () => {
      try {
        await api.delete(`/students/${student.id}`)
        scoreAnimations.value.delete(student.id)
        toast.success(`已删除 ${student.name}`)
        closeDetailPanel()
        await loadStudents()
      } catch (error) {
        console.error('删除失败:', error)
        toast.error('删除失败，请重试')
      }
    }
  })
}

function startStampMode() {
  stampMode.value = true
  activeStampRule.value = null
  stampEvalTab.value = '学习'
  showAllStudents.value = true
}

function cancelStampMode() {
  stampMode.value = false
  activeStampRule.value = null
}

function toggleStampMode() {
  if (stampMode.value) {
    cancelStampMode()
    return
  }
  startStampMode()
}

function selectStampRule(rule: Rule) {
  activeStampRule.value = rule
  stampEvalTab.value = rule.category
}

function onSidebarRuleClick(rule: Rule) {
  if (!stampMode.value) {
    startStampMode()
  }
  selectStampRule(rule)
}

function onSidebarCategoryClick(category: string) {
  if (stampMode.value) {
    stampEvalTab.value = category
    return
  }
  selectedEvalTab.value = category
}

function handleStudentCardClick(student: Student) {
  if (stampMode.value) {
    stampQuickEval(student)
    return
  }
  openDetailPanel(student)
}

function stampRuleButtonClass(rule: Rule) {
  const isActive = activeStampRule.value?.id === rule.id
  if (isActive) {
    return rule.points > 0
      ? 'border-emerald-400 bg-emerald-100 text-emerald-700 ring-2 ring-emerald-300'
      : 'border-rose-400 bg-rose-100 text-rose-700 ring-2 ring-rose-300'
  }
  return rule.points > 0
    ? 'border-emerald-100 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
    : 'border-rose-100 bg-rose-50 text-rose-700 hover:bg-rose-100'
}

function toggleDeleteStudent(studentId: string) {
  const index = deleteStudentList.value.indexOf(studentId)
  if (index > -1) {
    deleteStudentList.value.splice(index, 1)
  } else {
    deleteStudentList.value.push(studentId)
  }
}

function cancelDeleteMode() {
  showDeleteStudentMode.value = false
  deleteStudentList.value = []
}

async function batchDeleteStudents() {
  if (deleteStudentList.value.length === 0) return
  
  showConfirm({
    title: '删除学生',
    message: `确定删除 ${deleteStudentList.value.length} 名学生？此操作不可恢复！`,
    confirmText: '删除',
    cancelText: '取消',
    type: 'danger',
    onConfirm: async () => {
      let successCount = 0
      for (const studentId of deleteStudentList.value) {
        try {
          await api.delete(`/students/${studentId}`)
          successCount++
        } catch (error) {
          console.error('删除失败:', error)
        }
      }
      
      toast.success(`已删除 ${successCount} 名学生`)
      cancelDeleteMode()
      await loadStudents()
    }
  })
}

// 触发评分动效
function triggerScoreAnimation(studentId: string, points: number) {
  scoreAnimations.value.set(studentId, { points, show: true })
  setTimeout(() => {
    scoreAnimations.value.delete(studentId)
  }, 1500)
}

// 详情面板中快速评分
async function detailQuickAdd(rule: Rule) {
  if (!detailStudent.value) return

  const student = detailStudent.value
  const success = await quickAdd(student, rule)
  if (success) {
    closeDetailPanel()
  }
}

function showEvaluationSuccessToast(student: Student, rule: Rule) {
  toast.success(`${student.name} ${rule.points > 0 ? '+' : ''}${rule.points} ${rule.name}`)
}

async function applyEvaluationToStudent(student: Student, rule: Rule): Promise<boolean> {
  try {
    const res = await api.post('/evaluations', {
      classId: currentClass.value?.id,
      studentId: student.id,
      points: rule.points,
      reason: rule.name,
      category: rule.category
    })

    triggerScoreAnimation(student.id, rule.points)
    updateStudentAfterEvaluation(student.id, rule.points, {
      petLevel: res.data.petLevel,
      petExp: res.data.petExp,
    })
    await loadEvaluationRecords()

    if (res.data.levelUp) {
      levelUpInfo.value = {
        name: student.name,
        level: res.data.petLevel,
        petType: student.pet_type || '',
        prevLevel: res.data.petLevel - 1
      }
      levelUpImagesLoaded.value = { prev: false, current: false }
      levelUpPhase.value = 'show-prev'
      showLevelUpAnimation.value = true

      setTimeout(() => { levelUpPhase.value = 'transition' }, 500)
      setTimeout(() => { levelUpPhase.value = 'show-current' }, 1500)
      setTimeout(() => { showLevelUpAnimation.value = false }, 4000)
    }
    if (res.data.graduated) {
      toast.success(`🎓 恭喜！${student.name} 的宠物毕业了，获得了专属徽章！`)
    }
    return true
  } catch (error: unknown) {
    console.error('评价失败:', error)
    const axiosError = error as { response?: { status?: number; data?: { error?: string } } }
    if (axiosError.response?.status === 429) {
      toast.warning(axiosError.response.data?.error || '同一评价 1 分钟内不能重复操作')
    } else {
      toast.error('评价失败，请重试')
    }
    return false
  }
}

async function stampQuickEval(student: Student) {
  if (!activeStampRule.value) {
    toast.warning('请先选择一条评价规则')
    return
  }

  await quickAdd(student, activeStampRule.value)
}

async function quickAdd(student: Student, rule: Rule): Promise<boolean> {
  const success = await applyEvaluationToStudent(student, rule)
  if (success) {
    showEvaluationSuccessToast(student, rule)
  }
  return success
}

async function modalQuickAdd(rule: Rule) {
  if (!selectedStudent.value) return
  const success = await quickAdd(selectedStudent.value, rule)
  if (success) {
    closeAddModal()
  }
}

async function loadEvaluationRecords() {
  if (!currentClass.value) return
  const res = await api.get(
    `/evaluations?classId=${currentClass.value.id}&today=1&page=1&pageSize=50`,
    requestConfigForCurrentClass()
  )
  evaluationRecords.value = res.data.records || []
  todayEvaluationCount.value = res.data.total || 0
  totalRecords.value = res.data.total || 0
}

async function loadWeeklyChartRecords() {
  if (!currentClass.value) {
    weeklyChartRecords.value = []
    return
  }
  try {
    const res = await api.get(
      `/evaluations?classId=${currentClass.value.id}&page=1&pageSize=200`,
      requestConfigForCurrentClass()
    )
    weeklyChartRecords.value = res.data.records || []
  } catch (error) {
    console.error('加载周趋势数据失败:', error)
    weeklyChartRecords.value = []
  }
}

const paginatedRecords = computed(() => {
  return evaluationRecords.value
})

const totalPages = computed(() => {
  return Math.ceil(totalRecords.value / recordsPageSize)
})

function prevPage() {
  if (recordsPage.value > 1) {
    recordsPage.value--
    loadEvaluationRecords()
  }
}

function nextPage() {
  if (recordsPage.value < totalPages.value) {
    recordsPage.value++
    loadEvaluationRecords()
  }
}

function goToPage(page: number) {
  if (page >= 1 && page <= totalPages.value) {
    recordsPage.value = page
    loadEvaluationRecords()
  }
}

// TODO: 导入导出功能暂时屏蔽，等待重构后恢复
/*
async function exportBackup() {
  try {
    const res = await api.get('/backup', { responseType: 'blob' })
    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `pet-garden-backup-${Date.now()}.json`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    alert('备份导出成功！')
  } catch (error) {
    console.error('导出失败:', error)
    alert('导出失败')
  }
}

async function importBackup(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  
  const fileInput = event.target as HTMLInputElement
  
  showConfirm({
    title: '导入备份',
    message: '导入将覆盖现有数据，确定继续？',
    confirmText: '导入',
    cancelText: '取消',
    type: 'warning',
    onConfirm: async () => {
      try {
        const text = await file.text()
        const data = JSON.parse(text)
        await api.post('/restore', data)
        toast.success('数据恢复成功！')
        await loadClasses()
        await loadRules()
      } catch (error) {
        console.error('导入失败:', error)
        toast.error('导入失败，请确保文件格式正确')
      }
      fileInput.value = ''
    }
  })
}
*/

function getStudentPetImage(student: Student): string {
  if (!student.pet_type) return ''
  // 根据学生当前等级显示对应等级的宠物图片
  return getPetLevelImage(student.pet_type, student.pet_level)
}

// 保留既有完整操作能力，导航入口按需逐步展示。
void [
  PetImage, isGuest, username, logout, showTeacherProfile, showStudentMenu,
  showEvalMenu, showPetMenu, imageLoaded, toggleSortMenu, setSort, getLevelBgClass,
  getLevelBorderClass, openEditClassModal, deleteClass, toggleDeleteStudent,
  batchDeleteStudents, paginatedRecords, prevPage,
  nextPage, goToPage
]

async function openStudentFromQuery() {
  const studentId = route.query.studentId
  if (typeof studentId !== 'string' || !studentId) return
  const student = students.value.find(item => item.id === studentId)
  if (!student) return
  await openDetailPanel(student)
  router.replace({ path: route.path, query: {} })
}

// Initialize
async function handleStudentsImported(event?: Event) {
  const detail = (event as CustomEvent<{ classId?: string }> | undefined)?.detail
  await loadClasses()
  if (detail?.classId) {
    const cls = classes.value.find(item => item.id === detail.classId)
    if (cls) {
      await selectClass(cls)
      return
    }
  }
  await loadStudents()
}

onMounted(async () => {
  window.addEventListener(STUDENTS_IMPORTED_EVENT, handleStudentsImported)
  window.addEventListener('click', handleDocumentClick)
  isLoading.value = true
  try {
    const wantsDemo = route.query.demo === '1'
    if (wantsDemo) {
      const studentId = route.query.studentId
      router.replace({
        path: route.path,
        query: typeof studentId === 'string' ? { studentId } : {}
      })
      await enterDemoGarden()
      await openStudentFromQuery()
      return
    }
    if (isGuest.value && getSavedClassId(user.value?.id) === DEMO_CLASS_ID) {
      await enterDemoGarden()
      await openStudentFromQuery()
      return
    }
    const shouldLand = await shouldShowLanding()
    showLanding.value = shouldLand
    if (!shouldLand) {
      await loadClasses()
      await loadRules()
      await openStudentFromQuery()
    }
  } finally {
    isLoading.value = false
    nextTick(() => {
      isLoaded.value = true
    })
  }
})

onUnmounted(() => {
  window.removeEventListener(STUDENTS_IMPORTED_EVENT, handleStudentsImported)
  window.removeEventListener('click', handleDocumentClick)
})
</script>

<template>
  <div class="min-h-screen bg-[#fffdfb] font-sans text-slate-800">
    <Transition>
      <div v-if="isLoading" class="fixed inset-0 z-[200] flex items-center justify-center bg-[#fffaf5]">
        <div class="text-center">
          <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-[24px] bg-orange-100 text-3xl shadow-sm">🐾</div>
          <p class="mt-4 text-sm font-semibold text-slate-600">正在打开班级宠物园</p>
        </div>
      </div>
    </Transition>

    <template v-if="showLanding">
      <main class="overflow-hidden bg-white text-[#1a1a1a]">
        <section class="flex items-center justify-center px-5 pt-16 pb-8 sm:px-8 sm:pb-10">
          <div class="flex w-full max-w-[860px] flex-col items-center text-center">
            <div class="flex h-[34px] items-center justify-center gap-2 rounded-full bg-[#fff3ec] px-4">
              <span class="h-2 w-2 rounded-full bg-[#ff5c00]"></span>
              <span class="font-brand text-sm font-bold text-[#ff5c00]">班级宠物园</span>
            </div>
            <h1 class="mt-[22px] max-w-[820px] font-serif text-5xl font-bold leading-[0.98] text-[#1a1a1a] sm:text-[68px]">孩子的专属宠物，言行驱动成长。</h1>
            <p class="mt-[22px] max-w-[660px] text-base leading-[1.45] text-[#666] sm:text-xl">老师快速加分，学生的宠物随习惯一起升级。</p>
            <div class="mt-[22px] flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <button type="button" class="font-brand h-12 rounded-full bg-[#ff5c00] px-8 text-[15px] font-bold text-white shadow-[0_16px_40px_rgba(0,0,0,0.07)] transition hover:bg-[#e95300]" @click="enterDemoGarden">进入演示班级</button>
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
                <p class="mt-1 text-sm leading-5 leading-5 text-[#888]">积分、等级、徽章都围绕学生的日常表现。</p>
              </div>
            </div>
          </div>
        </section>

        <section class="flex flex-col items-center justify-center gap-[18px] px-5 py-10 sm:h-[700px] sm:px-8">
          <div class="text-center">
            <p class="font-brand text-sm leading-5 font-semibold text-[#ff5c00]">产品截图</p>
            <h2 class="mt-4 font-serif text-3xl font-bold leading-[1.05] text-[#1a1a1a] sm:text-[34px]">把喂养、成长与班级记录放在同一屏。</h2>
          </div>
          <div class="flex w-full max-w-[1040px] items-center justify-center rounded-xl border border-[#f3f4f6] bg-white p-3 shadow-[0_16px_40px_rgba(0,0,0,0.07)] sm:h-[590px] sm:p-4">
            <img src="/class-pet-garden-product.png" alt="班级宠物园产品截图" class="w-full rounded-lg sm:h-full sm:object-contain" />
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
              <button type="button" class="font-brand font-bold text-[#ff5c00] underline-offset-2 transition hover:text-[#e95300] hover:underline" @click="enterDemoGarden">进入演示班级</button>
              <span class="text-[#ccc]">·</span>
              <router-link to="/register" class="font-brand font-bold text-[#ff5c00] underline-offset-2 transition hover:text-[#e95300] hover:underline">我是老师，创建新班级</router-link>
            </div>
            <p class="font-brand text-sm text-[#888]">© 2026 班级宠物园。保留所有权利。</p>
          </div>
        </footer>
      </main>
    </template>

    <template v-else>
      <AppShell active-page="dashboard" title="班级工作台" :navigation-dimmed="stampMode">
        <div class="flex min-w-0 flex-col gap-5" :class="stampMode ? 'pb-44 xl:pb-0' : ''">
          <header class="relative flex min-h-[62px] flex-wrap items-center gap-3">
            <div v-if="currentClass" class="relative" data-class-switcher :class="stampDimClass">
              <button
                type="button"
                class="inline-flex h-[42px] max-w-[min(100%,280px)] items-center gap-2 rounded-full bg-[#fff1e8] px-3 text-sm font-semibold text-[#b85e25] transition"
                :class="classes.length > 1 ? 'cursor-pointer pr-2 hover:bg-[#ffe8da]' : 'cursor-default'"
                @click.stop="toggleClassMenu"
              >
                <span class="material-symbols-rounded shrink-0 text-[18px] leading-none">school</span>
                <span class="truncate">{{ currentClass.name }}</span>
                <span class="shrink-0 text-[#d97706]/70">·</span>
                <span class="shrink-0">{{ students.length }} 名学生</span>
                <span
                  v-if="classes.length > 1"
                  class="material-symbols-rounded ml-0.5 shrink-0 text-[18px] leading-none text-[#d97706]/80 transition-transform"
                  :class="showClassMenu ? 'rotate-180' : ''"
                >expand_more</span>
              </button>

              <div
                v-if="showClassMenu && classes.length > 1"
                class="absolute left-0 top-[calc(100%+6px)] z-50 min-w-[220px] overflow-hidden rounded-2xl border border-[#f1e5db] bg-white py-1 shadow-[0_12px_36px_rgba(116,76,45,0.12)]"
                @click.stop
              >
                <button
                  v-for="cls in classes"
                  :key="cls.id"
                  type="button"
                  class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-[#fff7f1]"
                  :class="cls.id === currentClass.id ? 'bg-[#fff0e2] font-semibold text-[#b85e25]' : 'text-[#765f50]'"
                  @click="pickClass(cls)"
                >
                  <span class="material-symbols-rounded text-[18px] leading-none" :class="cls.id === currentClass.id ? 'text-[#d97706]' : 'text-[#c4a494]'">school</span>
                  <span class="min-w-0 flex-1 truncate">{{ cls.name }}</span>
                  <span v-if="cls.id === currentClass.id" class="material-symbols-rounded text-[16px] text-[#d97706]">check</span>
                </button>
              </div>
            </div>
            <label class="flex h-[42px] min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[#edeff2] bg-white px-3 text-sm text-[#888]" :class="stampDimClass">
              <span class="material-symbols-rounded text-[18px] leading-none">search</span><input v-model="searchQuery" type="search" placeholder="搜索学生姓名 / 学号" class="min-w-0 flex-1 bg-transparent outline-none" />
            </label>
            <div class="flex flex-wrap items-center gap-2">
              <button type="button" aria-label="创建班级" class="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-orange-200 bg-white text-sm font-semibold text-[#b85e25] shadow-sm lg:w-auto lg:gap-1.5 lg:px-[13px]" :class="stampDimClass" @click="openImportModal({ expandCreateClass: true })"><span class="material-symbols-rounded text-[18px] leading-none">add</span><span class="hidden lg:inline">创建班级</span></button>
              <button type="button" aria-label="导入学生" class="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-orange-200 bg-white text-sm font-semibold text-[#b85e25] shadow-sm lg:w-auto lg:gap-1.5 lg:px-[13px]" :class="stampDimClass" @click="() => openImportModal()"><span class="material-symbols-rounded text-[18px] leading-none">upload</span><span class="hidden lg:inline">导入学生</span></button>
              <button type="button" :aria-label="stampMode ? '退出评价' : '快速评价'" class="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl border text-sm font-semibold shadow-sm transition lg:w-auto lg:gap-1.5 lg:px-[13px]" :class="[stampMode ? 'border-rose-400 bg-rose-100 text-[#be123c] ring-2 ring-rose-200' : 'border-rose-200 bg-[#fff1f5] text-[#e11d48]', stampFocusClass]" @click="toggleStampMode"><span class="material-symbols-rounded text-[18px] leading-none">bolt</span><span class="hidden lg:inline">{{ stampMode ? '退出评价' : '快速评价' }}</span></button>
              <router-link to="/rules" aria-label="新增规则" class="inline-flex h-[42px] w-[42px] items-center justify-center rounded-xl bg-[#8b5cf6] text-sm font-semibold text-white shadow-sm lg:w-auto lg:gap-1.5 lg:px-[13px]" :class="stampDimClass"><span class="material-symbols-rounded text-[18px] leading-none">add</span><span class="hidden lg:inline">新增规则</span></router-link>
            </div>
            <div class="ml-auto flex items-center gap-2" :class="stampDimClass">
              <button type="button" class="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-[#edeff2] bg-white text-[#666] shadow-sm" aria-label="通知">
                <span class="material-symbols-rounded text-[20px]">notifications</span>
              </button>
              <router-link
                v-if="isGuest"
                to="/login"
                class="inline-flex h-[42px] items-center gap-2 rounded-xl border border-[#edeff2] bg-white px-3 text-sm font-semibold shadow-sm transition hover:border-orange-200 hover:bg-[#fffaf5]"
              >
                <span class="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffe7c8] text-[#d97706]"><span class="material-symbols-rounded text-[18px]">person</span></span>
                <span class="hidden sm:inline">游客</span>
                <span class="hidden text-sm text-[#999] md:inline">点击登录</span>
              </router-link>
              <button v-else type="button" class="inline-flex h-[42px] items-center gap-2 rounded-xl border border-[#edeff2] bg-white px-3 text-sm font-semibold shadow-sm transition hover:border-orange-200 hover:bg-[#fffaf5]" @click="openTeacherProfile">
                <span class="flex h-8 w-8 items-center justify-center rounded-full bg-[#ffe7c8] text-[#d97706]"><span class="material-symbols-rounded text-[18px]">person</span></span>
                <span class="hidden sm:inline">{{ username }}</span>
                <span class="hidden text-sm text-[#999] md:inline">教师账号</span>
              </button>
            </div>
          </header>

          <div class="flex min-w-0 flex-col gap-5 xl:flex-row">
            <main class="min-w-0 flex-1 space-y-[14px]">
            <template v-if="classes.length">
              <section class="grid grid-cols-2 gap-3 xl:grid-cols-4" :class="stampDimClass">
                <article class="relative overflow-hidden rounded-[20px] border border-orange-200/70 bg-gradient-to-br from-[#fff7ea] to-[#ffe9bf] p-3 shadow-[0_8px_18px_rgba(0,0,0,0.04)] xl:p-[18px_20px]"><div class="flex items-center gap-2 xl:gap-3.5"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffe0a3] text-[#ff7a1a] xl:h-[52px] xl:w-[52px]"><span class="material-symbols-rounded text-[18px] xl:text-[22px]">emoji_events</span></span><div class="min-w-0"><p class="text-[13px] font-bold xl:text-[15px]">班级总积分</p><p class="font-mono text-2xl font-extrabold text-[#ff7a1a] xl:text-[31px]">{{ totalClassPoints }}</p><p class="text-xs leading-4 text-[#9a5a2b] xl:text-sm">{{ students.length }} 位学生共同积累</p></div></div></article>
                <article class="relative overflow-hidden rounded-[20px] border border-rose-200/70 bg-gradient-to-br from-[#fff1f5] to-[#ffd9e3] p-3 shadow-[0_8px_18px_rgba(0,0,0,0.04)] xl:p-[18px_20px]"><div class="flex items-center gap-2 xl:gap-3.5"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffc0d0] text-[#f43f75] xl:h-[52px] xl:w-[52px]"><span class="material-symbols-rounded text-[18px] xl:text-[22px]">rate_review</span></span><div class="min-w-0"><p class="text-[13px] font-bold xl:text-[15px]">今日评价次数</p><p class="font-mono text-2xl font-extrabold text-[#f43f75] xl:text-[31px]">{{ todayEvaluationCount }}</p><p class="text-xs leading-4 text-[#a84b65] xl:text-sm">记录每一个闪光瞬间</p></div></div></article>
                <article class="relative overflow-hidden rounded-[20px] border border-violet-200/70 bg-gradient-to-br from-[#f5f0ff] to-[#e8d8ff] p-3 shadow-[0_8px_18px_rgba(0,0,0,0.04)] xl:p-[18px_20px]"><div class="flex items-center gap-2 xl:gap-3.5"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#d9c2ff] text-[#8b5cf6] xl:h-[52px] xl:w-[52px]"><span class="material-symbols-rounded text-[18px] xl:text-[22px]">pets</span></span><div class="min-w-0"><p class="text-[13px] font-bold xl:text-[15px]">已领养宠物</p><p class="font-mono text-2xl font-extrabold text-[#8b5cf6] xl:text-[31px]">{{ students.filter(student => student.pet_type).length }}</p><p class="text-xs leading-4 text-[#7053a0] xl:text-sm">宠物伙伴正在成长</p></div></div></article>
                <article class="relative overflow-hidden rounded-[20px] border border-amber-200/70 bg-gradient-to-br from-[#fff8d8] to-[#ffe89a] p-3 shadow-[0_8px_18px_rgba(0,0,0,0.04)] xl:p-[18px_20px]"><div class="flex items-center gap-2 xl:gap-3.5"><span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ffd75d] text-[#f59e0b] xl:h-[52px] xl:w-[52px]"><span class="material-symbols-rounded text-[18px] xl:text-[22px]">military_tech</span></span><div class="min-w-0"><p class="text-[13px] font-bold xl:text-[15px]">毕业徽章数</p><p class="font-mono text-2xl font-extrabold text-[#f59e0b] xl:text-[31px]">{{ students.filter(student => getDisplayLevel(student) >= 8).length }}</p><p class="text-xs leading-4 text-[#927319] xl:text-sm">已经收获成长徽章</p></div></div></article>
              </section>

              <section class="rounded-[18px] border border-[#f0e7dd] bg-white p-4 shadow-[0_5px_18px_rgba(0,0,0,0.04)]" :class="[stampMode ? 'ring-2 ring-rose-200 shadow-[0_8px_28px_rgba(190,18,60,0.12)]' : '', stampFocusClass]">
                <div class="flex h-[34px] items-center justify-between">
                  <div class="flex items-center gap-2">
                    <h1 class="text-lg font-bold">学生宠物卡片</h1>
                  </div>
                  <div class="flex items-center gap-2 text-sm leading-5 text-[#666]">
                    <button type="button" :aria-label="studentSortAriaLabel" class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#f0e7dd] text-[#666] transition hover:bg-[#fff8f2] hover:text-[#ff5c00] lg:h-auto lg:w-auto lg:gap-1 lg:border-0 lg:hover:bg-transparent" :class="sortBy === 'points' ? 'border-[#ff9f1c] bg-[#fff1e8] text-[#ff7a1a] lg:border lg:border-[#ff9f1c]' : ''" @click="cycleStudentSort">
                      <span class="hidden lg:inline">{{ studentSortLabel }}</span>
                      <span class="material-symbols-rounded text-[16px] leading-none lg:text-[16px]">{{ studentSortIcon }}</span>
                    </button>
                    <button type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#f0e7dd] text-[#666] transition hover:bg-[#fff8f2] hover:text-[#ff7a1a] disabled:cursor-not-allowed disabled:opacity-50" aria-label="刷新数据" :disabled="isRefreshing" @click="refreshDashboard"><span class="material-symbols-rounded text-[18px] leading-none" :class="isRefreshing ? 'animate-spin' : ''">refresh</span></button>
                    <button type="button" :class="viewModeButtonClass('grid')" aria-label="卡片视图" @click="setStudentViewMode('grid')"><span class="material-symbols-rounded text-[18px] leading-none">grid_view</span></button>
                    <button type="button" :class="viewModeButtonClass('list')" aria-label="列表视图" @click="setStudentViewMode('list')"><span class="material-symbols-rounded text-[18px] leading-none">view_list</span></button>
                  </div>
                </div>
                <div v-if="stampMode" class="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-rose-100 bg-[#fff1f5] px-3 py-2 text-sm text-[#be123c]">
                  <span class="material-symbols-rounded text-[18px] leading-none">bolt</span>
                  <span v-if="activeStampRule">当前规则：<strong>{{ activeStampRule.name }}</strong>（{{ activeStampRule.points > 0 ? '+' : '' }}{{ activeStampRule.points }}）— 点击学生即可评价</span>
                  <span v-else>请先选择一条评价规则，再点击学生卡片</span>
                </div>
                <div v-if="students.length && studentViewMode === 'grid'" class="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  <article v-for="student in displayedStudents" :key="student.id" class="rounded-[15px] border border-orange-200 bg-[#fff6e8] p-3 shadow-[0_4px_14px_rgba(170,103,53,0.06)] transition hover:-translate-y-0.5 hover:shadow-md" :class="stampMode && activeStampRule ? 'cursor-pointer ring-2 ring-rose-100 hover:ring-rose-300' : ''" @click="stampMode ? handleStudentCardClick(student) : undefined">
                    <div class="flex gap-3">
                      <button type="button" class="relative w-2/3 shrink-0 overflow-hidden rounded-2xl bg-white" @click.stop="handleStudentCardClick(student)">
                        <div class="aspect-square w-full"><img v-if="student.pet_type" :src="getStudentPetImage(student)" :alt="getPetType(student.pet_type)?.name" class="h-full w-full object-contain object-bottom" /><span v-else class="flex h-full w-full items-center justify-center text-4xl text-[#ccc]">?</span></div>
                        <span class="absolute bottom-2 left-2 rounded-full px-3 py-1 text-xs font-extrabold tracking-wide" :class="getLevelBadgeClass(getDisplayLevel(student))">Lv.{{ getDisplayLevel(student) }}</span>
                      </button>
                      <div class="flex min-w-0 w-1/3 flex-col justify-between py-2">
                        <div class="flex flex-nowrap items-center gap-1"><p class="min-w-0 text-sm font-bold leading-tight text-[#1a1a1a]">{{ student.name }}</p><span :class="[BADGE_CLASS, getStudentStatusTag(student).class]">{{ getStudentStatusTag(student).label }}</span></div>
                        <p v-if="student.student_no" class="mt-1 text-sm text-[#888]">学号：{{ student.student_no }}</p>
                        <div class="mt-3">
                          <div class="flex flex-nowrap items-center justify-between gap-1 text-xs text-[#888]"><span class="shrink-0 whitespace-nowrap">成长进度</span><span class="shrink-0 whitespace-nowrap">{{ getStudentProgress(student).current }}/{{ getStudentProgress(student).required }}</span></div>
                          <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-white"><div class="h-full rounded-full bg-[#ff9f1c]" :style="{ width: `${getStudentProgress(student).percent}%` }"></div></div>
                        </div>
                        <p class="mt-3 text-base font-extrabold text-[#ff7a1a]">积分 <span class="font-mono">{{ student.total_points }}</span></p>
                        <div class="mt-3 flex gap-2">
                          <button type="button" class="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-emerald-200 bg-white text-emerald-600 transition hover:bg-emerald-50" aria-label="加分" @click.stop="openCardQuickEval(student, true)"><span class="material-symbols-rounded text-[18px] leading-none">add</span></button>
                          <button type="button" class="inline-flex h-8 flex-1 items-center justify-center rounded-lg border border-rose-200 bg-white text-rose-500 transition hover:bg-rose-50" aria-label="扣分" @click.stop="openCardQuickEval(student, false)"><span class="material-symbols-rounded text-[18px] leading-none">remove</span></button>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
                <div v-else-if="students.length" class="mt-3 flex flex-col gap-2">
                  <article v-for="student in displayedStudents" :key="student.id" class="rounded-[15px] border border-orange-200 bg-[#fff6e8] px-3 py-2.5 transition hover:bg-[#fff1e0]" :class="stampMode && activeStampRule ? 'cursor-pointer ring-2 ring-rose-100 hover:ring-rose-300' : ''" @click="stampMode ? handleStudentCardClick(student) : undefined">
                    <div class="flex items-center gap-3">
                      <button type="button" class="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white" @click.stop="handleStudentCardClick(student)"><img v-if="student.pet_type" :src="getStudentPetImage(student)" :alt="getPetType(student.pet_type)?.name" class="h-full w-full object-contain p-1" /><span v-else class="text-xl">?</span><span class="absolute -bottom-1 -right-1 rounded-full px-2 py-0.5 text-xs font-extrabold tracking-wide" :class="getLevelBadgeClass(getDisplayLevel(student))">Lv.{{ getDisplayLevel(student) }}</span></button>
                      <div class="min-w-0 flex-1"><div class="flex flex-nowrap items-center gap-1"><p class="min-w-0 text-sm font-bold leading-tight">{{ student.name }}</p><span :class="[BADGE_CLASS, getStudentStatusTag(student).class]">{{ getStudentStatusTag(student).label }}</span></div><p class="mt-0.5 text-sm text-[#888]"><template v-if="student.student_no">学号：{{ student.student_no }} · </template>{{ student.pet_type ? getPetType(student.pet_type)?.name : '等待领养' }}</p><div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white"><div class="h-full rounded-full bg-[#ff9f1c]" :style="{ width: `${getStudentProgress(student).percent}%` }"></div></div></div>
                      <div class="shrink-0 text-right"><p class="text-sm font-bold text-[#ff7a1a]">{{ student.total_points }}</p><div class="mt-1 flex gap-1"><button type="button" class="rounded-md border border-emerald-200 px-2 py-1 text-sm font-bold text-emerald-600" @click.stop="openCardQuickEval(student, true)">+</button><button type="button" class="rounded-md border border-rose-200 px-2 py-1 text-sm font-bold text-rose-500" @click.stop="openCardQuickEval(student, false)">-</button></div></div>
                    </div>
                  </article>
                </div>
                <div v-else class="flex h-[322px] flex-col items-center justify-center text-center"><span class="material-symbols-rounded text-5xl text-[#ff9f1c]">pets</span><p class="mt-3 font-bold">先把学生带进宠物园</p><div class="mt-4 flex flex-wrap items-center justify-center gap-2"><button type="button" class="rounded-xl bg-[#ff5c00] px-4 py-2 text-sm font-bold text-white" @click="showStudentModal = true">添加学生</button><button type="button" class="inline-flex items-center gap-1.5 rounded-xl border border-orange-200 bg-white px-4 py-2 text-sm font-bold text-[#b85e25]" @click="() => openImportModal()"><span class="material-symbols-rounded text-[18px] leading-none">upload</span>批量导入</button></div></div>
                <button v-if="students.length > 6" type="button" class="mt-3 inline-flex w-full items-center justify-center gap-1 text-sm leading-none text-[#666] transition hover:text-[#ff5c00]" @click="toggleShowAllStudents"><span>{{ showAllStudents ? '收起学生列表' : `查看全部学生（${students.length}）` }}</span><span class="material-symbols-rounded text-[18px] leading-none">{{ showAllStudents ? 'expand_less' : 'expand_more' }}</span></button>
              </section>

              <section class="grid gap-3 xl:grid-cols-[330px_minmax(0,1fr)_330px]" :class="stampDimClass">
                <article class="rounded-[18px] border border-[#f0e7dd] bg-white p-[14px] shadow-[0_4px_16px_rgba(0,0,0,0.03)]"><div class="flex items-center justify-between"><h2 class="font-bold">今日记录</h2><router-link to="/records" class="text-sm text-[#ff5c00]">查看全部</router-link></div><div class="mt-3 space-y-2"><div v-for="record in evaluationRecords.slice(0, 5)" :key="record.id" class="flex items-center gap-2 border-b border-[#f3f0ec] pb-2 text-sm leading-5 last:border-0"><span :class="[BADGE_CLASS, record.points > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600']">{{ record.points > 0 ? '+' : '' }}{{ record.points }}</span><div class="min-w-0 flex-1"><p class="truncate">{{ record.student_name }} · {{ record.reason }}</p><p v-if="record.timestamp" class="text-sm text-[#aaa]">{{ formatRecordTime(record.timestamp) }}</p></div></div><p v-if="!evaluationRecords.length" class="py-5 text-center text-sm text-[#999]">今天还没有评价记录</p></div></article>
                <article class="rounded-[18px] border border-[#f0e7dd] bg-white p-[14px] shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#fff1e6] text-[#ff8a2b]">
                        <span class="material-symbols-rounded text-[18px] leading-none">trending_up</span>
                      </span>
                      <h2 class="font-bold">班级成长概览</h2>
                    </div>
                    <span :class="[BADGE_CLASS, 'bg-[#fff4ea] text-[#c07a45]']">本周</span>
                  </div>
                  <div class="mt-3">
                    <GrowthAreaChart :values="weeklyGrowthValues" :labels="weekDayLabels" />
                  </div>
                </article>
                <article class="rounded-[18px] border border-[#f0e7dd] bg-white p-[14px] shadow-[0_4px_16px_rgba(0,0,0,0.03)]">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#f3ebff] text-[#9b6bd4]">
                        <span class="material-symbols-rounded text-[18px] leading-none">pets</span>
                      </span>
                      <h2 class="text-sm font-bold text-[#333]">宠物图鉴</h2>
                    </div>
                    <router-link to="/preview" class="flex items-center gap-0.5 text-sm text-[#aaa] transition hover:text-[#ff5c00]">
                      更多<span class="material-symbols-rounded text-[14px] leading-none">chevron_right</span>
                    </router-link>
                  </div>
                  <div class="mt-3 space-y-2">
                    <div v-for="(row, rowIndex) in featuredGalleryPetRows" :key="rowIndex" class="grid grid-cols-5 gap-2">
                      <router-link
                        v-for="pet in row"
                        :key="pet.id"
                        to="/preview"
                        class="group flex min-w-0 flex-col items-center"
                      >
                        <div
                          class="relative aspect-[4/6] w-full overflow-hidden rounded-2xl border border-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_4px_12px_rgba(101,71,45,0.06)] transition group-hover:-translate-y-0.5 group-hover:shadow-[0_8px_18px_rgba(101,71,45,0.1)]"
                          :class="getPetGalleryStyle(pet).card"
                        >
                          <div class="absolute inset-x-2 bottom-1.5 z-20 h-3 rounded-full bg-black/[0.05]"></div>
                          <img
                            :src="getPetLevelImage(pet.id, 1)"
                            :alt="pet.name"
                            class="absolute inset-0 z-10 h-full w-full object-cover object-bottom transition duration-300 group-hover:scale-[1.06]"
                          />
                        </div>
                        <span class="mt-2 block w-full truncate text-center text-xs text-[#666]">{{ pet.name }}</span>
                      </router-link>
                    </div>
                  </div>
                  <div class="mt-3">
                    <div class="flex items-center gap-2 text-sm leading-4 text-[#888]">
                      <span class="shrink-0">已收集 {{ collectedPetCount }}/{{ PET_TYPES.length }}</span>
                      <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-[#f0f0f0]">
                        <span class="block h-full rounded-full bg-[#ff9f1c]" :style="{ width: `${collectionProgress}%` }"></span>
                      </div>
                    </div>
                    <router-link to="/preview" class="mt-2.5 flex w-full items-center justify-center rounded-full bg-[#fff1e8] py-2 text-sm font-semibold text-[#ff7a1a] transition hover:bg-[#ffe8d6]">查看全部图鉴</router-link>
                  </div>
                </article>
              </section>
            </template>

            <section v-else class="flex min-h-[60vh] flex-col items-center justify-center rounded-[18px] border border-[#f0e7dd] bg-white p-8 text-center shadow-sm"><span class="material-symbols-rounded text-5xl text-[#ff9f1c]">pets</span><h1 class="mt-5 text-3xl font-bold">创建你的第一个班级</h1><p class="mt-3 max-w-md text-sm leading-6 text-[#666]">从班级名单到宠物成长，让每天的肯定都成为孩子继续努力的理由。</p><div class="mt-6 flex flex-wrap items-center justify-center gap-3"><button type="button" class="rounded-xl bg-[#ff5c00] px-5 py-3 text-sm font-bold text-white" @click="openCreateClassModal">创建班级</button><button type="button" class="rounded-xl border border-[#ff5c00] bg-white px-5 py-3 text-sm font-bold text-[#ff5c00]" @click="enterDemoGarden">进入演示班级</button></div></section>
            </main>

            <aside v-if="classes.length" class="hidden w-[310px] shrink-0 xl:block">
            <div v-if="!stampMode" class="space-y-3">
            <section class="rounded-[18px] border border-[#f0e7dd] bg-white p-[14px]"><div class="flex items-center justify-between"><h2 class="font-bold">快速评价</h2><router-link to="/rules" class="text-sm text-[#ff5c00]">管理</router-link></div><div class="mt-3 flex gap-1.5"><button v-for="category in categories" :key="category" type="button" class="rounded-full border border-[#ededed] px-2 py-1 text-sm leading-4" :class="selectedEvalTab === category ? 'border-[#ff9f1c] bg-[#ff9f1c] text-white' : 'bg-white text-[#666]'" @click="onSidebarCategoryClick(category)">{{ category }}</button></div><div class="mt-2 divide-y divide-[#f3f0ec]"><button v-for="rule in currentCategoryRules.slice(0, 5)" :key="rule.id" type="button" class="flex min-h-10 w-full items-center justify-between gap-3 py-2 text-left text-[14px] leading-5" @click="onSidebarRuleClick(rule)"><span class="min-w-0 flex-1">{{ rule.name }}</span><span class="shrink-0 text-[15px] font-bold leading-5" :class="rule.points > 0 ? 'text-emerald-600' : 'text-rose-600'">{{ rule.points > 0 ? '+' : '' }}{{ rule.points }}</span></button></div></section>
            <section class="rounded-[18px] border border-[#f0e7dd] bg-white p-[14px]">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <span class="flex h-5 w-5 items-center justify-center rounded-full bg-[#fff4e6]">
                    <span class="material-symbols-rounded text-sm leading-none text-[#ff9f1c]">assignment</span>
                  </span>
                  <h2 class="text-[15px] font-bold">进行中任务</h2>
                </div>
                <router-link to="/tasks" class="flex items-center gap-0.5 text-sm text-[#a6a6a6] transition hover:text-[#ff5c00]">
                  全部
                  <span class="material-symbols-rounded text-sm leading-none">chevron_right</span>
                </router-link>
              </div>
              <div class="mt-3 space-y-2">
                <router-link
                  v-for="task in activeTasks"
                  :key="task.id"
                  :to="`/tasks?taskId=${task.id}`"
                  class="block rounded-xl border border-[#f3f0ec] px-3 py-2 transition hover:bg-[#fffaf5]"
                >
                  <p class="truncate text-sm font-semibold text-[#333]">{{ task.title }}</p>
                  <p class="mt-0.5 text-sm text-[#999]">{{ task.completedCount }}/{{ task.totalCount }} 已完成</p>
                </router-link>
                <p v-if="!activeTasks.length" class="py-2 text-center text-sm text-[#bbb]">暂无进行中任务</p>
              </div>
            </section>
            <section class="rounded-[18px] border border-[#f0e7dd] bg-white p-[14px]">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-1.5">
                  <span class="flex h-5 w-5 items-center justify-center rounded-full bg-[#fff4e6]">
                    <span class="material-symbols-rounded text-sm leading-none text-[#ff9f1c]">emoji_events</span>
                  </span>
                  <h2 class="text-[15px] font-bold">班级排行榜</h2>
                </div>
                <router-link to="/ranking" class="flex items-center gap-0.5 text-sm text-[#a6a6a6] transition hover:text-[#ff5c00]">
                  更多
                  <span class="material-symbols-rounded text-sm leading-none">chevron_right</span>
                </router-link>
              </div>
              <div class="mt-3 space-y-1.5">
                <RankListRow
                  v-for="(student, index) in ranking.slice(0, 5)"
                  :key="student.id"
                  :student="student"
                  :index="index"
                  @select="openDetailPanel"
                />
                <p v-if="!ranking.length" class="py-5 text-center text-sm text-[#999]">暂无排行数据</p>
              </div>
            </section>
            <section class="rounded-[18px] border border-[#f0e7dd] bg-white p-[14px]"><div class="flex items-center justify-between"><h2 class="font-bold">待关注学生</h2><span class="text-sm text-[#999]">{{ students.filter(student => !student.pet_type).length }} 人</span></div><div class="mt-3 space-y-2"><div v-for="student in students.filter(student => !student.pet_type).slice(0, 3)" :key="student.id" class="flex items-center justify-between rounded-xl bg-[#fffdfc] p-2"><span class="text-sm">{{ student.name }}</span><button type="button" class="rounded-lg bg-[#fff1e8] px-2.5 py-1 text-sm font-semibold text-[#ff5c00]" @click="openPetSelect(student)">鼓励一下</button></div><p v-if="!students.some(student => !student.pet_type)" class="py-5 text-center text-sm text-[#999]">所有学生都有宠物伙伴</p></div></section>
            </div>
            <Transition>
              <div
                v-if="stampMode"
                class="sticky top-5 z-30 flex max-h-[calc(100vh-2.5rem)] w-full flex-col overflow-auto rounded-[18px] border border-rose-200 bg-white p-3 shadow-[0_8px_28px_rgba(190,18,60,0.12)]"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2 text-sm font-semibold text-[#be123c]">
                    <span class="flex h-7 w-7 items-center justify-center rounded-full bg-[#fff1f5]"><span class="material-symbols-rounded text-[16px] leading-none">bolt</span></span>
                    快速评价
                  </div>
                  <router-link to="/rules" class="text-sm text-[#ff5c00]">管理</router-link>
                  <button type="button" class="rounded-lg bg-[#fff1f5] px-3 py-1.5 text-sm font-semibold text-[#be123c]" @click="cancelStampMode">完成</button>
                </div>
                <div class="mt-3 flex flex-wrap gap-1.5">
                  <button v-for="category in categories" :key="category" type="button" class="rounded-full border px-2.5 py-1 text-sm font-semibold" :class="stampEvalTab === category ? 'border-[#ff9f1c] bg-[#ff9f1c] text-white' : 'border-[#ededed] bg-white text-[#666]'" @click="stampEvalTab = category">{{ category }}</button>
                </div>
                <div class="mt-2 divide-y divide-[#f3f0ec]">
                  <button v-for="rule in stampCategoryRules" :key="rule.id" type="button" class="flex min-h-10 w-full items-center justify-between gap-3 py-2 text-left text-[14px] leading-5 transition" :class="activeStampRule?.id === rule.id ? 'rounded-lg bg-[#fff1f5] px-2' : ''" @click="selectStampRule(rule)">
                    <span class="min-w-0 flex-1">{{ rule.name }}</span>
                    <span class="shrink-0 text-[15px] font-bold leading-5" :class="rule.points > 0 ? 'text-emerald-600' : 'text-rose-600'">{{ rule.points > 0 ? '+' : '' }}{{ rule.points }}</span>
                  </button>
                </div>
                <p class="mt-auto pt-3 text-sm text-[#888]">
                  <span v-if="activeStampRule">已选「{{ activeStampRule.name }}」，点击学生卡片即可连续评价</span>
                  <span v-else>先选一条规则，再点学生卡片</span>
                </p>
              </div>
            </Transition>
            </aside>

            <Transition>
              <div
                v-if="stampMode"
                class="fixed inset-x-3 bottom-20 z-50 rounded-2xl border border-rose-200 bg-white/95 p-3 shadow-[0_12px_36px_rgba(190,18,60,0.16)] backdrop-blur xl:hidden"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="flex items-center gap-2 text-sm font-semibold text-[#be123c]">
                    <span class="flex h-7 w-7 items-center justify-center rounded-full bg-[#fff1f5]"><span class="material-symbols-rounded text-[16px] leading-none">bolt</span></span>
                    快速评价
                  </div>
                  <button type="button" class="rounded-lg bg-[#fff1f5] px-3 py-1.5 text-sm font-semibold text-[#be123c]" @click="cancelStampMode">完成</button>
                </div>
                <div class="mt-3 flex flex-wrap gap-1.5">
                  <button v-for="category in categories" :key="category" type="button" class="rounded-full border px-2.5 py-1 text-sm font-semibold" :class="stampEvalTab === category ? 'border-[#ff9f1c] bg-[#ff9f1c] text-white' : 'border-[#ededed] bg-white text-[#666]'" @click="stampEvalTab = category">{{ category }}</button>
                </div>
                <div class="mt-3 flex gap-2 overflow-x-auto pb-1">
                  <button v-for="rule in stampCategoryRules" :key="rule.id" type="button" class="shrink-0 rounded-xl border px-3 py-2 text-left text-sm font-semibold transition" :class="stampRuleButtonClass(rule)" @click="selectStampRule(rule)">
                    <span class="font-mono text-base font-bold">{{ rule.points > 0 ? '+' : '' }}{{ rule.points }}</span>
                    <span class="mt-1 block whitespace-nowrap">{{ rule.name }}</span>
                  </button>
                </div>
                <p class="mt-2 text-sm text-[#888]">
                  <span v-if="activeStampRule">已选「{{ activeStampRule.name }}」，点击学生卡片即可连续评价</span>
                  <span v-else>先选一条规则，再点学生卡片</span>
                </p>
              </div>
            </Transition>
          </div>
        </div>
      </AppShell>
    </template>

    <Transition><div v-if="showClassModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4"><div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><p class="text-sm font-bold tracking-wider text-orange-600">CLASS</p><h2 class="mt-1 font-serif text-2xl font-bold">{{ editingClass ? '编辑班级' : '创建班级' }}</h2><input v-model="newClassName" class="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" placeholder="例如：三年二班" @keyup.enter="editingClass ? updateClass() : createClass()" /><div class="mt-5 flex justify-end gap-2"><button type="button" class="px-4 py-2 text-sm" @click="showClassModal = false">取消</button><button type="button" class="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white" @click="editingClass ? updateClass() : createClass()">确认</button></div></div></div></Transition>
    <Transition><div v-if="showStudentModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4"><div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"><h2 class="font-serif text-2xl font-bold">添加学生</h2><input v-model="newStudentName" class="mt-5 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" placeholder="学生姓名" /><input v-model="newStudentNo" class="mt-3 w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-orange-400" placeholder="学号（可选）" /><div class="mt-5 flex justify-end gap-2"><button type="button" class="px-4 py-2 text-sm" @click="showStudentModal = false">取消</button><button type="button" class="rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white" @click="addStudent">添加</button></div></div></div></Transition>
    <Transition><div v-if="showAddModal" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4"><div class="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl"><div class="flex items-center justify-between"><div><p class="text-sm font-bold tracking-wider text-orange-600">EVALUATION</p><h2 class="mt-1 font-serif text-2xl font-bold">为 {{ selectedStudent?.name }} 评价</h2></div><button type="button" class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100" @click="closeAddModal"><span class="material-symbols-rounded text-[20px]">close</span></button></div><div class="mt-5 flex flex-wrap gap-2"><button v-for="cat in categories" :key="cat" type="button" class="rounded-full px-4 py-2 text-sm font-semibold" :class="selectedEvalTab === cat ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'" @click="selectedEvalTab = cat">{{ cat }}</button></div><div class="mt-5 grid gap-3 sm:grid-cols-3"><button v-for="rule in modalEvaluationRules" :key="rule.id" type="button" class="rounded-2xl border p-4 text-left" :class="rule.points > 0 ? 'border-emerald-100 bg-emerald-50' : 'border-rose-100 bg-rose-50'" @click="modalQuickAdd(rule)"><span class="text-xl font-bold" :class="rule.points > 0 ? 'text-emerald-600' : 'text-rose-600'">{{ rule.points > 0 ? '+' : '' }}{{ rule.points }}</span><span class="mt-3 block text-sm font-semibold">{{ rule.name }}</span></button></div><p v-if="!modalEvaluationRules.length" class="py-8 text-center text-sm text-slate-400">当前分类下没有可用规则</p></div></div></Transition>
    <Transition><div v-if="showDetailPanel && detailStudent" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30 p-4" @click.self="closeDetailPanel"><div class="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white shadow-2xl"><div class="bg-orange-600 px-6 pb-3.5 pt-5 text-white"><div class="flex gap-4"><div class="flex h-[108px] w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/20 sm:h-[116px] sm:w-28"><img v-if="detailStudent.pet_type" :src="getStudentPetImage(detailStudent)" class="h-full w-full rounded-2xl object-contain" /><span v-else class="text-4xl">?</span></div><div class="flex min-w-0 flex-1 flex-col"><div class="flex items-start justify-between gap-3"><div class="min-w-0"><h2 class="font-serif text-2xl font-bold">{{ detailStudent.name }}</h2><p class="mt-1 text-sm text-orange-100">{{ getPetType(detailStudent.pet_type || '')?.name || '等待领养' }} · Lv.{{ getDisplayLevel(detailStudent) }} · {{ detailStudent.total_points }} 积分</p></div><div class="flex shrink-0 items-center gap-1.5 sm:gap-2"><button v-if="!detailStudent.pet_type" type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white transition hover:bg-white/20 sm:order-1 sm:w-auto sm:gap-1 sm:px-3" aria-label="领养宠物" @click="openPetSelect(detailStudent)"><span class="material-symbols-rounded text-[18px]">pets</span><span class="hidden sm:inline">领养</span></button><button v-if="detailStudent.pet_type" type="button" class="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white transition hover:bg-white/20 sm:order-1 sm:w-auto sm:gap-1 sm:px-3" aria-label="更换宠物" @click="openPetSelect(detailStudent)"><span class="material-symbols-rounded text-[18px]">swap_horiz</span><span class="hidden sm:inline">更换宠物</span></button><button type="button" class="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:order-3" aria-label="关闭" @click="closeDetailPanel"><span class="material-symbols-rounded text-[20px]">close</span></button><button type="button" class="hidden h-8 items-center gap-1 rounded-full bg-white/10 px-3 text-sm font-semibold text-white transition hover:bg-rose-500/80 sm:order-2 sm:inline-flex" aria-label="删除学生" data-testid="delete-student-button" @click="deleteDetailStudent"><span class="material-symbols-rounded text-[18px]">delete</span><span>删除</span></button></div></div><div class="mt-2"><div class="mb-1 flex items-center justify-between text-xs text-orange-100"><span>成长进度</span><span>Lv.{{ getDisplayLevel(detailStudent) }} · {{ getLevelProgress(detailStudent.pet_exp).current }}/{{ getLevelProgress(detailStudent.pet_exp).required }}</span></div><div class="h-2.5 overflow-hidden rounded-full bg-white/30"><div class="h-full rounded-full bg-white" :style="{ width: `${getLevelProgress(detailStudent.pet_exp).percentage}%` }"></div></div></div></div></div></div><div class="p-6"><h3 class="font-serif text-xl font-bold">快速评价</h3><div class="mt-4 flex flex-wrap gap-2"><button v-for="cat in categories" :key="cat" type="button" class="rounded-full px-3 py-1.5 text-sm font-bold" :class="detailEvalTab === cat ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'" @click="detailEvalTab = cat">{{ cat }}</button></div><div class="mt-4 grid gap-2 sm:grid-cols-3"><button v-for="rule in rules.filter(rule => rule.category === detailEvalTab)" :key="rule.id" type="button" class="rounded-xl border p-3 text-left" :class="rule.points > 0 ? 'border-emerald-100 bg-emerald-50' : 'border-rose-100 bg-rose-50'" @click="detailQuickAdd(rule)"><b :class="rule.points > 0 ? 'text-emerald-600' : 'text-rose-600'">{{ rule.points > 0 ? '+' : '' }}{{ rule.points }}</b><span class="mt-1 block text-sm font-semibold">{{ rule.name }}</span></button></div><div class="mt-7 flex items-center justify-between gap-3"><h3 class="font-serif text-xl font-bold">最近记录</h3><button type="button" class="inline-flex h-8 shrink-0 items-center gap-1 rounded-full border border-orange-200 bg-[#fff7ed] px-3 text-sm font-semibold text-[#c2410c] transition hover:bg-[#ffedd5]" aria-label="分享成长记录" @click="shareDetailStudentRecords"><span class="material-symbols-rounded text-[16px]">share</span><span class="hidden sm:inline">分享成长</span></button></div><div class="mt-3 space-y-2"><div v-for="record in studentRecords.slice(0, 5)" :key="record.id" class="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm"><span>{{ record.reason }}</span><span :class="record.points > 0 ? 'text-emerald-600' : 'text-rose-600'" class="font-bold">{{ record.points > 0 ? '+' : '' }}{{ record.points }}</span></div><p v-if="!studentRecords.length" class="py-5 text-center text-sm text-slate-400">暂无评价记录</p></div></div></div></div></Transition>
    <Transition><div v-if="showPetModal" class="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 p-4"><div class="max-h-[85vh] w-full max-w-3xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl"><div class="flex items-center justify-between"><h2 class="font-serif text-2xl font-bold">为 {{ selectedStudent?.name }} 选择宠物</h2><button type="button" class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100" @click="showPetModal = false"><span class="material-symbols-rounded text-[20px]">close</span></button></div><p v-if="!currentClassVipActive" class="mt-4 rounded-xl bg-[#fff7ed] px-4 py-3 text-sm text-[#9a735d]"><span class="material-symbols-rounded mr-1 align-middle text-[18px] text-[#f59e0b]">workspace_premium</span>神兽伙伴需开通灵犀计划（VIP）后才能领养，普通伙伴不受影响。</p><div class="mt-5 grid grid-cols-3 gap-3 sm:grid-cols-5"><button v-for="pet in PET_TYPES" :key="pet.id" type="button" :disabled="isPetAdoptionLocked(pet)" class="relative rounded-2xl border p-2 transition" :class="isPetAdoptionLocked(pet) ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-60 grayscale' : 'border-slate-100 hover:border-orange-300 hover:shadow-sm'" @click="selectPet(pet.id)"><span v-if="pet.category === 'mythical'" :class="[BADGE_CLASS, 'absolute right-1.5 top-1.5 z-10 bg-white text-[#ae6b44]']">神兽</span><span v-if="isPetAdoptionLocked(pet)" class="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-slate-900/10"><span class="material-symbols-rounded text-2xl text-slate-500">lock</span></span><img :src="getPetLevel1Image(pet.id)" :alt="pet.name" class="aspect-square w-full object-contain" /><span class="mt-1 block text-sm font-bold" :class="isPetAdoptionLocked(pet) ? 'text-slate-400' : ''">{{ pet.name }}</span></button><button v-if="selectedStudent?.pet_type" type="button" class="rounded-2xl border border-rose-200 bg-rose-50 p-2 transition hover:border-rose-300 hover:shadow-sm" aria-label="取消宠物" @click="removePet"><div class="flex aspect-square w-full items-center justify-center"><span class="material-symbols-rounded text-4xl text-rose-400">heart_minus</span></div><span class="mt-1 block text-sm font-bold text-rose-500">取消宠物</span></button></div></div></div></Transition>
    <Transition>
      <div v-if="showTeacherProfile" class="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/30 p-4" @click.self="closeTeacherProfile">
        <div class="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-3xl bg-white p-6 shadow-2xl">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-bold tracking-[0.16em] text-[#d78248]">TEACHER PROFILE</p>
              <h2 class="mt-1 font-serif text-2xl font-bold text-[#422d20]">教师账号信息</h2>
            </div>
            <button type="button" class="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100" aria-label="关闭" @click="closeTeacherProfile">
              <span class="material-symbols-rounded text-[20px]">close</span>
            </button>
          </div>

          <div v-if="teacherProfileLoading" class="mt-8 rounded-2xl bg-[#fff8f2] px-5 py-14 text-center text-sm text-[#a1836d]">加载中…</div>

          <template v-else-if="teacherProfile">
            <div class="mt-6 flex items-center gap-4 rounded-2xl bg-[#fff8f2] p-4">
              <span class="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#ffe7c8] text-[#d97706]">
                <span class="material-symbols-rounded text-[32px]">person</span>
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-xl font-bold text-[#422d20]">{{ teacherProfile.user.username }}</p>
                <p class="mt-1 text-sm text-[#9a735d]">{{ teacherProfile.user.accountType || '教师' }}账号</p>
                <p class="mt-1 text-sm text-[#b0927c]">注册于 {{ formatProfileDate(teacherProfile.user.createdAt) }}</p>
              </div>
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-3">
              <div class="rounded-xl border border-[#f3ece4] bg-[#fffdfb] px-4 py-3 sm:col-span-2">
                <p class="text-sm text-[#9a735d]">用户 ID</p>
                <p class="mt-1 break-all font-mono text-sm font-semibold text-[#422d20]">{{ teacherProfile.user.id }}</p>
              </div>
              <div class="rounded-xl border border-[#f3ece4] bg-[#fffdfb] px-4 py-3 sm:col-span-1">
                <p class="text-sm text-[#9a735d]">账号类型</p>
                <p class="mt-1 text-sm font-semibold text-[#422d20]">{{ teacherProfile.user.accountType || '教师' }}</p>
              </div>
            </div>

            <div class="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-5">
              <div class="rounded-xl bg-[#fff3e7] px-3 py-3 text-center">
                <p class="text-lg font-bold text-[#b76129]">{{ teacherProfile.stats.classCount }}</p>
                <p class="mt-0.5 text-sm text-[#9e704f]">班级</p>
              </div>
              <div class="rounded-xl bg-[#ecfdf5] px-3 py-3 text-center">
                <p class="text-lg font-bold text-[#059669]">{{ teacherProfile.stats.studentCount }}</p>
                <p class="mt-0.5 text-sm text-[#6b8f7d]">学生</p>
              </div>
              <div class="rounded-xl bg-[#fff1f2] px-3 py-3 text-center">
                <p class="text-lg font-bold text-[#e11d48]">{{ teacherProfile.stats.evaluationCount }}</p>
                <p class="mt-0.5 text-sm text-[#b07a84]">评价</p>
              </div>
              <div class="rounded-xl bg-[#eff6ff] px-3 py-3 text-center">
                <p class="text-lg font-bold text-[#2563eb]">{{ teacherProfile.stats.taskCount }}</p>
                <p class="mt-0.5 text-sm text-[#6b8f9f]">任务</p>
              </div>
              <div class="rounded-xl bg-[#f5f3ff] px-3 py-3 text-center col-span-2 sm:col-span-1">
                <p class="text-lg font-bold text-[#7c3aed]">{{ teacherProfile.stats.badgeCount }}</p>
                <p class="mt-0.5 text-sm text-[#8b7cb0]">徽章</p>
              </div>
            </div>

            <div class="mt-5">
              <div class="flex items-center justify-between">
                <h3 class="text-sm font-bold text-[#795f50]">我的班级</h3>
                <span class="text-sm text-[#b0927c]">{{ teacherProfile.classes.length }} 个</span>
              </div>
              <div v-if="teacherProfile.classes.length" class="mt-3 max-h-56 space-y-2 overflow-auto">
                <button
                  v-for="cls in teacherProfile.classes"
                  :key="cls.id"
                  type="button"
                  class="w-full rounded-xl border px-4 py-3 text-left transition"
                  :class="cls.id === currentClass?.id
                    ? 'border-orange-200 bg-[#fff0e2] ring-1 ring-orange-100'
                    : 'border-[#f3ece4] bg-[#fffdfb] hover:border-orange-200 hover:bg-[#fff7f1]'"
                  @click="switchClassFromProfile(cls)"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="min-w-0">
                      <div class="flex items-center gap-2">
                        <p class="truncate font-semibold" :class="cls.id === currentClass?.id ? 'text-[#b85e25]' : 'text-[#422d20]'">{{ cls.name }}</p>
                        <span v-if="cls.id === currentClass?.id" class="shrink-0 rounded-full bg-[#ffedd5] px-2 py-0.5 text-xs font-semibold text-[#c2410c]">当前</span>
                      </div>
                      <p class="mt-1 text-sm text-[#9a735d]">{{ cls.studentCount }} 名学生</p>
                    </div>
                    <p class="shrink-0 text-sm text-[#b0927c]">{{ formatProfileDate(cls.createdAt) }}</p>
                  </div>
                </button>
              </div>
              <p v-else class="mt-3 rounded-xl bg-[#fff8f2] px-4 py-6 text-center text-sm text-[#9a735d]">还没有创建班级</p>
            </div>

            <div class="mt-6 flex justify-end gap-2 border-t border-[#f3f0ec] pt-4">
              <button type="button" class="px-4 py-2 text-sm" @click="closeTeacherProfile">关闭</button>
              <button type="button" class="rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600" @click="handleTeacherLogout">退出登录</button>
            </div>
          </template>
        </div>
      </div>
    </Transition>

    <ConfirmDialog :show="confirmDialog.show" :title="confirmDialog.title" :message="confirmDialog.message" :confirm-text="confirmDialog.confirmText" :cancel-text="confirmDialog.cancelText" :type="confirmDialog.type" @confirm="confirmDialog.onConfirm" @cancel="confirmDialog.show = false" />
  </div>
</template>
