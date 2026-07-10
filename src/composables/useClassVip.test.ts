import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  CURRENT_CLASS_CHANGED_EVENT,
  getCurrentClassStorageKey,
  getSavedClassId,
  notifyCurrentClassChanged,
  saveCurrentClassId,
} from './useClassVip'

describe('useClassVip helpers', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('builds storage key with user id', () => {
    expect(getCurrentClassStorageKey('teacher-1')).toBe('pet-garden-current-class-teacher-1')
    expect(getCurrentClassStorageKey()).toBe('pet-garden-current-class-guest')
  })

  it('reads saved class id from storage', () => {
    localStorage.setItem('pet-garden-current-class-teacher-1', 'class-b')
    expect(getSavedClassId('teacher-1')).toBe('class-b')
    expect(getSavedClassId('teacher-2')).toBeNull()
  })

  it('saves current class id and dispatches change event', () => {
    const handler = vi.fn()
    window.addEventListener(CURRENT_CLASS_CHANGED_EVENT, handler)

    saveCurrentClassId('class-a', 'teacher-1')

    expect(localStorage.getItem('pet-garden-current-class-teacher-1')).toBe('class-a')
    expect(handler).toHaveBeenCalledTimes(1)

    window.removeEventListener(CURRENT_CLASS_CHANGED_EVENT, handler)
  })

  it('notifyCurrentClassChanged dispatches event', () => {
    const handler = vi.fn()
    window.addEventListener(CURRENT_CLASS_CHANGED_EVENT, handler)

    notifyCurrentClassChanged()

    expect(handler).toHaveBeenCalledTimes(1)

    window.removeEventListener(CURRENT_CLASS_CHANGED_EVENT, handler)
  })
})
