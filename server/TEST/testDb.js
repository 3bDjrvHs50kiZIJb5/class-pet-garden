import mysql from 'mysql2/promise'
import { getDbConfig, initDb, db } from '../db.js'

const TEST_DB_NAME = 'classpets_test'

const TABLES = [
  'task_completions',
  'class_tasks',
  'evaluation_records',
  'class_vip_subscriptions',
  'badges',
  'students',
  'classes',
  'evaluation_rules',
  'settings',
  'users',
]

export async function ensureTestDatabase() {
  const config = getDbConfig()
  const admin = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
  })
  await admin.query(`CREATE DATABASE IF NOT EXISTS \`${TEST_DB_NAME}\` DEFAULT CHARSET utf8mb4`)
  await admin.end()
}

export async function resetTestDb() {
  await db.exec('SET FOREIGN_KEY_CHECKS = 0')
  for (const table of TABLES) {
    await db.prepare(`DELETE FROM ${table}`).run()
  }
  await db.exec('SET FOREIGN_KEY_CHECKS = 1')
}

let initialized = false

export async function setupTestDb() {
  if (!initialized) {
    await ensureTestDatabase()
    await initDb()
    initialized = true
  }
  await resetTestDb()
  return db
}
