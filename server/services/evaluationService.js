import { v4 as uuidv4 } from 'uuid'
import { calculateLevel } from '../utils/level.js'

/** 同一学生对同一评价规则的最短间隔（毫秒） */
export const EVALUATION_COOLDOWN_MS = 60 * 1000

export class EvaluationCooldownError extends Error {
  constructor(remainingMs, reason) {
    const seconds = Math.ceil(remainingMs / 1000)
    super(`「${reason}」1 分钟内不能重复评价，请 ${seconds} 秒后再试`)
    this.name = 'EvaluationCooldownError'
    this.remainingMs = remainingMs
    this.statusCode = 429
  }
}

/**
 * 检查同一学生对同一评价规则是否在冷却期内
 */
export async function assertEvaluationCooldown(db, { studentId, reason, now = Date.now() }) {
  const recent = await db.prepare(`
    SELECT timestamp FROM evaluation_records
    WHERE student_id = ? AND reason = ? AND timestamp > ?
    ORDER BY timestamp DESC LIMIT 1
  `).get(studentId, reason, now - EVALUATION_COOLDOWN_MS)

  if (recent) {
    const remainingMs = recent.timestamp + EVALUATION_COOLDOWN_MS - now
    throw new EvaluationCooldownError(remainingMs, reason)
  }
}

/**
 * 写入评价记录并更新学生积分与宠物成长
 */
export async function applyEvaluation(db, { classId, studentId, points, reason, category }) {
  const student = await db.prepare('SELECT * FROM students WHERE id = ?').get(studentId)
  if (!student) {
    throw new Error('学生不存在')
  }
  if (student.class_id !== classId) {
    throw new Error('学生不属于该班级')
  }

  const id = uuidv4()
  const now = Date.now()

  await assertEvaluationCooldown(db, { studentId, reason, now })

  await db.prepare(
    'INSERT INTO evaluation_records (id, class_id, student_id, points, reason, category, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(id, classId, studentId, points, reason, category, now)

  await db.prepare('UPDATE students SET total_points = total_points + ? WHERE id = ?').run(points, studentId)

  const result = {
    id,
    timestamp: now,
    petLevel: student?.pet_level,
    petExp: student?.pet_exp,
    levelUp: false,
    levelDown: false,
    graduated: false
  }

  if (student && student.pet_type) {
    const newExp = Math.max(0, student.pet_exp + points)
    const newLevel = calculateLevel(newExp)
    let graduated = false

    if (newLevel === 8 && student.pet_level < 8) {
      const badgeId = uuidv4()
      await db.prepare('INSERT INTO badges (id, student_id, pet_type, earned_at) VALUES (?, ?, ?, ?)')
        .run(badgeId, studentId, student.pet_type, now)
      graduated = true
    }

    await db.prepare('UPDATE students SET pet_exp = ?, pet_level = ? WHERE id = ?').run(newExp, newLevel, studentId)

    result.petLevel = newLevel
    result.petExp = newExp
    result.levelUp = newLevel > student.pet_level
    result.levelDown = newLevel < student.pet_level
    result.graduated = graduated
  }

  return result
}

/**
 * 撤销评价记录并回退学生积分与宠物成长
 */
export async function revokeEvaluation(db, recordId) {
  const record = await db.prepare('SELECT * FROM evaluation_records WHERE id = ?').get(recordId)
  if (!record) {
    return null
  }

  const student = await db.prepare('SELECT * FROM students WHERE id = ?').get(record.student_id)
  if (!student) {
    return null
  }

  const expChange = Math.abs(record.points)
  const newExp = Math.max(0, student.pet_exp - expChange)
  const newLevel = calculateLevel(newExp)

  await db.prepare('UPDATE students SET total_points = total_points - ?, pet_exp = ?, pet_level = ? WHERE id = ?')
    .run(record.points, newExp, newLevel, record.student_id)

  await db.prepare('DELETE FROM task_completions WHERE evaluation_record_id = ?').run(recordId)
  await db.prepare('DELETE FROM evaluation_records WHERE id = ?').run(recordId)

  return record
}
