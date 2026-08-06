/**
 * Typed fetch wrappers for every API route.
 * All functions are plain async — call them from useEffect / event handlers.
 */

import type { Course } from "./types"

// ─── helpers ─────────────────────────────────────────────────────────────────

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...init })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? `${res.status} ${res.statusText}`)
  return data as T
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  phone?: string | null
  commissionPercent?: number
}

export const authApi = {
  me: () => apiFetch<{ user: AuthUser | null }>("/api/auth/me"),

  login: (email: string, password: string) =>
    apiFetch<{ user: AuthUser }>("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    }),

  signup: (name: string, email: string, password: string, phone: string) =>
    apiFetch<{ user: AuthUser }>("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, phone }),
    }),
  changePassword: (currentPassword: string, newPassword: string) =>
    apiFetch<{ ok: boolean }>('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword }),
    }),
  forgotPassword: (email: string) =>
    apiFetch<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    }),
  resetPassword: (token: string, password: string) =>
    apiFetch<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    }),
  logout: () =>
    apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
}

// ─── Courses ─────────────────────────────────────────────────────────────────

export const coursesApi = {
  list: () => apiFetch<Course[]>("/api/courses"),
  get: (id: string) => apiFetch<Course>(`/api/courses/${id}`),
}

// ─── Purchases ───────────────────────────────────────────────────────────────

export interface Purchase {
  id: string; userId: string; courseId: string; amount: number
  paymentId: string; purchasedAt: string; expiresAt?: string | null
}

export const purchasesApi = {
  list: () => apiFetch<Purchase[]>("/api/purchases"),
  create: (courseId: string, paymentId: string) =>
    apiFetch<Purchase>("/api/purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, paymentId }),
    }),
}

// ─── Progress ────────────────────────────────────────────────────────────────

export const progressApi = {
  get: (courseId: string) =>
    apiFetch<string[]>(`/api/progress?courseId=${encodeURIComponent(courseId)}`),
  mark: (lessonId: string) =>
    apiFetch<{ ok: boolean }>("/api/progress", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lessonId }),
    }),
}
// ─── Community ────────────────────────────────────────────────────────────
export interface CommunityPost {
  id: string
  userId: string
  title: string
  body: string
  attachments: string
  tags: string
  pinned: boolean
  deleted: boolean
  createdAt: string
  updatedAt: string
}

export interface CommunityChatMessage {
  id: string
  roomId: string
  userId: string
  message: string
  attachmentUrl: string | null
  attachmentType: string | null
  replyToId: string | null
  editedAt: string | null
  deleted: boolean
  createdAt: string
}

export interface CommunityAnnouncement {
  id: string
  body: string
  createdAt: string
  updatedAt: string
}

export const communityApi = {
  access: () => apiFetch<{ hasAccess: boolean; membership: { status: string } | null }>("/api/community/access"),
  listPosts: () => apiFetch<CommunityPost[]>("/api/community/posts"),
  createPost: (title: string, body: string, imageUrl?: string) =>
    apiFetch<CommunityPost>('/api/community/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, body, imageUrl }),
    }),
  deletePost: (id: string) => apiFetch<{ ok: boolean }>(`/api/community/posts/${id}`, { method: 'DELETE' }),
  listMessages: () => apiFetch<CommunityChatMessage[]>('/api/community/chat'),
  createMessage: (message: string, roomId = 'general', imageUrl?: string) =>
    apiFetch<CommunityChatMessage>('/api/community/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, roomId, imageUrl }),
    }),
  deleteMessage: (id: string) => apiFetch<{ ok: boolean }>(`/api/community/chat/${id}`, { method: 'DELETE' }),
  listAnnouncements: () => apiFetch<CommunityAnnouncement[]>('/api/community/announcements'),
  createAnnouncement: (body: string) =>
    apiFetch<CommunityAnnouncement>('/api/community/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body }),
    }),
  deleteAnnouncement: (id: string) => apiFetch<{ ok: boolean }>(`/api/community/announcements/${id}`, { method: 'DELETE' }),
}

// ─── Admin Community ──────────────────────────────────────────────────────────

