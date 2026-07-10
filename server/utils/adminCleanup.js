const DEMO_CLASS_ID = 'demo-class-2026'

export async function deleteClassData(db, classId) {
  await db.prepare('DELETE FROM task_completions WHERE task_id IN (SELECT id FROM class_tasks WHERE class_id = ?)').run(classId)
  await db.prepare('DELETE FROM class_tasks WHERE class_id = ?').run(classId)
  await db.prepare('DELETE FROM evaluation_records WHERE class_id = ?').run(classId)
  await db.prepare('DELETE FROM class_vip_subscriptions WHERE class_id = ?').run(classId)
  await db.prepare('DELETE FROM badges WHERE student_id IN (SELECT id FROM students WHERE class_id = ?)').run(classId)
  await db.prepare('DELETE FROM students WHERE class_id = ?').run(classId)
  await db.prepare('DELETE FROM classes WHERE id = ?').run(classId)
}

export async function deleteUserData(db, userId) {
  const classIds = (await db.prepare('SELECT id FROM classes WHERE user_id = ?').all(userId)).map(row => row.id)
  for (const classId of classIds) {
    if (classId === DEMO_CLASS_ID) {
      continue
    }
    await deleteClassData(db, classId)
  }
  await db.prepare('DELETE FROM evaluation_rules WHERE is_custom = 1 AND user_id = ?').run(userId)
  await db.prepare('DELETE FROM users WHERE id = ?').run(userId)
}

export { DEMO_CLASS_ID }
