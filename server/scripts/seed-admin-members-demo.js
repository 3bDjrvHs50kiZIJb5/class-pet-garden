/**
 * 为管理员「会员管理」页写入演示注册教师（本地 MySQL）。
 *
 * 用法（在仓库根目录，需可连上 DB）：
 *   node server/scripts/seed-admin-members-demo.js --dry-run
 *   node server/scripts/seed-admin-members-demo.js --count 12
 *
 * 环境变量与 server 一致：DB_HOST、DB_PORT、DB_USER、DB_PASSWORD、DB_NAME
 * 默认拒绝非本机库；远端须 UI_SEED_ALLOW_REMOTE=1
 */
import { v4 as uuidv4 } from 'uuid'
import { initDb, getDbConfig } from '../db.js'
import { hashPassword } from '../utils/password.js'

const ADMIN_USERNAME = 'admin'
const DEFAULT_PASSWORD = 'test123456'
const MARK = '种子数据-会员演示'

function parseArgs(argv) {
  const dryRun = argv.includes('--dry-run')
  let count = 12
  const countIdx = argv.indexOf('--count')
  if (countIdx !== -1) {
    const n = Number(argv[countIdx + 1])
    if (Number.isFinite(n) && n > 0 && n <= 200) count = Math.floor(n)
  }
  return { dryRun, count }
}

function assertLocalDbTarget() {
  if (process.env.UI_SEED_ALLOW_REMOTE === '1') return
  const host = (process.env.DB_HOST || '127.0.0.1').toLowerCase()
  const localHosts = new Set(['127.0.0.1', 'localhost', '::1', 'mysql'])
  if (!localHosts.has(host)) {
    throw new Error(`拒绝写入非本地数据库 (DB_HOST=${host})。远端须设置 UI_SEED_ALLOW_REMOTE=1 且用户已确认。`)
  }
}

function buildDemoPhone(index) {
  // 1380000XXXX，避开已有真实测试号段
  const suffix = String(1000 + index).padStart(4, '0')
  return `1380000${suffix}`
}

async function main() {
  const { dryRun, count } = parseArgs(process.argv.slice(2))
  assertLocalDbTarget()

  const cfg = getDbConfig()
  console.log(`[seed] 目标库 ${cfg.user}@${cfg.host}:${cfg.port}/${cfg.database}  dry-run=${dryRun}  count=${count}`)

  await initDb()

  const { db } = await import('../db.js')

  const rows = []
  const now = Date.now()
  for (let i = 1; i <= count; i++) {
    const username = buildDemoPhone(i)
    const existing = await db.prepare('SELECT id FROM users WHERE username = ?').get(username)
    if (existing) {
      console.log(`[skip] 已存在 ${username}`)
      continue
    }
    rows.push({
      id: uuidv4(),
      username,
      password_hash: hashPassword(DEFAULT_PASSWORD),
      is_guest: 0,
      created_at: now - i * 3600_000,
      seedClass: i % 3 === 0,
      seedStudents: i % 5 === 0 ? 3 : 0,
    })
  }

  if (!rows.length) {
    console.log('[seed] 无需插入（手机号均已存在）')
    return
  }

  console.log('[seed] 将插入教师：')
  for (const row of rows) {
    console.log(
      `  - ${row.username}  班级=${row.seedClass ? 1 : 0}  学生=${row.seedStudents}`,
    )
  }

  if (dryRun) {
    console.log(`[dry-run] 共 ${rows.length} 条，未写入数据库。确认后去掉 --dry-run 执行。`)
    return
  }

  for (const row of rows) {
    await db.prepare(
      'INSERT INTO users (id, username, password_hash, is_guest, created_at) VALUES (?, ?, ?, ?, ?)',
    ).run(row.id, row.username, row.password_hash, row.is_guest, row.created_at)

    if (row.seedClass) {
      const classId = uuidv4()
      const t = Date.now()
      await db.prepare(
        'INSERT INTO classes (id, user_id, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      ).run(classId, row.id, `${MARK}-${row.username.slice(-4)}班`, t, t)

      for (let s = 0; s < row.seedStudents; s++) {
        await db.prepare(
          'INSERT INTO students (id, class_id, name, created_at) VALUES (?, ?, ?, ?)',
        ).run(uuidv4(), classId, `演示学生${s + 1}`, t)
      }
    }
  }

  const total = await db.prepare(`
    SELECT COUNT(*) AS c FROM users WHERE is_guest = 0 AND LOWER(username) != LOWER(?)
  `).get(ADMIN_USERNAME)
  console.log(`[done] 会员管理列表可见教师约 ${total?.c ?? '?'} 人（含本次插入 ${rows.length}）`)
  console.log(`[hint] 演示账号密码：${DEFAULT_PASSWORD}`)
}

main().catch((error) => {
  console.error('[seed] 失败:', error.message || error)
  process.exit(1)
})