import { sql } from "drizzle-orm"
import { boolean, datetime, double, int, mysqlTable, text, varchar } from "drizzle-orm/mysql-core"

const idColumn = (name: string) => varchar(name, { length: 191 })
const shortText = (name: string) => varchar(name, { length: 512 })
const longText = (name: string) => text(name)
const urlText = (name: string) => varchar(name, { length: 2048 })
const dateColumn = (name: string) => datetime(name, { mode: "string" }).notNull().default(sql`CURRENT_TIMESTAMP`)

const tableFactory = (name: string, columns: Record<string, any>) =>
  mysqlTable(name, columns as any) as any

export const users = tableFactory("users", {
  id:        idColumn("id").primaryKey(),
  name:      shortText("name").notNull(),
  email:     shortText("email").notNull().unique(),
  password:  shortText("password").notNull(),
  role:      varchar("role", { length: 20 }).notNull().default("user"),
  phone:     varchar("phone", { length: 50 }),
  commissionPercent: double("commission_percent").notNull().default(0),
  upiId:     shortText("upi_id").notNull().default(""),
  degree:    shortText("degree").notNull().default(""),
  organization: shortText("organization").notNull().default(""),
  bio:       longText("bio").notNull(),
  /**
   * Per-user referral reward override (%). null = use global referral_settings value.
   * Applies when this user's referral code is used at purchase time.
   */
  referralPercent: double("referral_percent"),
  createdAt: dateColumn("created_at"),
})

export const passwordResetTokens = tableFactory("password_reset_tokens", {
  id:        idColumn("id").primaryKey(),
  userId:    idColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
  expiresAt: datetime("expires_at", { mode: "string" }).notNull(),
  usedAt:    datetime("used_at", { mode: "string" }),
  createdAt: dateColumn("created_at"),
})

