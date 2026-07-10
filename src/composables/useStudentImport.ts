import { computed, ref } from 'vue'
import { useAuth } from './useAuth'
import { saveCurrentClassId, getSavedClassId } from './useClassVip'
import { toast } from './useToast'
import type { Class } from '@/types'

export const STUDENTS_IMPORTED_EVENT = 'pet-garden:students-imported'

const showImportModal = ref(false)
const importText = ref('')
const importing = ref(false)
const importClasses = ref<Class[]>([])
const selectedImportClassId = ref('')
const showCreateClassInline = ref(false)
const newImportClassName = ref('')
const creatingClass = ref(false)
const showImportConfirm = ref(false)
const pendingImportCount = ref(0)
const currentClassStudentCount = ref<number | null>(null)

export function setCurrentClassStudentCount(count: number | null) {
  currentClassStudentCount.value = count
}

export function useStudentImport() {
  const { api, user } = useAuth()

  const showImportStudents = computed(() => currentClassStudentCount.value === 0)

  async function refreshCurrentClassStudentCount() {
    const savedClassId = getSavedClassId(user.value?.id)
    if (!savedClassId) {
      currentClassStudentCount.value = null
      return
    }

    try {
      const res = await api.get(`/classes/${savedClassId}/students`)
      currentClassStudentCount.value = (res.data.students || []).length
    } catch (error) {
      console.error('加载当前班级学生数失败:', error)
      currentClassStudentCount.value = null
    }
  }

  const selectedImportClass = computed(() =>
    importClasses.value.find(cls => cls.id === selectedImportClassId.value) || null
  )

  const importConfirmMessage = computed(() => {
    const className = selectedImportClass.value?.name || '当前班级'
    return `确定将 ${pendingImportCount.value} 名学生全部导入到「${className}」吗？`
  })

  async function loadImportClasses() {
    const res = await api.get('/classes')
    importClasses.value = res.data.classes || []

    if (!importClasses.value.length) {
      selectedImportClassId.value = ''
      return
    }

    const savedClassId = getSavedClassId(user.value?.id)
    const savedClass = savedClassId
      ? importClasses.value.find(cls => cls.id === savedClassId)
      : null
    selectedImportClassId.value = savedClass?.id || importClasses.value[0].id
  }

  function parseImportStudents() {
    const lines = importText.value.trim().split('\n')
    const students: { name: string; studentNo: string }[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue

      const parts = trimmed.split(/[\t,\s;]+/)
      if (parts.length >= 2) {
        students.push({ name: parts[0], studentNo: parts.slice(1).join('') })
      } else if (parts.length === 1) {
        students.push({ name: parts[0], studentNo: '' })
      }
    }

    return students
  }

  function notifyClassesChanged(classId: string, imported = 0) {
    window.dispatchEvent(new CustomEvent(STUDENTS_IMPORTED_EVENT, {
      detail: { classId, imported }
    }))
  }

  async function openImportModal(options?: { expandCreateClass?: boolean }) {
    importText.value = ''
    showCreateClassInline.value = options?.expandCreateClass ?? false
    newImportClassName.value = ''
    showImportConfirm.value = false
    await loadImportClasses()
    showImportModal.value = true
  }

  function closeImportModal() {
    showImportModal.value = false
    importText.value = ''
    showCreateClassInline.value = false
    newImportClassName.value = ''
    showImportConfirm.value = false
  }

  function selectImportClass(classId: string) {
    selectedImportClassId.value = classId
    saveCurrentClassId(classId, user.value?.id)
  }

  async function createClassInImport() {
    if (!newImportClassName.value.trim()) {
      toast.warning('请输入班级名称')
      return
    }

    creatingClass.value = true
    try {
      const res = await api.post('/classes', { name: newImportClassName.value.trim() })
      await loadImportClasses()
      selectedImportClassId.value = res.data.id
      saveCurrentClassId(res.data.id, user.value?.id)
      newImportClassName.value = ''
      showCreateClassInline.value = false
      toast.success('班级创建成功')
      notifyClassesChanged(res.data.id, 0)
    } catch (error) {
      console.error('创建班级失败:', error)
      toast.error('创建班级失败，请重试')
    } finally {
      creatingClass.value = false
    }
  }

  function requestImportStudents() {
    if (!importText.value.trim() || importing.value) return

    if (!selectedImportClassId.value) {
      toast.warning('请先选择或创建班级')
      return
    }

    const students = parseImportStudents()
    if (students.length === 0) {
      toast.warning('没有识别到学生信息')
      return
    }

    pendingImportCount.value = students.length
    showImportConfirm.value = true
  }

  function cancelImportConfirm() {
    showImportConfirm.value = false
  }

  async function confirmImportStudents() {
    showImportConfirm.value = false

    const students = parseImportStudents()
    const classId = selectedImportClassId.value
    if (!classId || students.length === 0) return

    importing.value = true
    try {
      const res = await api.post('/students/import', {
        classId,
        students
      })
      saveCurrentClassId(classId, user.value?.id)
      toast.success(`成功导入 ${res.data.imported} 名学生到「${selectedImportClass.value?.name || '班级'}」`)
      closeImportModal()
      notifyClassesChanged(classId, res.data.imported)
      await refreshCurrentClassStudentCount()
    } catch (error) {
      console.error('导入失败:', error)
      toast.error('导入失败，请重试')
    } finally {
      importing.value = false
    }
  }

  return {
    showImportStudents,
    refreshCurrentClassStudentCount,
    showImportModal,
    importText,
    importing,
    importClasses,
    selectedImportClassId,
    selectedImportClass,
    showCreateClassInline,
    newImportClassName,
    creatingClass,
    showImportConfirm,
    importConfirmMessage,
    openImportModal,
    closeImportModal,
    selectImportClass,
    createClassInImport,
    requestImportStudents,
    cancelImportConfirm,
    confirmImportStudents
  }
}
