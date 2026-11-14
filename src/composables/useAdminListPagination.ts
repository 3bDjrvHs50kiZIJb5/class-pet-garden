import { computed, ref, watch, type Ref } from 'vue'

export const ADMIN_LIST_PAGE_SIZE = 10

export function useAdminListPagination<T>(source: Ref<T[]>, pageSize = ADMIN_LIST_PAGE_SIZE) {
  const page = ref(1)

  const total = computed(() => source.value.length)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

  const pagedItems = computed(() => {
    const start = (page.value - 1) * pageSize
    return source.value.slice(start, start + pageSize)
  })

  watch(source, () => {
    if (page.value > pageCount.value) {
      page.value = pageCount.value
    }
  })

  watch(total, () => {
    page.value = 1
  })

  function setPage(next: number) {
    page.value = Math.min(Math.max(1, next), pageCount.value)
  }

  return { page, total, pageCount, pagedItems, setPage, pageSize }
}