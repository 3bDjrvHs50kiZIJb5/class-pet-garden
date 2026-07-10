// 等级配置 (每级所需经验)
export const LEVEL_CONFIG = [40, 60, 80, 100, 120, 140, 160]

// 计算等级
export function calculateLevel(exp) {
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

// 获取等级进度
export function getLevelProgress(exp) {
  const level = calculateLevel(exp)
  let prevTotal = 0
  for (let i = 0; i < level - 1; i++) {
    prevTotal += LEVEL_CONFIG[i]
  }
  const currentLevelExp = exp - prevTotal
  const required = LEVEL_CONFIG[level - 1] || 0
  const isMaxLevel = level >= 8

  return {
    level,
    current: currentLevelExp,
    required: isMaxLevel ? currentLevelExp : required,
    percentage: isMaxLevel ? 100 : Math.min(100, (currentLevelExp / required) * 100),
    isMaxLevel
  }
}