export const appReleases = tableFactory("app_releases", {
  platform:     varchar("platform", { length: 20 }).primaryKey(),
  filename:     shortText("filename").notNull(),
  originalName: shortText("original_name").notNull(),
  version:      varchar("version", { length: 100 }).notNull().default(""),
  mimeType:     varchar("mime_type", { length: 191 }).notNull().default("application/octet-stream"),
  fileSize:     double("file_size").notNull().default(0),
  uploadedBy:   idColumn("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  uploadedAt:   dateColumn("uploaded_at"),
})

export const courses = tableFactory("courses", {
  id:               idColumn("id").primaryKey(),
  title:            shortText("title").notNull(),
  instructor:       shortText("instructor").notNull(),
  instructorId:     idColumn("instructor_id").references(() => users.id, { onDelete: "set null" }),
  category:         shortText("category").notNull(),
  status:           varchar("status", { length: 20 }).notNull().default("recorded"),
  startDate:        datetime("start_date", { mode: "string" }),
  description:      longText("description").notNull(),
  shortDescription: longText("short_description").notNull(),
  duration:         shortText("duration").notNull().default("Self-paced"),
  price:            double("price").notNull().default(0),
  originalPrice:    double("original_price"),
  thumbnail:        urlText("thumbnail").notNull().default(""),
  rating:           double("rating").notNull().default(0),
  students:         int("students").notNull().default(0),
  level:            varchar("level", { length: 20 }).notNull().default("Beginner"),
  referralAmount:   double("referral_amount"),
  validityDays:     int("validity_days"),
  certificatesEnabled: boolean("certificates_enabled").notNull().default(false),
  /** Custom student count set by admin for marketing purposes. */
  marketingStudentCount: int("marketing_student_count").notNull().default(0),
  /**
   * Controls which number is shown on course cards:
   *   "actual"  — show real purchase count (courses.students)
   *   "custom"  — show marketingStudentCount only
   *   "total"   — show students + marketingStudentCount
   */
  studentCountMode: varchar("student_count_mode", { length: 10 }).notNull().default("actual"),
  /**
   * Short urgency message shown on the course card in a highlighted colour.
   * Empty string = nothing shown.
   * e.g. "Only 10 seats left!" or "Hurry up! Offer ends soon."
   */
  urgencyLabel: shortText("urgency_label").notNull().default(""),
  createdAt:        dateColumn("created_at"),
})

export const chapters = tableFactory("chapters", {
  id:       idColumn("id").primaryKey(),
  courseId: idColumn("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  title:    shortText("title").notNull(),
  position: int("position").notNull().default(0),
})

export const lessons = tableFactory("lessons", {
  id:              idColumn("id").primaryKey(),
  chapterId:       idColumn("chapter_id").notNull().references(() => chapters.id, { onDelete: "cascade" }),
  title:           shortText("title").notNull(),
  lessonType:      varchar("lesson_type", { length: 20 }).notNull().default("VIDEO"),
  videoUrl:        urlText("video_url").notNull().default(""),
  pdfPath:         urlText("pdf_path").notNull().default(""),
  pdfTitle:        shortText("pdf_title").notNull().default(""),
  pdfDescription:  longText("pdf_description").notNull(),
  urlLink:         urlText("url_link").notNull().default(""),
  duration:        shortText("duration").notNull().default(""),
  preview:         boolean("preview").notNull().default(false),
  position:        int("position").notNull().default(0),
})

export const purchases = tableFactory("purchases", {
  id:          idColumn("id").primaryKey(),
  userId:      idColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId:    idColumn("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  amount:      double("amount").notNull(),
  paymentId:   shortText("payment_id").notNull(),
  purchasedAt: dateColumn("purchased_at"),
  expiresAt:   datetime("expires_at", { mode: "string" }),
})

export const communityMembers = tableFactory("community_members", {
  id:          idColumn("id").primaryKey(),
  userId:      idColumn("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  status:      varchar("status", { length: 30 }).notNull().default("active"),
  joinedAt:    dateColumn("joined_at"),
  approvedAt:  datetime("approved_at", { mode: "string" }),
  notes:       longText("notes"),
  createdAt:   dateColumn("created_at"),
})

export const communityPosts = tableFactory("community_posts", {
  id:           idColumn("id").primaryKey(),
  userId:       idColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title:        shortText("title"),
  body:         longText("body").notNull(),
  attachments:  longText("attachments").notNull(),
  tags:         longText("tags").notNull(),
  pinned:       boolean("pinned").notNull().default(false),
  deleted:      boolean("deleted").notNull().default(false),
  createdAt:    dateColumn("created_at"),
  updatedAt:    dateColumn("updated_at"),
})

export const communityComments = tableFactory("community_comments", {
  id:           idColumn("id").primaryKey(),
  postId:       idColumn("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  userId:       idColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parentId:     idColumn("parent_id"),
  body:         longText("body").notNull(),
  deleted:      boolean("deleted").notNull().default(false),
  createdAt:    dateColumn("created_at"),
  updatedAt:    dateColumn("updated_at"),
})

export const communityLikes = tableFactory("community_likes", {
  id:           idColumn("id").primaryKey(),
  postId:       idColumn("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  userId:       idColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt:    dateColumn("created_at"),
})

export const communityBookmarks = tableFactory("community_bookmarks", {
  id:           idColumn("id").primaryKey(),
  postId:       idColumn("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  userId:       idColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt:    dateColumn("created_at"),
})

export const communityReports = tableFactory("community_reports", {
  id:           idColumn("id").primaryKey(),
  postId:       idColumn("post_id").notNull().references(() => communityPosts.id, { onDelete: "cascade" }),
  userId:       idColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  reason:       longText("reason").notNull(),
  createdAt:    dateColumn("created_at"),
})

export const communityChatMessages = tableFactory("community_chat_messages", {
  id:             idColumn("id").primaryKey(),
  roomId:         idColumn("room_id").notNull().default("general"),
  userId:         idColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  message:        longText("message").notNull(),
  attachmentUrl:  urlText("attachment_url"),
  attachmentType: varchar("attachment_type", { length: 80 }),
  replyToId:      idColumn("reply_to_id"),
  editedAt:       datetime("edited_at", { mode: "string" }),
  deleted:        boolean("deleted").notNull().default(false),
  createdAt:      dateColumn("created_at"),
})

export const communityAnnouncements = tableFactory("community_announcements", {
  id:        idColumn("id").primaryKey(),
  body:      longText("body").notNull(),
  createdAt: dateColumn("created_at"),
  updatedAt: dateColumn("updated_at"),
})

export const communityNotifications = tableFactory("community_notifications", {
  id:        idColumn("id").primaryKey(),
  userId:    idColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title:     shortText("title").notNull().default(""),
  body:      longText("body").notNull(),
  link:      urlText("link"),
  seen:      boolean("seen").notNull().default(false),
  createdAt: dateColumn("created_at"),
})

export const progress = tableFactory("progress", {
  id:       idColumn("id").primaryKey(),
  userId:   idColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  lessonId: idColumn("lesson_id").notNull().references(() => lessons.id, { onDelete: "cascade" }),
})

export const referralSettings = tableFactory("referral_settings", {
  id:              idColumn("id").primaryKey().default("global"),
  rewardPercent:   double("reward_percent").notNull().default(10),
  maxReferrals:    int("max_referrals").notNull().default(0),
  autoCredit:      boolean("auto_credit").notNull().default(false),
  updatedAt:       dateColumn("updated_at"),
})

export const referralCodes = tableFactory("referral_codes", {
  id:        idColumn("id").primaryKey(),
  userId:    idColumn("user_id").notNull().unique().references(() => users.id, { onDelete: "cascade" }),
  code:      varchar("code", { length: 80 }).notNull().unique(),
  createdAt: dateColumn("created_at"),
})

export const referralEarnings = tableFactory("referral_earnings", {
  id:         idColumn("id").primaryKey(),
  referrerId: idColumn("referrer_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  referredId: idColumn("referred_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId:   idColumn("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  amount:     double("amount").notNull().default(0),
  status:     varchar("status", { length: 30 }).notNull().default("pending"),
  createdAt:  dateColumn("created_at"),
})

export const siteSettings = tableFactory("site_settings", {
  key:       varchar("key", { length: 191 }).primaryKey(),
  value:     longText("value").notNull(),
  updatedAt: dateColumn("updated_at"),
})

export const withdrawalRequests = tableFactory("withdrawal_requests", {
  id:        idColumn("id").primaryKey(),
  userId:    idColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  amount:    double("amount").notNull(),
  upiId:     shortText("upi_id").notNull(),
  status:    varchar("status", { length: 30 }).notNull().default("pending"),
  note:      longText("note"),
  createdAt: dateColumn("created_at"),
  updatedAt: dateColumn("updated_at"),
})

export const certificates = tableFactory("certificates", {
  id:                idColumn("id").primaryKey(),
  userId:            idColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  courseId:          idColumn("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  certificateName:   shortText("certificate_name").notNull(),
  certificateNumber: shortText("certificate_number").notNull().unique(),
  issuedAt:          dateColumn("issued_at"),
  pdfPath:           urlText("pdf_path").notNull().default(""),
})

export const coupons = tableFactory("coupons", {
  id:           idColumn("id").primaryKey(),
  code:         varchar("code", { length: 80 }).notNull().unique(),
  courseId:     idColumn("course_id").references(() => courses.id, { onDelete: "cascade" }),
  discountType: varchar("discount_type", { length: 10 }).notNull().default("percent"), // "percent" | "amount"
  discountValue: double("discount_value").notNull().default(0),
  maxUsage:     int("max_usage").notNull().default(0), // 0 = unlimited
  usageCount:   int("usage_count").notNull().default(0),
  expiresAt:    datetime("expires_at", { mode: "string" }),
  active:       boolean("active").notNull().default(true),
  createdAt:    dateColumn("created_at"),
})

export const referralPaymentReceipts = tableFactory("referral_payment_receipts", {
  id:            idColumn("id").primaryKey(),
  withdrawalId:  idColumn("withdrawal_id").notNull().references(() => withdrawalRequests.id, { onDelete: "cascade" }),
  userId:        idColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  adminId:       idColumn("admin_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  filePath:      urlText("file_path").notNull(),
  receiptNo:     shortText("receipt_no").notNull(),
  transactionId: shortText("transaction_id"),
  amount:        double("amount").notNull(),
  createdAt:     dateColumn("created_at"),
})

// Tracks active login sessions per user for device-limit enforcement.
// tokenHash is sha256(raw JWT) — we never store the raw token.
export const userSessions = tableFactory("user_sessions", {
  id:          idColumn("id").primaryKey(),
  userId:      idColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tokenHash:   varchar("token_hash", { length: 64 }).notNull().unique(),
  deviceLabel: shortText("device_label").notNull().default("Unknown device"),
  ipAddress:   varchar("ip_address", { length: 100 }).notNull().default(""),
  createdAt:   dateColumn("created_at"),
})

/**
 * Revenue shares — named stakeholders each with a percentage cut.
 * Used by admin to define how incoming revenue is split.
 */
export const revenueShares = tableFactory("revenue_shares", {
  id:          idColumn("id").primaryKey(),
  name:        shortText("name").notNull(),
  designation: shortText("designation").notNull().default(""),
  percentage:  double("percentage").notNull().default(0),
  createdAt:   dateColumn("created_at"),
  updatedAt:   dateColumn("updated_at"),
})

/**
 * Payout records — admin logs each payment made to an instructor or shareholder.
 * recipientType: "instructor" | "share"
 * recipientId:   userId for instructors, revenueShare.id for shares
 * paymentMethod: "razorpay" | "upi" | "bank" | "cash" | "other"
 */
export const payouts = tableFactory("payouts", {
  id:            idColumn("id").primaryKey(),
  recipientType: varchar("recipient_type", { length: 20 }).notNull(),
  recipientId:   idColumn("recipient_id").notNull(),
  recipientName: shortText("recipient_name").notNull(),
  amount:        double("amount").notNull(),
  paymentMethod: varchar("payment_method", { length: 20 }).notNull().default("upi"),
  paymentRef:    shortText("payment_ref").notNull().default(""),
  note:          longText("note").notNull(),
  paidBy:        idColumn("paid_by").notNull().references(() => users.id, { onDelete: "cascade" }),
  paidAt:        dateColumn("paid_at"),
})

// ─── Internship / Careers ─────────────────────────────────────────────────────

/**
 * Internship listings created by admin.
 * Students can browse and apply. Applications can require a registration fee
 * paid via Razorpay (fee = 0 means free application).
 */
export const internships = tableFactory("internships", {
  id:               idColumn("id").primaryKey(),
  title:            shortText("title").notNull(),
  domain:           shortText("domain").notNull().default(""),      // e.g. "Web Dev", "AI"
  description:      longText("description").notNull(),
  shortDescription: shortText("short_description").notNull().default(""),
  duration:         shortText("duration").notNull().default(""),    // e.g. "3 months"
  stipend:          shortText("stipend").notNull().default("Unpaid"),
  applicationFee:   double("application_fee").notNull().default(0), // 0 = free application
  joiningFee:       double("joining_fee").notNull().default(0),     // 0 = free joining (fee collected upon selection)
  seats:            int("seats").notNull().default(0),              // 0 = unlimited
  requirements:     longText("requirements").notNull(),
  perks:            longText("perks").notNull(),        // JSON array of strings
  status:           varchar("status", { length: 20 }).notNull().default("open"), // open | closed | draft
  lastDateToApply:  datetime("last_date_to_apply", { mode: "string" }),
  startDate:        datetime("start_date", { mode: "string" }),
  thumbnail:        urlText("thumbnail").notNull().default(""),
  createdAt:        dateColumn("created_at"),
  updatedAt:        dateColumn("updated_at"),
})

/**
 * A student's application for an internship.
 * status: pending → offered → accepted | rejected
 *         If applicationFee > 0, application fee paymentId is stored.
 *         If joiningFee > 0, joining fee paymentId is stored when candidate accepts offer.
 */
export const internshipApplications = tableFactory("internship_applications", {
  id:                  idColumn("id").primaryKey(),
  internshipId:        idColumn("internship_id").notNull().references(() => internships.id, { onDelete: "cascade" }),
  userId:              idColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  // Application Fee Payment
  amount:              double("amount").notNull().default(0),
  paymentId:           shortText("payment_id").notNull().default(""),
  paidAt:              datetime("paid_at", { mode: "string" }),
  // Joining Fee Payment (collected if internship has a joiningFee set by admin)
  joiningFeeAmount:    double("joining_fee_amount").notNull().default(0),
  joiningFeePaymentId: shortText("joining_fee_payment_id").notNull().default(""),
  joiningFeePaidAt:    datetime("joining_fee_paid_at", { mode: "string" }),
  // Application content
  resumeUrl:           urlText("resume_url").notNull().default(""),       // path to uploaded PDF
  coverLetter:         longText("cover_letter").notNull(),
  // Status: "pending" | "offered" | "accepted" | "rejected"
  status:              varchar("status", { length: 20 }).notNull().default("pending"),
  offerLetterUrl:      urlText("offer_letter_url").notNull().default(""),
  offerSentAt:         datetime("offer_sent_at", { mode: "string" }),
  adminNote:           longText("admin_note").notNull(),
  appliedAt:           dateColumn("applied_at"),
  updatedAt:           dateColumn("updated_at"),
})

/**
 * Tasks assigned by admin to an accepted intern.
 * Each task has a title, description, deadline, and completion status.
 */
export const internshipTasks = tableFactory("internship_tasks", {
  id:             idColumn("id").primaryKey(),
  applicationId:  idColumn("application_id").notNull().references(() => internshipApplications.id, { onDelete: "cascade" }),
  internshipId:   idColumn("internship_id").notNull().references(() => internships.id, { onDelete: "cascade" }),
  userId:         idColumn("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  title:          shortText("title").notNull(),
  description:    longText("description").notNull(),
  deadline:       datetime("deadline", { mode: "string" }),
  status:         varchar("status", { length: 20 }).notNull().default("pending"), // pending | submitted | approved | rejected
  submissionNote: longText("submission_note").notNull(),
  submissionUrl:  urlText("submission_url").notNull().default(""),
  adminFeedback:  longText("admin_feedback").notNull(),
  createdAt:      dateColumn("created_at"),
  updatedAt:      dateColumn("updated_at"),
})

/**
 * Immutable allocation records — one row per stakeholder per purchase.
 * Snapshot of name, percentage, and amount at the moment of purchase.
 * Changing share %, instructor commission, or referral rate later
 * does NOT affect historical rows.
 *
 * type: "instructor" | "share" | "referral"
 * referenceId: userId (instructor/referrer) or revenueShare.id
 */
export const purchaseAllocations = tableFactory("purchase_allocations", {
  id:            idColumn("id").primaryKey(),
  purchaseId:    idColumn("purchase_id").notNull().references(() => purchases.id, { onDelete: "cascade" }),
  type:          varchar("type", { length: 20 }).notNull(),
  referenceId:   idColumn("reference_id").notNull(),
  referenceName: shortText("reference_name").notNull(),
  percentage:    double("percentage").notNull().default(0),
  amount:        double("amount").notNull().default(0),
  createdAt:     dateColumn("created_at"),
})
