export const CATEGORY_DISPLAY_LIMIT = 20

export function normalizeRecordCategory(
  category: string | null | undefined,
  categories: readonly string[]
) {
  const trimmed = (category || '').trim()
  if (!trimmed) return '其他'
  return categories.includes(trimmed) ? trimmed : '其他'
}

export function groupRecordsByCategory<T extends { id: string; category?: string | null }>(
  records: T[],
  categories: readonly string[],
  limit = CATEGORY_DISPLAY_LIMIT
) {
  return categories.map(category => {
    const all = records.filter(record => normalizeRecordCategory(record.category, categories) === category)
    return {
      category,
      total: all.length,
      records: all.slice(0, limit),
      truncated: all.length > limit
    }
  })
}

export function getUngroupedRecords<T extends { id: string; category?: string | null }>(
  records: T[],
  categories: readonly string[],
  limit = CATEGORY_DISPLAY_LIMIT
) {
  const groupedIds = new Set(
    groupRecordsByCategory(records, categories, Number.POSITIVE_INFINITY).flatMap(group =>
      group.records.map(record => record.id)
    )
  )
  const all = records.filter(record => !groupedIds.has(record.id))
  return {
    total: all.length,
    records: all.slice(0, limit),
    truncated: all.length > limit
  }
}
