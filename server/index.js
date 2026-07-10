import express from 'express'
import cors from 'cors'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { v4 as uuidv4 } from 'uuid'

import { initDb, db } from './db.js'
import { hashPassword } from './utils/password.js'
import { ensureRuleUserIdColumn } from './utils/rules.js'
import { calculateLevel } from './utils/level.js'
import { ensureDemoData, ensureDemoVip } from './demo-seed.js'
import { startDemoResetScheduler } from './utils/demoResetScheduler.js'

// 导入路由
import authRoutes from './routes/auth.js'
import classRoutes from './routes/classes.js'
import studentRoutes from './routes/students.js'
import evaluationRoutes from './routes/evaluations.js'
import taskRoutes from './routes/tasks.js'
import ruleRoutes from './routes/rules.js'
import backupRoutes from './routes/backup.js'
import settingsRoutes from './routes/settings.js'
import vipRoutes from './routes/vip.js'
import adminRoutes from './routes/admin.js'
import publicRoutes from './routes/public.js'

const app = express()
const PORT = Number(process.env.PORT || 3002)
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const distPath = path.resolve(__dirname, '../dist')
const hasFrontendBuild = fs.existsSync(path.join(distPath, 'index.html'))

async function waitForDatabase(maxAttempts = 30, delayMs = 2000) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await initDb()
      return
    } catch (err) {
      if (attempt === maxAttempts) {
        throw err
      }
      console.warn(`数据库未就绪，${delayMs / 1000}s 后重试 (${attempt}/${maxAttempts})`)
      await new Promise((resolve) => setTimeout(resolve, delayMs))
    }
  }
}

function registerApiRoutes(basePath) {
  app.use(`${basePath}/public`, publicRoutes)
  app.use(`${basePath}/auth`, authRoutes)
  app.use(`${basePath}/classes`, classRoutes)
  app.use(`${basePath}/students`, studentRoutes)
  app.use(`${basePath}/evaluations`, evaluationRoutes)
  app.use(`${basePath}/tasks`, taskRoutes)
  app.use(`${basePath}/rules`, ruleRoutes)
  app.use(`${basePath}/backup`, backupRoutes)
  app.use(`${basePath}/settings`, settingsRoutes)
  app.use(`${basePath}/vip`, vipRoutes)
  app.use(`${basePath}/admin`, adminRoutes)
  app.get(`${basePath}/health`, (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() })
  })
}

function registerFrontendRoutes() {
  if (!hasFrontendBuild) {
    return
  }

  app.use('/pet-garden', express.static(distPath, { index: false }))
  app.use(express.static(distPath, { index: false }))

  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      next()
      return
    }
    if (req.path.startsWith('/api') || req.path.startsWith('/pet-garden/api')) {
      next()
      return
    }
    if (path.extname(req.path)) {
      next()
      return
    }
    res.sendFile(path.join(distPath, 'index.html'), (err) => {
      if (err) next(err)
    })
  })
}

// Middleware
app.use(cors())
app.use(express.json())

const ADMIN_USERNAME = 'admin'
const ADMIN_DEFAULT_PASSWORD = 'admin!@#$'

