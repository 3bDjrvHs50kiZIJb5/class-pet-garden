import { describe, expect, it } from 'vitest'
import {
  CATEGORY_DISPLAY_LIMIT,
  getUngroupedRecords,
  groupRecordsByCategory
} from './recordGroups'

const categories = ['学习', '行为', '健康', '其他'] as const

function makeRecord(id: string, category: string) {
  return { id, category }
}

describe('recordGroups', () => {
  it('每个分类列最多显示 20 条记录', () => {
    const records = Array.from({ length: 25 }, (_, index) =>
      makeRecord(`learning-${index}`, '学习')
    )

    const groups = groupRecordsByCategory(records, categories)

    expect(groups[0].total).toBe(25)
    expect(groups[0].records).toHaveLength(CATEGORY_DISPLAY_LIMIT)
    expect(groups[0].truncated).toBe(true)
  })

  it('未超出上限时不截断', () => {
    const records = [makeRecord('1', '学习'), makeRecord('2', '行为')]

    const groups = groupRecordsByCategory(records, categories)

    expect(groups[0].records).toHaveLength(1)
    expect(groups[0].truncated).toBe(false)
    expect(groups[1].records).toHaveLength(1)
  })

  it('未知分类会归入「其他」列', () => {
    const records = [makeRecord('1', '未知分类')]

    const groups = groupRecordsByCategory(records, categories)

    expect(groups[3].category).toBe('其他')
    expect(groups[3].records).toHaveLength(1)
    expect(getUngroupedRecords(records, categories).total).toBe(0)
  })
})
