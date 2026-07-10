// 宠物类型定义
export interface PetType {
  id: string
  name: string
  category: 'normal' | 'mythical'
  image: string
  // 等级图片路径，key为等级(1-8)，value为图片路径
  levelImages?: Record<number, string>
}

// 生成等级图片路径的辅助函数
function generateLevelImages(petId: string): Record<number, string> {
  const basePath = `/pets/${petId}`
  const images: Record<number, string> = {}
  for (let i = 1; i <= 8; i++) {
    images[i] = `${basePath}/lv${i}.webp`
  }
  return images
}

// 获取默认图片（等级1）
function getDefaultImage(petId: string): string {
  return `/pets/${petId}/lv1.webp`
}

// 宠物配置
export const PET_TYPES: PetType[] = [
  // 普通动物
  { id: 'west-highland', name: '西高地', category: 'normal', image: getDefaultImage('west-highland'), levelImages: generateLevelImages('west-highland') },
  { id: 'bichon', name: '比熊', category: 'normal', image: getDefaultImage('bichon'), levelImages: generateLevelImages('bichon') },
  { id: 'border-collie', name: '边牧', category: 'normal', image: getDefaultImage('border-collie'), levelImages: generateLevelImages('border-collie') },
  { id: 'shiba', name: '柴犬', category: 'normal', image: getDefaultImage('shiba'), levelImages: generateLevelImages('shiba') },
  { id: 'golden-retriever', name: '金毛', category: 'normal', image: getDefaultImage('golden-retriever'), levelImages: generateLevelImages('golden-retriever') },
  { id: 'samoyed', name: '萨摩耶', category: 'normal', image: getDefaultImage('samoyed'), levelImages: generateLevelImages('samoyed') },
  { id: 'husky', name: '哈士奇', category: 'normal', image: getDefaultImage('husky'), levelImages: generateLevelImages('husky') },
  { id: 'tabby-cat', name: '虎斑猫', category: 'normal', image: getDefaultImage('tabby-cat'), levelImages: generateLevelImages('tabby-cat') },
  { id: 'persian-cat', name: '波斯猫', category: 'normal', image: getDefaultImage('persian-cat'), levelImages: generateLevelImages('persian-cat') },
  { id: 'ragdoll-cat', name: '布偶猫', category: 'normal', image: getDefaultImage('ragdoll-cat'), levelImages: generateLevelImages('ragdoll-cat') },
  { id: 'orange-cat', name: '橘猫', category: 'normal', image: getDefaultImage('orange-cat'), levelImages: generateLevelImages('orange-cat') },
  { id: 'lop-rabbit', name: '垂耳兔', category: 'normal', image: getDefaultImage('lop-rabbit'), levelImages: generateLevelImages('lop-rabbit') },
  { id: 'angora-rabbit', name: '安哥拉兔', category: 'normal', image: getDefaultImage('angora-rabbit'), levelImages: generateLevelImages('angora-rabbit') },
  { id: 'hamster', name: '仓鼠', category: 'normal', image: getDefaultImage('hamster'), levelImages: generateLevelImages('hamster') },
  { id: 'winter-hamster', name: '银狐仓鼠', category: 'normal', image: getDefaultImage('winter-hamster'), levelImages: generateLevelImages('winter-hamster') },
  { id: 'call-duck', name: '柯尔鸭', category: 'normal', image: getDefaultImage('call-duck'), levelImages: generateLevelImages('call-duck') },
  { id: 'alpaca', name: '羊驼', category: 'normal', image: getDefaultImage('alpaca'), levelImages: generateLevelImages('alpaca') },
  { id: 'red-panda', name: '小熊猫', category: 'normal', image: getDefaultImage('red-panda'), levelImages: generateLevelImages('red-panda') },
  { id: 'corgi', name: '柯基', category: 'normal', image: getDefaultImage('corgi'), levelImages: generateLevelImages('corgi') },
  
  // 神兽
  { id: 'white-tiger', name: '白虎', category: 'mythical', image: getDefaultImage('white-tiger'), levelImages: generateLevelImages('white-tiger') },
  { id: 'unicorn', name: '独角兽', category: 'mythical', image: getDefaultImage('unicorn'), levelImages: generateLevelImages('unicorn') },
  { id: 'azure-dragon', name: '青龙', category: 'mythical', image: getDefaultImage('azure-dragon'), levelImages: generateLevelImages('azure-dragon') },
  { id: 'vermilion-bird', name: '朱雀', category: 'mythical', image: getDefaultImage('vermilion-bird'), levelImages: generateLevelImages('vermilion-bird') },
  { id: 'succulent-spirit', name: '多肉精灵', category: 'mythical', image: getDefaultImage('succulent-spirit'), levelImages: generateLevelImages('succulent-spirit') },
  { id: 'pixiu', name: '貔貅', category: 'mythical', image: getDefaultImage('pixiu'), levelImages: generateLevelImages('pixiu') },
  { id: 'suanni', name: '狻猊', category: 'mythical', image: getDefaultImage('suanni'), levelImages: generateLevelImages('suanni') },
]

// 等级配置
export const LEVEL_CONFIG = [40, 60, 80, 100, 120, 140, 160]

// 获取宠物信息
export function getPetType(id: string): PetType | undefined {
  return PET_TYPES.find(p => p.id === id)
}

export function isMythicalPet(petId: string): boolean {
  return getPetType(petId)?.category === 'mythical'
}

// 获取宠物指定等级的图片
export function getPetLevelImage(petId: string, level: number): string {
  const pet = getPetType(petId)
  if (!pet) return ''
  
  // 确保等级在 1-8 范围内
  const validLevel = Math.max(1, Math.min(8, level))
  
  // 优先使用等级图片，如果没有则使用默认图片
  return pet.levelImages?.[validLevel] || pet.image || ''
}

// 获取宠物等级1的图片（用于选择列表展示）
export function getPetLevel1Image(petId: string): string {
  return getPetLevelImage(petId, 1)
}

// 计算等级
export function calculateLevel(exp: number): number {
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

// 获取当前等级进度
export function getLevelProgress(exp: number): { current: number; required: number; percentage: number; isMaxLevel: boolean } {
  if (!exp || exp <= 0) {
    return { current: 0, required: LEVEL_CONFIG[0], percentage: 0, isMaxLevel: false }
  }
  
  let total = 0
  for (let i = 0; i < LEVEL_CONFIG.length; i++) {
    const levelTotal = total + LEVEL_CONFIG[i]
    if (exp < levelTotal) {
      const current = exp - total
      return { 
        current, 
        required: LEVEL_CONFIG[i], 
        percentage: Math.round((current / LEVEL_CONFIG[i]) * 100),
        isMaxLevel: false
      }
    }
    total = levelTotal
  }
  
  // Max level reached - 显示总积分/满级所需总积分
  const maxExp = LEVEL_CONFIG.reduce((sum, req) => sum + req, 0)
  return { 
    current: exp, 
    required: maxExp, 
    percentage: 100,
    isMaxLevel: true
  }
}