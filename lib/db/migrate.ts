/**
 * Self-bootstrapping Hostinger MySQL/MariaDB migrations + seed.
 * Runs once on server startup via instrumentation.ts.
 */
import { eq } from "drizzle-orm"
import { hashPassword } from "@/lib/auth"
import { db, client } from "./index"
import { referralSettings, siteSettings, users } from "./schema"

const DDL_MYSQL = [
  `CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(191) PRIMARY KEY,
    name VARCHAR(512) NOT NULL,
    email VARCHAR(512) NOT NULL UNIQUE,
    password VARCHAR(512) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    phone VARCHAR(50),
    commission_percent DOUBLE NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX password_reset_tokens_user_id_idx (user_id),
    CONSTRAINT password_reset_tokens_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS app_releases (
    platform VARCHAR(20) PRIMARY KEY,
    filename VARCHAR(512) NOT NULL,
    original_name VARCHAR(512) NOT NULL,
    version VARCHAR(100) NOT NULL DEFAULT '',
    mime_type VARCHAR(191) NOT NULL DEFAULT 'application/octet-stream',
    file_size DOUBLE NOT NULL DEFAULT 0,
    uploaded_by VARCHAR(191),
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT app_releases_uploaded_by_users_id_fk FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS courses (
    id VARCHAR(191) PRIMARY KEY,
    title VARCHAR(512) NOT NULL,
    instructor VARCHAR(512) NOT NULL,
    instructor_id VARCHAR(191),
    category VARCHAR(512) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'recorded',
    start_date DATETIME,
    description VARCHAR(4096) NOT NULL DEFAULT '',
    short_description VARCHAR(4096) NOT NULL DEFAULT '',
    duration VARCHAR(512) NOT NULL DEFAULT 'Self-paced',
    price DOUBLE NOT NULL DEFAULT 0,
    thumbnail VARCHAR(2048) NOT NULL DEFAULT '',
    rating DOUBLE NOT NULL DEFAULT 0,
    students INT NOT NULL DEFAULT 0,
    level VARCHAR(20) NOT NULL DEFAULT 'Beginner',
    referral_amount DOUBLE,
    validity_days INT,
    original_price DOUBLE,
    certificates_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT courses_instructor_id_users_id_fk FOREIGN KEY (instructor_id) REFERENCES users(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS chapters (
    id VARCHAR(191) PRIMARY KEY,
    course_id VARCHAR(191) NOT NULL,
    title VARCHAR(512) NOT NULL,
    position INT NOT NULL DEFAULT 0,
    CONSTRAINT chapters_course_id_courses_id_fk FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS lessons (
    id VARCHAR(191) PRIMARY KEY,
    chapter_id VARCHAR(191) NOT NULL,
    title VARCHAR(512) NOT NULL,
    lesson_type VARCHAR(20) NOT NULL DEFAULT 'VIDEO',
    video_url VARCHAR(2048) NOT NULL DEFAULT '',
    pdf_path VARCHAR(2048) NOT NULL DEFAULT '',
    pdf_title VARCHAR(512) NOT NULL DEFAULT '',
    pdf_description VARCHAR(4096) NOT NULL DEFAULT '',
    url_link VARCHAR(2048) NOT NULL DEFAULT '',
    duration VARCHAR(512) NOT NULL DEFAULT '',
    preview BOOLEAN NOT NULL DEFAULT FALSE,
    position INT NOT NULL DEFAULT 0,
    CONSTRAINT lessons_chapter_id_chapters_id_fk FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS purchases (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    course_id VARCHAR(191) NOT NULL,
    amount DOUBLE NOT NULL,
    payment_id VARCHAR(512) NOT NULL,
    purchased_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at DATETIME,
    CONSTRAINT purchases_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT purchases_course_id_courses_id_fk FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS progress (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    lesson_id VARCHAR(191) NOT NULL,
    UNIQUE KEY progress_user_lesson_unique (user_id, lesson_id),
    CONSTRAINT progress_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT progress_lesson_id_lessons_id_fk FOREIGN KEY (lesson_id) REFERENCES lessons(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS referral_settings (
    id VARCHAR(191) PRIMARY KEY DEFAULT 'global',
    reward_percent DOUBLE NOT NULL DEFAULT 10,
    max_referrals INT NOT NULL DEFAULT 0,
    auto_credit BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS referral_codes (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL UNIQUE,
    code VARCHAR(80) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT referral_codes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS referral_earnings (
    id VARCHAR(191) PRIMARY KEY,
    referrer_id VARCHAR(191) NOT NULL,
    referred_id VARCHAR(191) NOT NULL,
    course_id VARCHAR(191) NOT NULL,
    amount DOUBLE NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT referral_earnings_referrer_id_users_id_fk FOREIGN KEY (referrer_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT referral_earnings_referred_id_users_id_fk FOREIGN KEY (referred_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT referral_earnings_course_id_courses_id_fk FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS withdrawal_requests (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    amount DOUBLE NOT NULL,
    upi_id VARCHAR(512) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'pending',
    note VARCHAR(4096),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT withdrawal_requests_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS referral_payment_receipts (
    id VARCHAR(191) PRIMARY KEY,
    withdrawal_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    admin_id VARCHAR(191) NOT NULL,
    file_path VARCHAR(2048) NOT NULL,
    receipt_no VARCHAR(512) NOT NULL,
    transaction_id VARCHAR(512),
    amount DOUBLE NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT referral_payment_receipts_withdrawal_id_fk FOREIGN KEY (withdrawal_id) REFERENCES withdrawal_requests(id) ON DELETE CASCADE,
    CONSTRAINT referral_payment_receipts_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT referral_payment_receipts_admin_id_fk FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS user_sessions (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_sessions_user_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS community_members (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL UNIQUE,
    status VARCHAR(30) NOT NULL DEFAULT 'active',
    joined_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at DATETIME,
    notes VARCHAR(4096),
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT community_members_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS community_posts (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    title VARCHAR(512),
    body VARCHAR(4096) NOT NULL DEFAULT '',
    attachments VARCHAR(4096) NOT NULL DEFAULT '[]',
    tags VARCHAR(4096) NOT NULL DEFAULT '[]',
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT community_posts_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS community_comments (
    id VARCHAR(191) PRIMARY KEY,
    post_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    parent_id VARCHAR(191),
    body VARCHAR(4096) NOT NULL DEFAULT '',
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT community_comments_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    CONSTRAINT community_comments_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS community_likes (
    id VARCHAR(191) PRIMARY KEY,
    post_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT community_likes_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    CONSTRAINT community_likes_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS community_bookmarks (
    id VARCHAR(191) PRIMARY KEY,
    post_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT community_bookmarks_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    CONSTRAINT community_bookmarks_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS community_reports (
    id VARCHAR(191) PRIMARY KEY,
    post_id VARCHAR(191) NOT NULL,
    user_id VARCHAR(191) NOT NULL,
    reason VARCHAR(4096) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT community_reports_post_id_posts_id_fk FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    CONSTRAINT community_reports_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS community_chat_messages (
    id VARCHAR(191) PRIMARY KEY,
    room_id VARCHAR(191) NOT NULL DEFAULT 'general',
    user_id VARCHAR(191) NOT NULL,
    message VARCHAR(4096) NOT NULL DEFAULT '',
    attachment_url VARCHAR(2048),
    attachment_type VARCHAR(80),
    reply_to_id VARCHAR(191),
    edited_at DATETIME,
    deleted BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT community_chat_messages_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS community_announcements (
    id VARCHAR(191) PRIMARY KEY,
    body VARCHAR(4096) NOT NULL DEFAULT '',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS community_notifications (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    title VARCHAR(512) NOT NULL DEFAULT '',
    body VARCHAR(4096) NOT NULL DEFAULT '',
    link VARCHAR(2048),
    seen BOOLEAN NOT NULL DEFAULT FALSE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT community_notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS site_settings (
    \`key\` VARCHAR(191) PRIMARY KEY,
    value VARCHAR(4096) NOT NULL DEFAULT '[]',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS certificates (
    id VARCHAR(191) PRIMARY KEY,
    user_id VARCHAR(191) NOT NULL,
    course_id VARCHAR(191) NOT NULL,
    certificate_name VARCHAR(512) NOT NULL,
    certificate_number VARCHAR(512) NOT NULL UNIQUE,
    issued_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    pdf_path VARCHAR(2048) NOT NULL DEFAULT '',
    UNIQUE KEY certificates_user_course_unique (user_id, course_id),
    CONSTRAINT certificates_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT certificates_course_id_courses_id_fk FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  )`,
  `CREATE TABLE IF NOT EXISTS coupons (
    id VARCHAR(191) PRIMARY KEY,
    code VARCHAR(80) NOT NULL UNIQUE,
    course_id VARCHAR(191),
    discount_type VARCHAR(10) NOT NULL DEFAULT 'percent',
    discount_value DOUBLE NOT NULL DEFAULT 0,
    max_usage INT NOT NULL DEFAULT 0,
    usage_count INT NOT NULL DEFAULT 0,
    expires_at DATETIME,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT coupons_course_id_courses_id_fk FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
  )`,
]

