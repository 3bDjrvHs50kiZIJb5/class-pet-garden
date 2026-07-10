/**
 * 关闭已过期但仍为 active 的任务
 */
export async function closeExpiredTasks(db, classId) {
  const now = Date.now()
  await db.prepare(`
    UPDATE class_tasks
    SET status = 'closed', updated_at = ?
    WHERE class_id = ? AND status = 'active' AND deadline IS NOT NULL AND deadline < ?
  `).run(now, classId, now)
}

/**
 * 获取任务目标学生 ID 列表
 */
export async function getTaskTargetStudentIds(db, task) {
  if (task.target_type === 'selected') {
    try {
      return JSON.parse(task.target_student_ids || '[]')
    } catch {
      return []
    }
  }
  return (await db.prepare('SELECT id FROM students WHERE class_id = ? ORDER BY name').all(task.class_id)).map(s => s.id)
}

/**
 * 统计任务完成人数
 */
export async function getTaskCompletionStats(db, taskId, targetStudentIds) {
  const completedCount = (await db.prepare(
    'SELECT COUNT(*) as count FROM task_completions WHERE task_id = ?'
  ).get(taskId))?.count || 0
  return {
    completedCount,
    totalCount: targetStudentIds.length
  }
}

/**
 * 附加规则信息与完成统计
 */
export async function enrichTask(db, task) {
  const rule = await db.prepare('SELECT id, name, points, category FROM evaluation_rules WHERE id = ?').get(task.rule_id)
  const targetStudentIds = await getTaskTargetStudentIds(db, task)
  const stats = await getTaskCompletionStats(db, task.id, targetStudentIds)
  return {
    ...task,
    target_student_ids: task.target_type === 'selected' ? targetStudentIds : null,
    rule: rule || null,
    completedCount: stats.completedCount,
    totalCount: stats.totalCount
  }
}

/**
 * 校验班级归属
 */
export async function assertClassOwnership(db, classId, userId) {
  const cls = await db.prepare('SELECT * FROM classes WHERE id = ?').get(classId)
  if (!cls || cls.user_id !== userId) {
    return null
  }
  return cls
}

/**
 * 校验任务归属
 */
export async function getOwnedTask(db, taskId, userId) {
  return db.prepare(`
    SELECT t.* FROM class_tasks t
    JOIN classes c ON t.class_id = c.id
    WHERE t.id = ? AND c.user_id = ?
  `).get(taskId, userId)
}
