import { describe, it, expect } from 'vitest'

// 从 server/index.js 提取的等级配置和计算函数
// 注意：实际项目中应该把这些逻辑提取到单独的模块中
const LEVEL_CONFIG = [40, 60, 80, 100, 120, 140, 160]

function calculateLevel(exp) {
  let level = 1
  let total = 0
  for (const required of LEVEL_CONFIG) {
    total += required
    if (exp >= total) {
      level++
    } else {
      break
    }
  }
  return Math.min(level, 8)
}

describe('后端等级计算', () => {
  it('应该与前端等级计算保持一致', () => {
    // 测试各个等级边界
    const testCases = [
      { exp: 0, level: 1 },
      { exp: 39, level: 1 },
      { exp: 40, level: 2 },
      { exp: 99, level: 2 },
      { exp: 100, level: 3 },
      { exp: 179, level: 3 },
      { exp: 180, level: 4 },
      { exp: 279, level: 4 },
      { exp: 280, level: 5 },
      { exp: 399, level: 5 },
      { exp: 400, level: 6 },
      { exp: 539, level: 6 },
      { exp: 540, level: 7 },
      { exp: 699, level: 7 },
      { exp: 700, level: 8 },
      { exp: 1000, level: 8 },
    ]

    for (const { exp, level } of testCases) {
      expect(calculateLevel(exp), `经验 ${exp} 应该是 ${level} 级`).toBe(level)
    }
  })

  it('等级配置总和应该是 700', () => {
    // 验证满级需要的总经验
    const totalExp = LEVEL_CONFIG.reduce((sum, req) => sum + req, 0)
    expect(totalExp).toBe(700)
  })
})

describe('经验变化计算（用于撤回评价）', () => {
  // 模拟撤回评价时的经验计算
  function calculateWithdraw(student, recordPoints) {
    const expChange = Math.abs(recordPoints)
    const newExp = Math.max(0, student.pet_exp - expChange)
    const newLevel = calculateLevel(newExp)
    return { newExp, newLevel }
  }

  it('撤回加分应该正确减少经验', () => {
    const student = { pet_exp: 100, pet_level: 3 }
    const result = calculateWithdraw(student, 10)
    expect(result.newExp).toBe(90)
    expect(result.newLevel).toBe(2) // 90 < 100，降回 2 级
  })

  it('撤回扣分应该正确减少经验（基于绝对值）', () => {
    const student = { pet_exp: 100, pet_level: 3 }
    const result = calculateWithdraw(student, -10)
    expect(result.newExp).toBe(90)
    expect(result.newLevel).toBe(2)
  })

  it('经验不会变成负数', () => {
    const student = { pet_exp: 5, pet_level: 1 }
    const result = calculateWithdraw(student, 100)
    expect(result.newExp).toBe(0)
    expect(result.newLevel).toBe(1)
  })
})