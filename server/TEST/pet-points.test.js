import { describe, it, expect } from 'vitest'
import { calculateLevel } from '../utils/level.js'

describe('宠物积分与等级', () => {
  it('更换宠物后应按增量累计 pet_exp，而不是直接同步 total_points', () => {
    const student = { pet_exp: 0, total_points: 0, pet_level: 1 }
    const points = 2

    const newExp = Math.max(0, student.pet_exp + points)
    const newLevel = calculateLevel(newExp)

    expect(newExp).toBe(2)
    expect(newLevel).toBe(1)
  })

  it('若错误地把 pet_exp 同步为历史 total_points，会导致等级跳跃', () => {
    const student = { pet_exp: 0, total_points: 757, pet_level: 1 }
    const points = 1

    const wrongExp = Math.max(0, student.total_points + points)
    const correctExp = Math.max(0, student.pet_exp + points)

    expect(calculateLevel(wrongExp)).toBe(8)
    expect(calculateLevel(correctExp)).toBe(1)
  })

  it('首次领养可沿用当前班级积分作为宠物成长值', () => {
    const student = { total_points: 40, pet_type: null }
    const newExp = Math.max(0, student.total_points)

    expect(newExp).toBe(40)
    expect(calculateLevel(newExp)).toBe(2)
  })
})
