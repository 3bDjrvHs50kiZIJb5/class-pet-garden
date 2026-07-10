export const MYTHICAL_PET_IDS = new Set([
  'white-tiger',
  'unicorn',
  'azure-dragon',
  'vermilion-bird',
  'succulent-spirit',
  'pixiu',
  'suanni',
])

export function isMythicalPet(petType) {
  return MYTHICAL_PET_IDS.has(petType)
}