export const adminCommunityApi = {
  listAllPosts: () => apiFetch<CommunityPost[]>("/api/admin/community/posts"),
  listAllMessages: () => apiFetch<CommunityChatMessage[]>("/api/admin/community/chat"),
  listAllAnnouncements: () => apiFetch<CommunityAnnouncement[]>("/api/admin/community/announcements"),
  deletePost: (id: string) => apiFetch<{ ok: boolean }>(`/api/community/posts/${id}`, { method: 'DELETE' }),
  deleteMessage: (id: string) => apiFetch<{ ok: boolean }>(`/api/community/chat/${id}`, { method: 'DELETE' }),
  deleteAnnouncement: (id: string) => apiFetch<{ ok: boolean }>(`/api/community/announcements/${id}`, { method: 'DELETE' }),
}
// ─── Referral ────────────────────────────────────────────────────────────────

export interface ReferralEarning {
  id: string
  referrerId: string
  referredId: string
  referredName: string
  courseId: string
  courseTitle?: string
  amount: number
  status: "pending" | "credited" | "rejected"
  createdAt: string
}

export interface ReferralStats {
  code: string
  rewardPercent: number
  totalReferrals: number
  totalEarned: number
  pendingAmount: number
  earnings: ReferralEarning[]
}

export const referralApi = {
  getMyReferral: () => apiFetch<ReferralStats>("/api/referral"),
}

// ─── Withdrawals ──────────────────────────────────────────────────────────────

export interface WithdrawalRequest {
  id: string
  userId: string
  amount: number
  upiId: string
  status: "pending" | "paid" | "rejected"
  note?: string | null
  createdAt: string
  updatedAt: string
}

export interface AdminWithdrawalRequest extends WithdrawalRequest {
  userName: string
  userEmail: string
  userPhone: string
  receiptId?: string | null
}

export const withdrawalApi = {
  list: () => apiFetch<WithdrawalRequest[]>("/api/withdrawals"),
  request: (amount: number, upiId: string) =>
    apiFetch<WithdrawalRequest>("/api/withdrawals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount, upiId }),
    }),
}

export interface Receipt {
  id: string
  withdrawalId: string
  userId: string
  adminId: string
  filePath: string
  receiptNo: string
  transactionId?: string | null
  amount: number
  createdAt: string
}

export const receiptsApi = {
  list: () => apiFetch<Receipt[]>('/api/receipts'),
  download: (id: string) => `/api/receipts/${id}`,
}

// ─── Site Settings ────────────────────────────────────────────────────────────

export interface SiteSettings {
  phones: string[]
  emails: string[]
  addresses: string[]
}

export const siteSettingsApi = {
  get: () => apiFetch<SiteSettings>("/api/site-settings"),
  update: (data: Partial<SiteSettings>) =>
    apiFetch<SiteSettings>("/api/site-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
}

// ─── App downloads ───────────────────────────────────────────────────────────

export type AppPlatform = "android" | "ios"

export interface AppRelease {
  platform: AppPlatform
  version: string
  fileSize: number
  uploadedAt: string
  downloadUrl: string
}

export interface AdminAppRelease extends AppRelease {
  originalName: string
  fileExists: boolean
}

export const appsApi = {
  list: () => apiFetch<AppRelease[]>("/api/apps"),
}

// ─── Coupons ──────────────────────────────────────────────────────────────────

export interface Coupon {
  id: string
  code: string
  courseId: string | null
  courseTitle?: string | null
  discountType: "percent" | "amount"
  discountValue: number
  maxUsage: number
  usageCount: number
  expiresAt?: string | null
  active: boolean
  createdAt: string
}

export interface CouponValidation {
  valid: boolean
  couponId: string
  code: string
  discountType: "percent" | "amount"
  discountValue: number
  originalPrice: number
  discount: number
  finalPrice: number
}

export const couponsApi = {
  validate: (code: string, courseId: string) =>
    apiFetch<CouponValidation>("/api/coupons/validate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, courseId }),
    }),
}

