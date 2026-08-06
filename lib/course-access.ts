import { eq } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { chapters, courses, lessons } from "@/lib/db/schema"

export async function getCourseManager() {
  const user = await getCurrentUser()
  return user?.role === "admin" || user?.role === "instructor" ? user : null
}

export function canManageCourse(user: { id: string; role: string } | null, course: { instructorId?: string | null } | null | undefined) {
  if (!user || !course) return false
  if (user.role === "admin") return true
  return user.role === "instructor" && course.instructorId === user.id
}

export async function requireManageCourse(courseId: string) {
  const user = await getCourseManager()
  if (!user) return null

  const rows = await db.select().from(courses).where(eq(courses.id, courseId))
  const course = rows[0]
  return canManageCourse(user, course) ? { user, course } : null
}

export async function requireManageChapter(chapterId: string) {
  const user = await getCourseManager()
  if (!user) return null

  const chapterRows = await db.select().from(chapters).where(eq(chapters.id, chapterId))
  const chapter = chapterRows[0]
  if (!chapter) return null

  const courseRows = await db.select().from(courses).where(eq(courses.id, chapter.courseId))
  const course = courseRows[0]
  return canManageCourse(user, course) ? { user, course, chapter } : null
}

export async function requireManageLesson(lessonId: string) {
  const user = await getCourseManager()
  if (!user) return null

  const lessonRows = await db.select().from(lessons).where(eq(lessons.id, lessonId))
  const lesson = lessonRows[0]
  if (!lesson) return null

  const chapterRows = await db.select().from(chapters).where(eq(chapters.id, lesson.chapterId))
  const chapter = chapterRows[0]
  if (!chapter) return null

  const courseRows = await db.select().from(courses).where(eq(courses.id, chapter.courseId))
  const course = courseRows[0]
  return canManageCourse(user, course) ? { user, course, chapter, lesson } : null
}
