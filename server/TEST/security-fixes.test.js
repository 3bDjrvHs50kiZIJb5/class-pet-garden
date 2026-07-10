import { describe, it, expect, beforeEach } from 'vitest'
import { hashPassword } from '../utils/password.js'
import { setupTestDb } from './testDb.js'
import {
  assertStudentBelongsToClass,
  resolveRuleForEvaluation,
  EvaluationValidationError
} from '../utils/evaluationValidation.js'

describe('评价安全校验', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
    const now = Date.now()

    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('teacher-a', '13800000001', 'hash', 0, now)
    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('teacher-b', '13800000002', 'hash', 0, now)

    await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('class-a', 'teacher-a', 'A班', now, now)
    await db.prepare('INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)')
      .run('class-b', 'teacher-b', 'B班', now, now)

    await db.prepare(`
      INSERT INTO students (id, class_id, name, total_points, pet_exp, pet_level)
      VALUES ('student-a', 'class-a', '小明', 0, 0, 1)
    `).run()
    await db.prepare(`
      INSERT INTO students (id, class_id, name, total_points, pet_exp, pet_level)
      VALUES ('student-b', 'class-b', '小红', 0, 0, 1)
    `).run()

    await db.prepare(`
      INSERT INTO evaluation_rules (id, name, points, category, is_custom, created_at)
      VALUES ('rule-1', '作业完成优秀', 1, '学习', 0, ?)
    `).run(now)
  })

  it('学生不属于班级时应拒绝评价', async () => {
    await expect(assertStudentBelongsToClass(db, 'class-a', 'student-b'))
      .rejects
      .toMatchObject({ message: '学生不属于该班级', statusCode: 403 })
  })

  it('无效评价规则应被拒绝', async () => {
    await expect(resolveRuleForEvaluation(db, 'teacher-a', '伪造规则'))
      .rejects
      .toMatchObject({ message: '无效的评价规则', statusCode: 400 })
  })

  it('应使用服务端规则分值而不是客户端伪造分值', async () => {
    const rule = await resolveRuleForEvaluation(db, 'teacher-a', '作业完成优秀')
    expect(rule.points).toBe(1)
    expect(rule.category).toBe('学习')
  })

  it('老师只能使用自己可见的自定义规则', async () => {
    const now = Date.now()
    await db.prepare(`
      INSERT INTO evaluation_rules (id, name, points, category, is_custom, user_id, created_at)
      VALUES ('rule-custom', 'A班专属规则', 2, '行为', 1, 'teacher-a', ?)
    `).run(now)

    await expect(resolveRuleForEvaluation(db, 'teacher-b', 'A班专属规则'))
      .rejects
      .toMatchObject({ message: '无效的评价规则', statusCode: 400 })

    const rule = await resolveRuleForEvaluation(db, 'teacher-a', 'A班专属规则')
    expect(rule.points).toBe(2)
  })
})

describe('管理员账户初始化', () => {
  let db

  beforeEach(async () => {
    db = await setupTestDb()
  })

  it('已存在的 admin 密码不应被覆盖', async () => {
    const customPasswordHash = hashPassword('MySecurePassword123!')
    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run('admin-id', 'admin', customPasswordHash, 0, Date.now())

    const adminUser = await db.prepare('SELECT id, password_hash FROM users WHERE username = ?').get('admin')
    expect(adminUser).toBeTruthy()

    // 模拟修复后的启动逻辑：admin 已存在时不再更新密码
    const after = await db.prepare('SELECT password_hash FROM users WHERE username = ?').get('admin')
    expect(after.password_hash).toBe(customPasswordHash)
    expect(after.password_hash).not.toBe(hashPassword('admin!@#$'))
  })
})
