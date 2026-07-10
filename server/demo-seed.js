import { calculateLevel } from './utils/level.js'

const DEMO_CLASS_ID = 'demo-class-2026'
const DEMO_RULES = [
  { id: 'demo-rule-milestone', name: '成长里程碑达成', points: 100, category: '其他' },
  { id: 'demo-rule-role-model', name: '月度榜样奖励', points: 50, category: '行为' },
  { id: 'demo-rule-learning', name: '学习目标达成', points: 20, category: '学习' },
  { id: 'demo-rule-health', name: '运动打卡坚持', points: 10, category: '健康' }
]
const DAILY_HABIT_RULE = { name: '遵守纪律', points: 1, category: '行为' }

const DEMO_STUDENTS = [
  { id: 'demo-student-01', name: '陈星然', points: 720, petType: 'azure-dragon' },
  { id: 'demo-student-02', name: '林知夏', points: 610, petType: 'unicorn' },
  { id: 'demo-student-03', name: '王子墨', points: 510, petType: 'golden-retriever' },
  { id: 'demo-student-04', name: '李沐阳', points: 430, petType: 'ragdoll-cat' },
  { id: 'demo-student-05', name: '张语桐', points: 350, petType: 'white-tiger' },
  { id: 'demo-student-06', name: '周昱辰', points: 290, petType: 'border-collie' },
  { id: 'demo-student-07', name: '赵一诺', points: 250, petType: 'lop-rabbit' },
  { id: 'demo-student-08', name: '黄思远', points: 210, petType: 'red-panda' },
  { id: 'demo-student-09', name: '吴雨菲', points: 170, petType: 'samoyed' },
  { id: 'demo-student-10', name: '孙浩然', points: 140, petType: 'husky' },
  { id: 'demo-student-11', name: '刘书妍', points: 110, petType: 'persian-cat' },
  { id: 'demo-student-12', name: '郑宇航', points: 90, petType: 'corgi' },
  { id: 'demo-student-13', name: '何安琪', points: 70, petType: 'call-duck' },
  { id: 'demo-student-14', name: '宋嘉乐', points: 45, petType: 'hamster' },
  { id: 'demo-student-15', name: '许清越', points: 25, petType: 'orange-cat' },
  { id: 'demo-student-16', name: '马睿泽', points: 10, petType: 'shiba' }
]

function buildRecords(student, studentIndex, now) {
  const records = []
  let remainingPoints = student.points
  const rulesByPoints = [...DEMO_RULES].sort((a, b) => b.points - a.points)
  let recordIndex = 0

  for (const rule of rulesByPoints) {
    while (remainingPoints >= rule.points) {
      const daysAgo = (studentIndex + recordIndex) % 7
      const hoursAgo = (studentIndex * 3 + recordIndex * 5) % 12
      records.push({
        ...rule,
        timestamp: now - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000
      })
      remainingPoints -= rule.points
      recordIndex++
    }
  }

  while (remainingPoints > 0) {
    const daysAgo = (studentIndex + recordIndex) % 7
    const hoursAgo = (studentIndex * 3 + recordIndex * 5) % 12
    records.push({
      ...DAILY_HABIT_RULE,
      timestamp: now - daysAgo * 24 * 60 * 60 * 1000 - hoursAgo * 60 * 60 * 1000
    })
    remainingPoints--
    recordIndex++
  }

  return records
}

/**
 * 为游客账户创建固定的演示班级。
 * 演示数据独立归属游客账户，不会读取、修改或混入真实老师的数据。
 * 返回值用于启动日志和独立种子命令的反馈。
 */
export async function ensureDemoData(db, guestUserId) {
  const existingDemo = await db.prepare('SELECT id FROM classes WHERE id = ?').get(DEMO_CLASS_ID)
  if (existingDemo) {
    return { seeded: false, reason: '演示数据已存在' }
  }

  const now = Date.now()
  const insertData = db.transaction(async () => {
    await db.prepare(
      'INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)'
    ).run(DEMO_CLASS_ID, guestUserId, '向日葵班 · 成长花园', now, now)

    const insertRule = db.prepare(
      'INSERT IGNORE INTO evaluation_rules (id, name, points, category, is_custom, created_at) VALUES (?, ?, ?, ?, 0, ?)'
    )
    for (const rule of DEMO_RULES) {
      await insertRule.run(rule.id, rule.name, rule.points, rule.category, now)
    }

    const insertStudent = db.prepare(
      'INSERT INTO students (id, class_id, name, student_no, total_points, pet_type, pet_level, pet_exp, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
    )
    const insertRecord = db.prepare(
      'INSERT INTO evaluation_records (id, class_id, student_id, points, reason, category, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?)'
    )
    const insertBadge = db.prepare(
      'INSERT INTO badges (id, student_id, pet_type, earned_at) VALUES (?, ?, ?, ?)'
    )

    let recordId = 1
    for (const [studentIndex, student] of DEMO_STUDENTS.entries()) {
      const petLevel = calculateLevel(student.points)
      await insertStudent.run(
        student.id,
        DEMO_CLASS_ID,
        student.name,
        `2026${String(studentIndex + 1).padStart(2, '0')}`,
        student.points,
        student.petType,
        petLevel,
        student.points,
        now
      )

      for (const record of buildRecords(student, studentIndex, now)) {
        await insertRecord.run(
          `demo-record-${String(recordId).padStart(3, '0')}`,
          DEMO_CLASS_ID,
          student.id,
          record.points,
          record.name,
          record.category,
          record.timestamp
        )
        recordId++
      }

      if (petLevel === 8) {
        await insertBadge.run(`demo-badge-${student.id}`, student.id, student.petType, now)
      }
    }

    const ruleRow = await db.prepare("SELECT id FROM evaluation_rules WHERE name = '遵守纪律' LIMIT 1").get()
    const healthRule = await db.prepare("SELECT id FROM evaluation_rules WHERE name = '认真完成包干区值日' LIMIT 1").get()
    if (ruleRow) {
      const tomorrow = now + 24 * 60 * 60 * 1000
      const nextWeek = now + 7 * 24 * 60 * 60 * 1000
      await db.prepare(`
        INSERT INTO class_tasks (id, class_id, title, description, rule_id, deadline, target_type, target_student_ids, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, 'all', NULL, 'active', ?, ?)
      `).run('demo-task-morning', DEMO_CLASS_ID, '今日晨读打卡', '早读认真专注，完成可获积分', ruleRow.id, tomorrow, now, now)

      if (healthRule) {
        await db.prepare(`
          INSERT INTO class_tasks (id, class_id, title, description, rule_id, deadline, target_type, target_student_ids, status, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, 'selected', ?, 'active', ?, ?)
        `).run(
          'demo-task-duty',
          DEMO_CLASS_ID,
          '周五值日',
          '认真完成包干区打扫',
          healthRule.id,
          nextWeek,
          JSON.stringify(['demo-student-01', 'demo-student-02', 'demo-student-03']),
          now,
          now
        )
      }
    }
  })

  await insertData()
  return {
    seeded: true,
    className: '向日葵班 · 成长花园',
    students: DEMO_STUDENTS.length
  }
}
