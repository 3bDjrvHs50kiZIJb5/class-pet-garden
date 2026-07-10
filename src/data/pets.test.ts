import { describe, it, expect } from 'vitest'
import { 
  calculateLevel, 
  getLevelProgress, 
  getPetType, 
  getPetLevelImage,
  isMythicalPet,
  PET_TYPES,
  LEVEL_CONFIG
} from './pets'

describe('pets 数据和基础函数', () => {
  it('应该有正确数量的宠物类型', () => {
    expect(PET_TYPES.length).toBeGreaterThan(0)
    // 至少有普通和神兽两个类别
    const categories = new Set(PET_TYPES.map(p => p.category))
    expect(categories.has('normal')).toBe(true)
    expect(categories.has('mythical')).toBe(true)
  })

  it('每个宠物应该有有效的 ID 和名称', () => {
    for (const pet of PET_TYPES) {
      expect(pet.id).toBeTruthy()
      expect(pet.name).toBeTruthy()
      expect(typeof pet.id).toBe('string')
      expect(typeof pet.name).toBe('string')
    }
  })

  it('等级配置应该有 7 个级别（2-8级所需经验）', () => {
    expect(LEVEL_CONFIG).toHaveLength(7)
    // 每级所需经验应该递增
    for (let i = 1; i < LEVEL_CONFIG.length; i++) {
      expect(LEVEL_CONFIG[i]).toBeGreaterThanOrEqual(LEVEL_CONFIG[i - 1])
    }
  })
})

describe('calculateLevel', () => {
  it('0 经验应该是 1 级', () => {
    expect(calculateLevel(0)).toBe(1)
  })

  it('负数经验应该是 1 级', () => {
    expect(calculateLevel(-10)).toBe(1)
  })

  it('39 经验应该是 1 级', () => {
    expect(calculateLevel(39)).toBe(1)
  })

  it('40 经验应该是 2 级', () => {
    expect(calculateLevel(40)).toBe(2)
  })

  it('100 经验应该是 3 级', () => {
    // 40 + 60 = 100，刚好升到 3 级
    expect(calculateLevel(100)).toBe(3)
  })

  it('99 经验应该是 2 级', () => {
    // 差 1 点到 3 级
    expect(calculateLevel(99)).toBe(2)
  })

  it('应该正确计算 4-7 级', () => {
    const thresholds = [40, 60, 80, 100, 120, 140, 160]
    let total = 0
    
    for (let i = 0; i < thresholds.length; i++) {
      total += thresholds[i]
      expect(calculateLevel(total)).toBe(i + 2)
      expect(calculateLevel(total - 1)).toBe(i + 1)
    }
  })

  it('满级应该是 8 级', () => {
    const maxExp = LEVEL_CONFIG.reduce((sum, req) => sum + req, 0)
    expect(calculateLevel(maxExp)).toBe(8)
    expect(calculateLevel(maxExp + 1000)).toBe(8) // 超出也应该封顶
  })
})

describe('getLevelProgress', () => {
  it('0 经验应该返回正确的进度', () => {
    const progress = getLevelProgress(0)
    expect(progress.current).toBe(0)
    expect(progress.required).toBe(40)
    expect(progress.percentage).toBe(0)
    expect(progress.isMaxLevel).toBe(false)
  })

  it('20 经验应该显示 50% 进度', () => {
    const progress = getLevelProgress(20)
    expect(progress.current).toBe(20)
    expect(progress.required).toBe(40)
    expect(progress.percentage).toBe(50)
    expect(progress.isMaxLevel).toBe(false)
  })

  it('升级后应该重置当前经验', () => {
    // 50 经验 = 2 级，当前 10/60
    const progress = getLevelProgress(50)
    expect(progress.current).toBe(10)
    expect(progress.required).toBe(60)
    expect(progress.percentage).toBe(17) // 10/60 ≈ 16.67%
  })

  it('满级应该显示 isMaxLevel=true', () => {
    const maxExp = LEVEL_CONFIG.reduce((sum, req) => sum + req, 0)
    const progress = getLevelProgress(maxExp)
    expect(progress.isMaxLevel).toBe(true)
    expect(progress.percentage).toBe(100)
  })

  it('满级后继续增加经验应该保持满级状态', () => {
    const maxExp = LEVEL_CONFIG.reduce((sum, req) => sum + req, 0)
    const progress = getLevelProgress(maxExp + 500)
    expect(progress.isMaxLevel).toBe(true)
    expect(progress.current).toBe(maxExp + 500)
  })

  it('负数经验应该返回 0 进度', () => {
    const progress = getLevelProgress(-10)
    expect(progress.current).toBe(0)
    expect(progress.percentage).toBe(0)
  })
})

describe('getPetType', () => {
  it('应该能找到存在的宠物', () => {
    const pet = getPetType('corgi')
    expect(pet).toBeDefined()
    expect(pet?.name).toBe('柯基')
    expect(pet?.category).toBe('normal')
  })

  it('不存在的宠物应该返回 undefined', () => {
    const pet = getPetType('non-existent-pet')
    expect(pet).toBeUndefined()
  })

  it('应正确识别神兽宠物', () => {
    expect(isMythicalPet('white-tiger')).toBe(true)
    expect(isMythicalPet('corgi')).toBe(false)
  })
})

describe('getPetLevelImage', () => {
  it('应该返回正确等级的图片路径', () => {
    const image = getPetLevelImage('corgi', 1)
    expect(image).toBe('/pets/corgi/lv1.webp')
  })

  it('等级超出范围应该返回边界值图片', () => {
    const image0 = getPetLevelImage('corgi', 0)
    const image1 = getPetLevelImage('corgi', 1)
    expect(image0).toBe(image1) // 0 级应该返回 1 级图片

    const image9 = getPetLevelImage('corgi', 9)
    const image8 = getPetLevelImage('corgi', 8)
    expect(image9).toBe(image8) // 9 级应该返回 8 级图片
  })

  it('不存在的宠物应该返回空字符串', () => {
    const image = getPetLevelImage('non-existent', 1)
    expect(image).toBe('')
  })
})