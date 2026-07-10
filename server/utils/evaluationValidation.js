export class EvaluationValidationError extends Error {
  constructor(message, statusCode = 400) {
    super(message)
    this.name = 'EvaluationValidationError'
    this.statusCode = statusCode
  }
}

export async function assertStudentBelongsToClass(db, classId, studentId) {
  const student = await db.prepare('SELECT id, class_id FROM students WHERE id = ?').get(studentId)
  if (!student) {
    throw new EvaluationValidationError('学生不存在', 404)
  }
  if (student.class_id !== classId) {
    throw new EvaluationValidationError('学生不属于该班级', 403)
  }
  return student
}

export async function resolveRuleForEvaluation(db, userId, reason) {
  if (!reason?.trim()) {
    throw new EvaluationValidationError('评价规则不能为空', 400)
  }

  const rule = await db.prepare(`
    SELECT name, points, category
    FROM evaluation_rules
    WHERE name = ? AND (is_custom = 0 OR user_id = ?)
    LIMIT 1
  `).get(reason.trim(), userId)

  if (!rule) {
    throw new EvaluationValidationError('无效的评价规则', 400)
  }

  return rule
}