export const adminCouponsApi = {
  list: () => apiFetch<Coupon[]>("/api/admin/coupons"),
  create: (data: Omit<Coupon, "id" | "usageCount" | "createdAt" | "courseTitle">) =>
    apiFetch<Coupon>("/api/admin/coupons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Coupon>) =>
    apiFetch<Coupon>(`/api/admin/coupons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/coupons/${id}`, { method: "DELETE" }),
}

// ─── Instructor ───────────────────────────────────────────────────────────────

export interface InstructorEarnings {
  commissionPercent: number
  totalSales: number
  totalEarnings: number
  perCourse: {
    courseId: string
    courseTitle: string
    sales: number
    earnings: number
  }[]
}

export const instructorApi = {
  earnings: () => apiFetch<InstructorEarnings>("/api/instructor/earnings"),
}

// ─── Admin ────────────────────────────────────────────────────────────────────

export interface AdminStats {
  totalUsers: number; totalSold: number; totalRevenue: number; totalCourses: number
  revenueByCourse: { id: string; name: string; revenue: number }[]
  recentPurchases: {
    id: string; userId: string; courseId: string; amount: number
    paymentId: string; purchasedAt: string; userName: string; courseTitle: string
  }[]
}

export interface StudentEnrollment {
  purchaseId: string
  courseId: string
  courseTitle: string
  amount: number
  paymentId: string
  purchasedAt: string
}

export interface AdminStudent {
  id: string
  name: string
  email: string
  phone?: string | null
  referralPercent?: number | null
  createdAt: string
  enrollments: StudentEnrollment[]
}

export interface AdminInstructor {
  id: string
  name: string
  email: string
  phone?: string | null
  role: "instructor"
  commissionPercent: number
  upiId?: string
  degree?: string
  organization?: string
  bio?: string
  createdAt?: string
}

export interface InstructorRevenueTransaction {
  purchaseId: string
  purchasedAt: string
  paymentId: string
  studentId: string
  studentName: string
  studentEmail: string
  courseId: string
  courseTitle: string
  instructorId: string | null
  instructorName: string
  amount: number
  commissionPercent: number
  commissionAmount: number
}

export interface InstructorRevenueMonth {
  id: string
  month: string
  monthLabel: string
  courseId: string
  courseTitle: string
  instructorId: string | null
  instructorName: string
  commissionPercent: number
  transactionCount: number
  grossRevenue: number
  commissionAmount: number
}

export interface InstructorRevenueReport {
  transactions: InstructorRevenueTransaction[]
  monthly: InstructorRevenueMonth[]
  totals: {
    transactionCount: number
    grossRevenue: number
    commissionAmount: number
  }
}

export interface CourseStudent {
  purchaseId: string
  userId: string
  name: string
  email: string
  amount: number
  paymentId: string
  purchasedAt: string
}

export interface AdminReferralEarning {
  id: string
  referrerId: string
  referrerName: string
  referrerEmail: string
  referredId: string
  referredName: string
  referredEmail: string
  courseId: string
  courseTitle: string
  amount: number
  status: "pending" | "credited" | "rejected"
  createdAt: string
}

export interface ReferralSettings {
  id: string
  rewardPercent: number
  maxReferrals: number
  autoCredit: boolean
  updatedAt: string
}

export const adminApi = {
  stats: () => apiFetch<AdminStats>("/api/admin/stats"),
  listApps: () => apiFetch<AdminAppRelease[]>("/api/admin/apps"),
  uploadApp: (
    platform: AppPlatform,
    file: File,
    version: string,
    onProgress?: (percent: number) => void,
  ) => new Promise<AdminAppRelease>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const form = new FormData()
    form.append("platform", platform)
    form.append("version", version)
    form.append("file", file)
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) onProgress?.(Math.round(event.loaded / event.total * 100))
    })
    xhr.addEventListener("load", () => {
      let data: any = {}
      try { data = JSON.parse(xhr.responseText) } catch {}
      if (xhr.status >= 200 && xhr.status < 300) resolve(data)
      else reject(new Error(data.error ?? "App upload failed."))
    })
    xhr.addEventListener("error", () => reject(new Error("App upload failed.")))
    xhr.open("POST", "/api/admin/apps")
    xhr.send(form)
  }),
  deleteApp: (platform: AppPlatform) =>
    apiFetch<{ ok: boolean }>(`/api/admin/apps?platform=${platform}`, { method: "DELETE" }),
  instructorRevenue: (filters: { instructorId?: string; courseId?: string; from?: string; to?: string } = {}) => {
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value) })
    const query = params.toString()
    return apiFetch<InstructorRevenueReport>(`/api/admin/instructor-revenue${query ? `?${query}` : ""}`)
  },

  // Students
  listStudents: () => apiFetch<AdminStudent[]>("/api/admin/students"),
  listInstructors: () => apiFetch<AdminInstructor[]>("/api/admin/instructors"),
  createInstructor: (data: { name: string; email: string; password: string; phone?: string; commissionPercent: number; upiId?: string; degree?: string; organization?: string; bio?: string }) =>
    apiFetch<AdminInstructor>("/api/admin/instructors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  listCourseStudents: (courseId: string) =>
    apiFetch<CourseStudent[]>(`/api/admin/courses/${courseId}/students`),
  grantAccess: (userId: string, courseId: string, paymentMode: "free" | "cash" = "cash", amount?: number) =>
    apiFetch<{ ok: boolean }>("/api/admin/giveaway", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, courseId, paymentMode, amount }),
    }),  changeUserPassword: (userId: string, newPassword: string) =>
    apiFetch<{ ok: boolean }>('/api/admin/users/password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, newPassword }),
    }),
  // Courses
  listCourses: () => apiFetch<Course[]>("/api/admin/courses"),
  getCourse: (id: string) => apiFetch<Course>(`/api/admin/courses/${id}`),
  createCourse: (data: Partial<Course>) =>
    apiFetch<Course>("/api/admin/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  updateCourse: (id: string, data: Partial<Course>) =>
    apiFetch<Course>(`/api/admin/courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  setCourseReferralAmount: (id: string, amount: number | null) =>
    apiFetch<Course>(`/api/admin/courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referralAmount: amount }),
    }),
  deleteCourse: (id: string) =>
    apiFetch<{ ok: boolean }>(`/api/admin/courses/${id}`, { method: "DELETE" }),

  // Chapters
  addChapter: (courseId: string, title: string) =>
    apiFetch("/api/admin/chapters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId, title }),
    }),
  updateChapter: (id: string, title: string) =>
    apiFetch(`/api/admin/chapters/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    }),
  deleteChapter: (id: string) =>
    apiFetch(`/api/admin/chapters/${id}`, { method: "DELETE" }),

  // Lessons
  addLesson: (chapterId: string, data: { title: string; duration?: string; preview?: boolean; videoUrl?: string; lessonType?: "VIDEO" | "PDF" | "URL"; pdfPath?: string; pdfTitle?: string; pdfDescription?: string; urlLink?: string }) =>
    apiFetch("/api/admin/lessons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chapterId, ...data }),
    }),
  updateLesson: (id: string, data: Partial<{ title: string; duration: string; preview: boolean; videoUrl: string; lessonType: "VIDEO" | "PDF" | "URL"; pdfPath: string; pdfTitle: string; pdfDescription: string; urlLink: string }>) =>
    apiFetch(`/api/admin/lessons/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),
  deleteLesson: (id: string) =>
    apiFetch(`/api/admin/lessons/${id}`, { method: "DELETE" }),

  // Referrals
  listReferrals: () => apiFetch<AdminReferralEarning[]>("/api/admin/referrals"),
  updateReferralStatus: (id: string, status: "credited" | "rejected" | "pending") =>
    apiFetch<{ ok: boolean }>("/api/admin/referrals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    }),
  getReferralSettings: () => apiFetch<ReferralSettings>("/api/admin/referral-settings"),
  updateReferralSettings: (data: Partial<Omit<ReferralSettings, "id" | "updatedAt">>) =>
    apiFetch<ReferralSettings>("/api/admin/referral-settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }),

  // Withdrawals
  listWithdrawals: () => apiFetch<AdminWithdrawalRequest[]>("/api/admin/withdrawals"),
  updateWithdrawalStatus: (id: string, status: "paid" | "rejected" | "pending", note?: string) =>
    apiFetch<{ ok: boolean }>("/api/admin/withdrawals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status, note }),
    }),

  // Video upload
  uploadVideo: (lessonId: string, file: File, onProgress?: (pct: number) => void) => {
    return new Promise<{ ok: boolean; videoUrl: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const fd = new FormData()
      fd.append("lessonId", lessonId)
      fd.append("file", file)

      if (onProgress) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
        })
      }

      xhr.addEventListener("load", () => {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) resolve(data)
        else reject(new Error(data.error ?? xhr.statusText))
      })
      xhr.addEventListener("error", () => reject(new Error("Upload failed.")))

      xhr.open("POST", "/api/upload/video")
      xhr.send(fd)
    })
  },

  uploadPdf: (lessonId: string, file: File, onProgress?: (pct: number) => void) => {
    return new Promise<{ ok: boolean; pdfPath: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const fd = new FormData()
      fd.append("lessonId", lessonId)
      fd.append("file", file)

      if (onProgress) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
        })
      }

      xhr.addEventListener("load", () => {
        const data = JSON.parse(xhr.responseText)
        if (xhr.status >= 200 && xhr.status < 300) resolve(data)
        else reject(new Error(data.error ?? xhr.statusText))
      })
      xhr.addEventListener("error", () => reject(new Error("Upload failed.")))

      xhr.open("POST", "/api/upload/pdf")
      xhr.send(fd)
    })
  },
}
