import { defineEventHandler, readBody, getQuery } from 'h3'
import { randomBytes } from 'crypto'
import bcrypt from 'bcrypt'
import pool from '../../utils/dbPool'
import logger from '../../utils/logger'

const BCRYPT_ROUNDS = 12

async function ensureAdminPassword(): Promise<string> {
  const [rows] = await pool.execute(
    `SELECT config_value FROM configurations WHERE section = 'local_auth' AND config_key = 'admin_password_hash'`
  ) as any[]
  if (rows.length > 0) return rows[0].config_value

  // First run: generate and store a hashed password
  const plainPassword = randomBytes(12).toString('base64url')
  const hash = await bcrypt.hash(plainPassword, BCRYPT_ROUNDS)
  await pool.execute(
    `INSERT INTO configurations (section, config_key, config_value) VALUES ('local_auth', 'admin_password_hash', ?)`,
    [hash]
  )
  logger.info('admin-data', 'Initial admin password generated and stored')
  return hash
}

export default defineEventHandler(async (event) => {
  const method = event.method

  if (method === 'GET') {
    const query = getQuery(event)
    const type = query.type as string | undefined

    if (type === 'password') {
      const hash = await ensureAdminPassword()
      // Only return existence info, never the hash itself
      return { exists: !!hash }
    }

    if (type === 'admin-users') {
      const [rows] = await pool.execute(
        `SELECT u.email, u.name FROM users u
         INNER JOIN user_roles r ON u.id = r.user_id
         WHERE r.role = 'admin'`
      ) as any[]
      return { users: rows }
    }

    if (type === 'authenticated-users') {
      const [rows] = await pool.execute(
        `SELECT email, name, UNIX_TIMESTAMP(last_seen) * 1000 AS lastAuthenticated
         FROM users WHERE last_seen IS NOT NULL
         ORDER BY last_seen DESC LIMIT 50`
      ) as any[]
      return { users: rows }
    }

    return { error: 'Invalid data type requested' }
  }

  if (method === 'POST') {
    const body = await readBody(event)
    const { type, data } = body || {}

    if (!type) return { error: 'Missing type parameter' }

    if (type === 'verify-admin-password') {
      const passwordInput = typeof data === 'string' ? data.trim() : null
      if (!passwordInput) return { success: false, message: 'No password provided' }

      const hash = await ensureAdminPassword()
      const match = await bcrypt.compare(passwordInput, hash)
      return {
        success: match,
        message: match ? 'Password verified successfully' : 'Invalid administrator password'
      }
    }

    if (type === 'password' && typeof data === 'string') {
      const hash = await bcrypt.hash(data.trim(), BCRYPT_ROUNDS)
      await pool.execute(
        `INSERT INTO configurations (section, config_key, config_value) VALUES ('local_auth', 'admin_password_hash', ?)
         ON DUPLICATE KEY UPDATE config_value = VALUES(config_value)`,
        [hash]
      )
      return { success: true }
    }

    if (type === 'admin-users' && Array.isArray(data)) {
      const conn = await pool.getConnection()
      try {
        await conn.beginTransaction()
        // Upsert each user and assign admin role
        for (const u of data) {
          if (!u.email) continue
          await conn.execute(
            `INSERT INTO users (email, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)`,
            [u.email, u.name || u.email]
          )
          const [rows] = await conn.execute(`SELECT id FROM users WHERE email = ?`, [u.email]) as any[]
          if (rows.length > 0) {
            await conn.execute(
              `INSERT IGNORE INTO user_roles (user_id, role) VALUES (?, 'admin')`,
              [rows[0].id]
            )
          }
        }
        await conn.commit()
      } catch (err) {
        await conn.rollback()
        throw err
      } finally {
        conn.release()
      }
      return { success: true }
    }

    if (type === 'authenticated-users' && Array.isArray(data)) {
      const conn = await pool.getConnection()
      try {
        await conn.beginTransaction()
        for (const u of data) {
          if (!u.email) continue
          await conn.execute(
            `INSERT INTO users (email, name, last_seen) VALUES (?, ?, FROM_UNIXTIME(? / 1000))
             ON DUPLICATE KEY UPDATE name = VALUES(name), last_seen = VALUES(last_seen)`,
            [u.email, u.name || u.email, u.lastAuthenticated || Date.now()]
          )
        }
        await conn.commit()
      } catch (err) {
        await conn.rollback()
        throw err
      } finally {
        conn.release()
      }
      return { success: true }
    }

    return { error: 'Invalid data type' }
  }

  return { error: 'Unsupported method' }
})
