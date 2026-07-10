import { describe, it, expect, beforeEach } from 'vitest'
import { v4 as uuidv4 } from 'uuid'
import { hashPassword } from '../utils/password.js'
import { deleteUserData } from '../utils/adminCleanup.js'
import { setupTestDb } from './testDb.js'

const ADMIN_USERNAME = 'admin'

async function listAllMembers(db) {
  const rows = await db.prepare(`
    SELECT
      u.id,
      u.username,
      u.created_at,
      (SELECT COUNT(*) FROM classes c WHERE c.user_id = u.id) AS class_count,
      (
        SELECT COUNT(*)
        FROM students s
        JOIN classes c ON s.class_id = c.id
        WHERE c.user_id = u.id
      ) AS student_count
    FROM users u
    WHERE u.is_guest = 0 AND LOWER(u.username) != LOWER(?)
    ORDER BY u.created_at DESC
  `).all(ADMIN_USERNAME)

  return rows.map(row => ({
    id: row.id,
    username: row.username,
    createdAt: row.created_at,
    classCount: row.class_count || 0,
    studentCount: row.student_count || 0,
  }))
}

describe('管理员会员管理', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
    const now = Date.now()
    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('admin-1', ADMIN_USERNAME, hashPassword('admin!@#$'), 0, now - 3000)
    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('teacher-1', '张老师', hashPassword('123456'), 0, now - 2000)
    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('teacher-2', '李老师', hashPassword('123456'), 0, now - 1000)
    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('guest-1', 'guest', hashPassword('guest'), 1, now)
    await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('class-a', 'teacher-1', '三年一班', now, now)
    await db.prepare('INSERT INTO students (id, class_id, name) VALUES (?, ?, ?)').run(uuidv4(), 'class-a', '小明')
    await db.prepare(`
      INSERT INTO evaluation_rules (id, name, points, category, is_custom, user_id, created_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
    `).run('rule-custom', '自定义规则', 2, '学习', 'teacher-1', now)
  })

  it('应只返回注册教师账户，排除管理员与游客', async () => {
    const members = await listAllMembers(db)
    expect(members).toHaveLength(2)
    expect(members.map(item => item.username)).toEqual(['李老师', '张老师'])
  })

  it('应包含班级数与学生数统计', async () => {
    const members = await listAllMembers(db)
    const teacherOne = members.find(item => item.id === 'teacher-1')
    expect(teacherOne?.classCount).toBe(1)
    expect(teacherOne?.studentCount).toBe(1)
  })

  it('删除教师账户时应级联删除班级与自定义规则', async () => {
    await deleteUserData(db, 'teacher-1')
    expect(await db.prepare('SELECT id FROM users WHERE id = ?').get('teacher-1')).toBeUndefined()
    expect(await db.prepare('SELECT id FROM classes WHERE user_id = ?').get('teacher-1')).toBeUndefined()
    expect(await db.prepare('SELECT id FROM evaluation_rules WHERE user_id = ?').get('teacher-1')).toBeUndefined()
    expect(await listAllMembers(db)).toHaveLength(1)
  })
})