// 初始化默认评价规则
async function initDefaultRules() {
  const defaultRules = [
    // 学习类 - 加分
    { name: '作业完成优秀', points: 1, category: '学习' },
    { name: '平时测验满分', points: 3, category: '学习' },
    { name: '平时测验达优秀', points: 2, category: '学习' },
    { name: '默写全对', points: 1, category: '学习' },
    { name: '订正态度认真', points: 1, category: '学习' },
    { name: '优秀作业,值得表扬', points: 1, category: '学习' },
    { name: '近期学习状态进步', points: 1, category: '学习' },
    { name: '被老师点名表扬', points: 1, category: '学习' },
    { name: '单元测验显著进步', points: 2, category: '学习' },
    // 学习类 - 扣分
    { name: '不交作业', points: -1, category: '学习' },
    { name: '未完成作业', points: -2, category: '学习' },
    { name: '作业潦草', points: -1, category: '学习' },
    { name: '订正不认真', points: -2, category: '学习' },
    { name: '抄袭作业', points: -5, category: '学习' },
    { name: '考试作弊', points: -5, category: '学习' },
    { name: '学习显著退步', points: -2, category: '学习' },
    // 行为类 - 加分
    { name: '早读认真专注', points: 1, category: '行为' },
    { name: '课前准备充分', points: 1, category: '行为' },
    { name: '眼保健操全程认真', points: 1, category: '行为' },
    { name: '升旗仪式安静整齐', points: 1, category: '行为' },
    { name: '守纪表现优秀(被表扬)', points: 2, category: '行为' },
    { name: '主动帮助同学', points: 2, category: '行为' },
    { name: '拾金不昧(一般物品)', points: 2, category: '行为' },
    { name: '拾金不昧(贵重物品)', points: 5, category: '行为' },
    { name: '主动帮助生病同学', points: 3, category: '行为' },
    { name: '主动调解同学矛盾、化解冲突', points: 3, category: '行为' },
    { name: '做好人好事被学校提出表扬', points: 3, category: '行为' },
    { name: '积极参与校内外志愿服务', points: 3, category: '行为' },
    { name: '犯错主动认错,积极协商', points: 1, category: '行为' },
    // 行为类 - 扣分
    { name: '无故迟到或早退', points: -1, category: '行为' },
    { name: '未佩戴红领巾,不穿校服', points: -1, category: '行为' },
    { name: '私自旷课或课间操', points: -3, category: '行为' },
    { name: '上课讲话、开小差', points: -1, category: '行为' },
    { name: '扰乱课堂', points: -3, category: '行为' },
    { name: '课间追逐打闹', points: -3, category: '行为' },
    { name: '追逐打闹(酿成事故)', points: -3, category: '行为' },
    { name: '中午自习说话、随意走动', points: -1, category: '行为' },
    { name: '私自带玩具或零食或危险物品', points: -3, category: '行为' },
    { name: '排队时说话或小动作不停,被点名', points: -1, category: '行为' },
    { name: '传播脏话或不良歌谣', points: -5, category: '行为' },
    { name: '撒谎、隐瞒真实情况', points: -2, category: '行为' },
    { name: '说脏话,骂人,起绰号', points: -2, category: '行为' },
    { name: '欺负、推搡、伤害同学', points: -10, category: '行为' },
    { name: '挑拨离间、拉帮结派', points: -3, category: '行为' },
    { name: '不尊重同学、孤立他人', points: -3, category: '行为' },
    { name: '为私欲包庇犯错者', points: -3, category: '行为' },
    { name: '恶意举报、诬陷他人', points: -3, category: '行为' },
    { name: '破坏校园设施', points: -5, category: '行为' },
    // 健康类 - 加分
    { name: '认真完成包干区值日', points: 1, category: '健康' },
    { name: '主动为班级擦黑板', points: 1, category: '健康' },
    { name: '主动整理讲台', points: 1, category: '健康' },
    { name: '主动整理黑板粉笔槽', points: 1, category: '健康' },
    { name: '主动倒垃圾并套垃圾袋', points: 2, category: '健康' },
    { name: '座位整洁无涂画,桌椅干净', points: 1, category: '健康' },
    { name: '座位周围无垃圾', points: 1, category: '健康' },
    // 健康类 - 扣分
    { name: '打扫包干区时间玩耍,不认真', points: -2, category: '健康' },
    { name: '个人座位卫生不合格', points: -1, category: '健康' },
    { name: '校园内乱扔垃圾', points: -1, category: '健康' },
    { name: '桌洞脏乱、物品杂乱', points: -1, category: '健康' },
    { name: '破坏卫生、乱涂乱画', points: -2, category: '健康' },
    { name: '浪费粮食', points: -2, category: '健康' },
    { name: '破坏班级绿植、把玩绿植', points: -3, category: '健康' },
    // 其他类 - 加分
    { name: '主动整理图书、摆放整齐', points: 2, category: '其他' },
    { name: '主动帮同学更换桌椅', points: 2, category: '其他' },
    { name: '主动承担班级任务', points: 2, category: '其他' },
    { name: '积极参加班级墙面布置', points: 2, category: '其他' },
    { name: '积极参加班级或学校活动', points: 1, category: '其他' },
    { name: '活动中表现优秀', points: 2, category: '其他' },
    { name: '代表班级参赛', points: 3, category: '其他' },
    { name: '校级比赛:一等奖', points: 5, category: '其他' },
    { name: '校级比赛:二等奖', points: 4, category: '其他' },
    { name: '校级比赛:三等奖', points: 3, category: '其他' },
    { name: '区级及以上:一等奖', points: 8, category: '其他' },
    { name: '区级及以上:二等奖', points: 6, category: '其他' },
    { name: '区级及以上:三等奖', points: 4, category: '其他' },
    { name: '联欢会或文艺汇演积极参与', points: 2, category: '其他' },
    { name: '为班级争得荣誉', points: 5, category: '其他' },
    { name: '小组全周无违纪、全员交作业', points: 2, category: '其他' },
    // 其他类 - 扣分
    { name: '损坏公物、乱刻乱画', points: -1, category: '其他' },
    { name: '浪费水电、屡教不改', points: -1, category: '其他' },
    { name: '故意玩弄损坏公共电器', points: -3, category: '其他' },
    { name: '故意损坏卫生工具', points: -2, category: '其他' },
    { name: '扣分严重/打架/作弊/严重违纪', points: -8, category: '其他' },
  ]

  const insertRule = db.prepare('INSERT INTO evaluation_rules (id, name, points, category, is_custom, created_at) VALUES (?, ?, ?, ?, 0, ?)')
  const now = Date.now()
  for (const rule of defaultRules) {
    await insertRule.run(uuidv4(), rule.name, rule.points, rule.category, now)
  }
  console.log(`✅ 初始化 ${defaultRules.length} 条默认评价规则`)
}