const ADDITIVE_MYSQL = [
  `ALTER TABLE courses ADD COLUMN IF NOT EXISTS referral_amount DOUBLE`,
  `ALTER TABLE courses ADD COLUMN IF NOT EXISTS validity_days INT`,
  `ALTER TABLE courses ADD COLUMN IF NOT EXISTS original_price DOUBLE`,
  `ALTER TABLE courses ADD COLUMN IF NOT EXISTS certificates_enabled BOOLEAN NOT NULL DEFAULT FALSE`,
  `ALTER TABLE courses ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'recorded'`,
  `ALTER TABLE courses ADD COLUMN IF NOT EXISTS start_date DATETIME`,
  `ALTER TABLE purchases ADD COLUMN IF NOT EXISTS expires_at DATETIME`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50)`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS commission_percent DOUBLE NOT NULL DEFAULT 0`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS upi_id VARCHAR(512) NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS degree VARCHAR(512) NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS organization VARCHAR(512) NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS bio VARCHAR(4096) NOT NULL DEFAULT ''`,
  `ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS device_label VARCHAR(512) NOT NULL DEFAULT 'Unknown device'`,
  `ALTER TABLE user_sessions ADD COLUMN IF NOT EXISTS ip_address VARCHAR(100) NOT NULL DEFAULT ''`,
  `ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_id VARCHAR(191)`,
  `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS lesson_type VARCHAR(20) NOT NULL DEFAULT 'VIDEO'`,
  `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS pdf_path VARCHAR(2048) NOT NULL DEFAULT ''`,
  `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS pdf_title VARCHAR(512) NOT NULL DEFAULT ''`,
  `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS pdf_description VARCHAR(4096) NOT NULL DEFAULT ''`,
  `ALTER TABLE lessons ADD COLUMN IF NOT EXISTS url_link VARCHAR(2048) NOT NULL DEFAULT ''`,
  `ALTER TABLE referral_settings ADD COLUMN IF NOT EXISTS reward_percent DOUBLE NOT NULL DEFAULT 10`,
  `ALTER TABLE courses ADD COLUMN IF NOT EXISTS marketing_student_count INT NOT NULL DEFAULT 0`,
  `ALTER TABLE courses ADD COLUMN IF NOT EXISTS student_count_mode VARCHAR(10) NOT NULL DEFAULT 'actual'`,
  `ALTER TABLE courses ADD COLUMN IF NOT EXISTS urgency_label VARCHAR(512) NOT NULL DEFAULT ''`,
  `ALTER TABLE users ADD COLUMN IF NOT EXISTS referral_percent DOUBLE`,
  `CREATE TABLE IF NOT EXISTS revenue_shares (
    id VARCHAR(191) PRIMARY KEY,
    name VARCHAR(512) NOT NULL,
    designation VARCHAR(512) NOT NULL DEFAULT '',
    percentage DOUBLE NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS purchase_allocations (
    id VARCHAR(191) PRIMARY KEY,
    purchase_id VARCHAR(191) NOT NULL,
    type VARCHAR(20) NOT NULL,
    reference_id VARCHAR(191) NOT NULL,
    reference_name VARCHAR(512) NOT NULL,
    percentage DOUBLE NOT NULL DEFAULT 0,
    amount DOUBLE NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT purchase_allocations_purchase_id_fk FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
  )`,
]

async function runMigrations() {
  for (const stmt of DDL_MYSQL) {
    await client.execRaw(stmt)
  }

  for (const stmt of ADDITIVE_MYSQL) {
    try {
      await client.execRaw(stmt)
    } catch {
      // Older MySQL servers may not support ADD COLUMN IF NOT EXISTS.
      // Fresh Hostinger databases already receive these columns from DDL_MYSQL.
    }
  }
}

async function seedIfEmpty() {
  const existing = await db.select().from(users)
  if (existing.length > 0) return

  const adminHash = await hashPassword("admin123")

  await db.insert(users).values({
    id: "admin-1",
    name: "Platform Admin",
    email: "umaima@edgerax.com",
    password: adminHash,
    role: "admin",
  })
}

async function seedReferralSettings() {
  const existing = await db.select().from(referralSettings).where(eq(referralSettings.id, "global"))
  if (existing.length === 0) {
    await db.insert(referralSettings).values({
      id: "global",
      rewardPercent: 10,
      maxReferrals: 0,
      autoCredit: false,
    })
  }
}

async function seedSiteSettings() {
  // Seed max_devices default (0 = unlimited) if not already set
  const rows = await db.select().from(siteSettings).where(eq(siteSettings.key, "max_devices"))
  if (rows.length === 0) {
    await db.insert(siteSettings).values({
      key: "max_devices",
      value: "0",
      updatedAt: new Date().toISOString(),
    })
  }
}

export async function initDb() {
  await runMigrations()
  await seedIfEmpty()
  await seedReferralSettings()
  await seedSiteSettings()
}
