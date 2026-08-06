import { client } from "./index"

let tableReady: Promise<void> | null = null

/**
 * Startup migrations create this table in normal deployments. This guard also
 * supports long-running development servers that started before the migration
 * was added and therefore have not rerun instrumentation yet.
 */
export function ensurePasswordResetTable() {
  if (!tableReady) {
    tableReady = client.execRaw(`CREATE TABLE IF NOT EXISTS password_reset_tokens (
      id VARCHAR(191) PRIMARY KEY,
      user_id VARCHAR(191) NOT NULL,
      token_hash VARCHAR(64) NOT NULL UNIQUE,
      expires_at DATETIME NOT NULL,
      used_at DATETIME,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX password_reset_tokens_user_id_idx (user_id),
      CONSTRAINT password_reset_tokens_user_id_users_id_fk
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`).catch((error) => {
      tableReady = null
      throw error
    })
  }

  return tableReady
}