async function bootstrap() {
  // 初始化数据库（Docker 启动时等待 MySQL 就绪）
  await waitForDatabase()
  await ensureRuleUserIdColumn(db)

  // 创建默认游客用户
  const guestUser = await db.prepare('SELECT id FROM users WHERE username = ?').get('guest')
  if (!guestUser) {
    const guestId = uuidv4()
    await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(guestId, 'guest', '', 1, Date.now())
    console.log('✅ 创建默认游客用户')
  }

  // 创建或迁移管理员账户
  const adminUser = await db.prepare('SELECT id FROM users WHERE username = ?').get(ADMIN_USERNAME)
  const legacyAdmin = await db.prepare('SELECT id FROM users WHERE username = ?').get('Admin')
  const adminPasswordHash = hashPassword(ADMIN_DEFAULT_PASSWORD)

  if (!adminUser) {
    if (legacyAdmin) {
      await db.prepare('UPDATE users SET username = ?, password_hash = ? WHERE id = ?')
        .run(ADMIN_USERNAME, adminPasswordHash, legacyAdmin.id)
      console.log(`✅ 已迁移管理员账户为 ${ADMIN_USERNAME}`)
    } else {
      const adminId = uuidv4()
      await db.prepare('INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)')
        .run(adminId, ADMIN_USERNAME, adminPasswordHash, 0, Date.now())
      console.log(`✅ 创建管理员账户 ${ADMIN_USERNAME}`)
    }
  } else {
    await db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(adminPasswordHash, adminUser.id)
  }

  // 迁移现有班级到游客用户
  const classesWithoutUser = await db.prepare('SELECT id FROM classes WHERE user_id IS NULL').all()
  if (classesWithoutUser.length > 0) {
    const guest = await db.prepare('SELECT id FROM users WHERE username = ?').get('guest')
    if (guest) {
      await db.prepare('UPDATE classes SET user_id = ? WHERE user_id IS NULL').run(guest.id)
      console.log(`✅ 迁移 ${classesWithoutUser.length} 个班级到游客用户`)
    }
  }

  // 演示班级独立归属游客账户；已有真实老师的数据不会被读取或改写。
  const guest = await db.prepare('SELECT id FROM users WHERE username = ?').get('guest')
  const demoSeedResult = await ensureDemoData(db, guest.id)
  if (demoSeedResult.seeded) {
    console.log(`🌻 已创建演示数据：${demoSeedResult.className}（${demoSeedResult.students} 名学生）`)
  }

  const demoVipResult = await ensureDemoVip(db)
  if (demoVipResult.ensured) {
    console.log('✨ 已为演示班级开通永久 VIP')
  }

  // 初始化默认评价规则
  const rulesCount = await db.prepare('SELECT COUNT(*) as count FROM evaluation_rules').get()
  if (rulesCount && rulesCount.count === 0) {
    await initDefaultRules()
  }

  // 初始化等级配置
  const levelConfig = await db.prepare("SELECT value FROM settings WHERE `key` = 'levelConfig'").get()
  if (!levelConfig) {
    await db.prepare("INSERT INTO settings (`key`, value) VALUES ('levelConfig', ?)")
      .run(JSON.stringify([40, 60, 80, 100, 120, 140, 160]))
  }

  // 注册 API 路由（兼容 /api 与 /pet-garden/api）
  registerApiRoutes('/api')
  registerApiRoutes('/pet-garden/api')

  app.use((err, req, res, next) => {
    console.error('API error:', err)
    if (res.headersSent) {
      next(err)
      return
    }
    res.status(500).json({ error: '服务器内部错误' })
  })

  registerFrontendRoutes()

  return app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`)
    if (hasFrontendBuild) {
      console.log('📦 已启用前端静态资源托管')
    }
    console.log(`📅 ${new Date().toLocaleString()}`)
  })
}

// 错误处理
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason)
})

let server
let stopDemoResetScheduler = null

async function getGuestUserId() {
  const guest = await db.prepare('SELECT id FROM users WHERE username = ?').get('guest')
  return guest?.id ?? null
}

bootstrap()
  .then((httpServer) => {
    server = httpServer
    stopDemoResetScheduler = startDemoResetScheduler(db, getGuestUserId)
  })
  .catch((err) => {
    console.error('Failed to start server:', err)
    process.exit(1)
  })

let shuttingDown = false

async function shutdown(signal) {
  if (shuttingDown) return
  shuttingDown = true
  console.log(`${signal} received, shutting down gracefully`)

  const forceExitTimer = setTimeout(() => {
    console.warn('Shutdown timeout, forcing exit')
    process.exit(0)
  }, 3000)
  forceExitTimer.unref()

  try {
    if (stopDemoResetScheduler) {
      stopDemoResetScheduler()
      stopDemoResetScheduler = null
    }
    if (server) {
      if (typeof server.closeAllConnections === 'function') {
        server.closeAllConnections()
      }
      await new Promise((resolve) => server.close(resolve))
      console.log('Server closed')
    }
    await db.close()
  } catch (err) {
    console.error('Error during shutdown:', err)
  } finally {
    clearTimeout(forceExitTimer)
    process.exit(0)
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  shutdown('SIGTERM')
})

process.on('SIGINT', () => {
  shutdown('SIGINT')
})
