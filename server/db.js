import { AsyncLocalStorage } from 'async_hooks'
import mysql from 'mysql2/promise'

const storage = new AsyncLocalStorage()

export function getDbConfig() {
  return {
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'classpets',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  }
}

const poolState = { pool: null }

export function getPool() {
  if (!poolState.pool) {
    poolState.pool = mysql.createPool(getDbConfig())
  }
  return poolState.pool
}

function normalizeSql(sql) {
  return sql.replace(/INSERT OR IGNORE/gi, 'INSERT IGNORE')
}

function getExecutor() {
  return storage.getStore() || getPool()
}

function createDbInterface() {
  return {
    prepare(sql) {
      const normalizedSql = normalizeSql(sql)
      return {
        async get(...params) {
          const [rows] = await getExecutor().execute(normalizedSql, params)
          return rows[0]
        },
        async all(...params) {
          const [rows] = await getExecutor().execute(normalizedSql, params)
          return rows
        },
        async run(...params) {
          const [result] = await getExecutor().execute(normalizedSql, params)
          return {
            changes: result.affectedRows,
            lastInsertRowid: result.insertId,
          }
        },
      }
    },

    async exec(sql) {
      const statements = sql
        .split(';')
        .map(statement => statement.trim())
        .filter(statement => statement && !statement.startsWith('--'))

      for (const statement of statements) {
        await getExecutor().query(statement)
      }
    },

    transaction(fn) {
      return async (...args) => {
        if (storage.getStore()) {
          return fn(...args)
        }

        const conn = await getPool().getConnection()
        try {
          await conn.beginTransaction()
          const result = await storage.run(conn, async () => fn(...args))
          await conn.commit()
          return result
        } catch (error) {
          await conn.rollback()
          throw error
        } finally {
          conn.release()
        }
      }
    },

    async close() {
      if (poolState.pool) {
        await poolState.pool.end()
        poolState.pool = null
      }
    },
  }
}

export const db = createDbInterface()

export async function initDb() {
  const pool = getPool()
  const statements = [
    `CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(36) PRIMARY KEY,
      username VARCHAR(255) NOT NULL UNIQUE,
      password_hash VARCHAR(255) NOT NULL,
      is_guest TINYINT NOT NULL DEFAULT 0,
      created_at BIGINT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS classes (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36),
      name VARCHAR(255) NOT NULL,
      created_at BIGINT,
      updated_at BIGINT,
      INDEX idx_classes_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS students (
      id VARCHAR(36) PRIMARY KEY,
      class_id VARCHAR(36) NOT NULL,
      name VARCHAR(255) NOT NULL,
      student_no VARCHAR(64),
      total_points INT NOT NULL DEFAULT 0,
      pet_type VARCHAR(64),
      pet_level INT NOT NULL DEFAULT 1,
      pet_exp INT NOT NULL DEFAULT 0,
      created_at BIGINT,
      INDEX idx_students_class_id (class_id),
      CONSTRAINT fk_students_class FOREIGN KEY (class_id) REFERENCES classes(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS badges (
      id VARCHAR(36) PRIMARY KEY,
      student_id VARCHAR(36) NOT NULL,
      pet_type VARCHAR(64) NOT NULL,
      earned_at BIGINT,
      INDEX idx_badges_student_id (student_id),
      CONSTRAINT fk_badges_student FOREIGN KEY (student_id) REFERENCES students(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS evaluation_rules (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      points INT NOT NULL,
      category VARCHAR(64) NOT NULL,
      is_custom TINYINT NOT NULL DEFAULT 0,
      user_id VARCHAR(36),
      created_at BIGINT,
      INDEX idx_rules_user_id (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS evaluation_records (
      id VARCHAR(36) PRIMARY KEY,
      class_id VARCHAR(36) NOT NULL,
      student_id VARCHAR(36) NOT NULL,
      points INT NOT NULL,
      reason VARCHAR(512) NOT NULL,
      category VARCHAR(64) NOT NULL,
      timestamp BIGINT,
      INDEX idx_records_class_id (class_id),
      INDEX idx_records_student_id (student_id),
      INDEX idx_records_timestamp (timestamp),
      CONSTRAINT fk_records_class FOREIGN KEY (class_id) REFERENCES classes(id),
      CONSTRAINT fk_records_student FOREIGN KEY (student_id) REFERENCES students(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS settings (
      \`key\` VARCHAR(128) PRIMARY KEY,
      value TEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS class_tasks (
      id VARCHAR(36) PRIMARY KEY,
      class_id VARCHAR(36) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      rule_id VARCHAR(36) NOT NULL,
      deadline BIGINT,
      target_type VARCHAR(32) NOT NULL DEFAULT 'all',
      target_student_ids TEXT,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      created_at BIGINT,
      updated_at BIGINT,
      INDEX idx_tasks_class_id (class_id),
      CONSTRAINT fk_tasks_class FOREIGN KEY (class_id) REFERENCES classes(id),
      CONSTRAINT fk_tasks_rule FOREIGN KEY (rule_id) REFERENCES evaluation_rules(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS task_completions (
      id VARCHAR(36) PRIMARY KEY,
      task_id VARCHAR(36) NOT NULL,
      student_id VARCHAR(36) NOT NULL,
      evaluation_record_id VARCHAR(36),
      completed_at BIGINT,
      completed_by VARCHAR(36),
      UNIQUE KEY uk_task_student (task_id, student_id),
      INDEX idx_completions_task_id (task_id),
      INDEX idx_completions_student_id (student_id),
      CONSTRAINT fk_completions_task FOREIGN KEY (task_id) REFERENCES class_tasks(id),
      CONSTRAINT fk_completions_student FOREIGN KEY (student_id) REFERENCES students(id),
      CONSTRAINT fk_completions_record FOREIGN KEY (evaluation_record_id) REFERENCES evaluation_records(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,

    `CREATE TABLE IF NOT EXISTS class_vip_subscriptions (
      id VARCHAR(36) PRIMARY KEY,
      class_id VARCHAR(36) NOT NULL UNIQUE,
      plan VARCHAR(32) NOT NULL,
      status VARCHAR(32) NOT NULL DEFAULT 'active',
      started_at BIGINT NOT NULL,
      expires_at BIGINT NOT NULL,
      created_at BIGINT NOT NULL,
      updated_at BIGINT NOT NULL,
      CONSTRAINT fk_vip_class FOREIGN KEY (class_id) REFERENCES classes(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  ]

  for (const statement of statements) {
    await pool.query(statement)
  }

  await pool.query(`
    INSERT IGNORE INTO evaluation_rules (id, name, points, category, is_custom, created_at) VALUES
      ('rule_1', '课堂积极发言', 2, '学习', 0, 1704067200000),
      ('rule_2', '作业完成优秀', 3, '学习', 0, 1704067200000),
      ('rule_3', '帮助同学', 2, '行为', 0, 1704067200000),
      ('rule_4', '遵守纪律', 1, '行为', 0, 1704067200000),
      ('rule_5', '迟到', -1, '行为', 0, 1704067200000),
      ('rule_6', '未完成作业', -2, '学习', 0, 1704067200000),
      ('rule_7', '课堂捣乱', -3, '行为', 0, 1704067200000),
      ('rule_8', '主动打扫卫生', 2, '健康', 0, 1704067200000),
      ('rule_9', '坚持运动', 2, '健康', 0, 1704067200000),
      ('rule_10', '不讲卫生', -1, '健康', 0, 1704067200000)
  `)
}

export { getPool as pool }
