/**
 * Database connection — Hostinger MySQL/MariaDB only.
 *
 * Set DATABASE_URL in Hostinger using this shape:
 * mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/DB_NAME
 */

import mysql from "mysql2/promise"
import { drizzle } from "drizzle-orm/mysql2"
import * as schema from "./schema"

type AnyClient = {
  execRaw: (sql: string) => Promise<void>
}

function requireDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error(
      "DATABASE_URL is required. Configure your Hostinger MySQL database URL; local SQLite is disabled.",
    )
  }

  if (!url.startsWith("mysql://") && !url.startsWith("mysql2://")) {
    throw new Error("DATABASE_URL must use mysql:// or mysql2:// for Hostinger MySQL/MariaDB.")
  }

  return url
}

function createDb(): { db: any; client: AnyClient } {
  const connectionUri = requireDatabaseUrl()

  // TiDB Cloud and some hosted MySQL providers require SSL.
  // Detect by host pattern; can be overridden with DB_SSL=false.
  const requireSsl = process.env.DB_SSL !== "false" && (
    connectionUri.includes("tidbcloud.com") ||
    connectionUri.includes("planetscale.com") ||
    process.env.DB_SSL === "true"
  )

  const pool = mysql.createPool({
    uri: connectionUri,
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 10),
    queueLimit: 0,
    dateStrings: true,
    ...(requireSsl ? { ssl: { rejectUnauthorized: true } } : {}),
  })

  const db = drizzle(pool, { schema, mode: "default" })

  const client: AnyClient = {
    execRaw: async (rawSql: string) => {
      const stmts = rawSql.split(";").map((s) => s.trim()).filter(Boolean)
      for (const stmt of stmts) {
        await pool.query(stmt)
      }
    },
  }

  return { db, client }
}

const g = globalThis as unknown as { _edgerax?: ReturnType<typeof createDb> }
const instance = g._edgerax ?? createDb()
if (process.env.NODE_ENV !== "production") g._edgerax = instance

export const db = instance.db
export const client = instance.client
