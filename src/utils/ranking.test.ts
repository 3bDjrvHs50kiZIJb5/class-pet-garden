import { describe, it, expect } from 'vitest'
import {
  getRankBadge,
  getRankBadgeStyle,
  getRankSubtitle,
  getRankingStats,
  sortRanking,
  takeTopRanking,
} from './ranking'
import type { RankingStudent } from './ranking'

function makeStudent(overrides: Partial<RankingStudent> = {}): RankingStudent {
  return {
    id: 's1',
    class_id: 'c1',
    name: '测试学生',
    student_no: null,
    total_points: 0,
    pet_type: null,
    pet_level: 1,
    pet_exp: 0,
    ...overrides,
  }
}

describe('ranking utils', () => {
  it('sortRanking 应按积分降序，同分按 pet_level 降序', () => {
    const students = [
      makeStudent({ id: 'a', total_points: 100, pet_level: 3 }),
      makeStudent({ id: 'b', total_points: 120, pet_level: 1 }),
      makeStudent({ id: 'c', total_points: 100, pet_level: 5 }),
    ]
    const sorted = sortRanking(students)
    expect(sorted.map(student => student.id)).toEqual(['b', 'c', 'a'])
  })

  it('getRankBadge 前三名返回奖杯图标', () => {
    expect(getRankBadge(0).type).toBe('icon')
    expect(getRankBadge(2).type).toBe('icon')
    expect(getRankBadge(3).type).toBe('text')
    expect(getRankBadge(3).value).toBe('4')
  })

  it('getRankBadgeStyle 前三名使用高亮配色', () => {
    expect(getRankBadgeStyle(0).badgeBg).toBe('bg-[#fff4e6]')
    expect(getRankBadgeStyle(3).badgeBg).toBe('bg-white')
  })

  it('getRankSubtitle 根据学生状态返回文案', () => {
    expect(getRankSubtitle(makeStudent())).toBe('等待领养宠物')
    expect(getRankSubtitle(makeStudent({ pet_type: 'corgi', pet_exp: 40, pet_level: 2 }))).toBe('Lv.2 · 新秀')
    expect(getRankSubtitle(makeStudent({ pet_type: 'corgi', pet_exp: 700, pet_level: 8, badge_count: 2 }))).toBe('已毕业 · 2 枚徽章')
  })

  it('takeTopRanking 只保留前 11 名', () => {
    const students = Array.from({ length: 15 }, (_, index) =>
      makeStudent({ id: `s${index}`, total_points: 100 - index })
    )
    expect(takeTopRanking(students)).toHaveLength(11)
    expect(takeTopRanking(students)[10].id).toBe('s10')
  })

  it('getRankingStats 计算班级统计', () => {
    const stats = getRankingStats([
      makeStudent({ total_points: 100 }),
      makeStudent({ total_points: 200 }),
    ])
    expect(stats).toEqual({ count: 2, totalPoints: 300, averagePoints: 150 })
  })
})
