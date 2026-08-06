export type Role = "user" | "admin" | "instructor"

export interface User {
  id: string
  name: string
  email: string
  role: Role
  phone?: string | null
  commissionPercent?: number
  createdAt?: string
}

export type LessonType = "VIDEO" | "PDF" | "URL"

export interface Lesson {
  id: string
  chapterId?: string
  title: string
  lessonType?: LessonType
  /**
   * "wasabi:<object-key>" or "local:<lessonId>" -> streamed via /api/video/[lessonId]
   * "https://..."      → external embed URL
   * ""                 → placeholder
   */
  videoUrl: string
  pdfPath?: string
  pdfTitle?: string
  pdfDescription?: string
  urlLink?: string
  duration: string
  preview: boolean
  position?: number
}

export interface Chapter {
  id: string
  courseId?: string
  title: string
  position?: number
  lessons: Lesson[]
}

export interface Course {
  id: string
  title: string
  instructor: string
  instructorId?: string | null
  instructorProfile?: {
    degree: string
    organization: string
    bio: string
  } | null
  category: string
  status?: "upcoming" | "ongoing" | "recorded"
  startDate?: string | null
  description: string
  shortDescription: string
  duration: string
  price: number
  /** Original/MRP price shown as strikethrough. null = no discount shown. */
  originalPrice?: number | null
  thumbnail: string
  rating: number
  students: number
  level: "Beginner" | "Intermediate" | "Advanced"
  /** Per-course referral reward amount. null/undefined = use global setting. */
  referralAmount?: number | null
  /** Validity in days after purchase. null/undefined = lifetime access. */
  validityDays?: number | null
  certificatesEnabled: boolean
  /** Custom student count set by admin for marketing display. */
  marketingStudentCount?: number
  /**
   * Controls which student count is shown on course cards.
   *   "actual"  — real purchase count
   *   "custom"  — marketingStudentCount only
   *   "total"   — actual + marketingStudentCount
   */
  studentCountMode?: "actual" | "custom" | "total"
  /**
   * Short urgency message shown on the course card in a highlighted colour.
   * Empty string / undefined = nothing shown.
   * e.g. "Only 10 seats left!" or "Offer ends tonight!"
   */
  urgencyLabel?: string | null
  chapters: Chapter[]
}

export interface Purchase {
  id: string
  userId: string
  courseId: string
  amount: number
  purchasedAt: string
  paymentId: string
  /** ISO date string when access expires. null = lifetime. */
  expiresAt?: string | null
}
