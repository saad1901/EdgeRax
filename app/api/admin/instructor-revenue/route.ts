import { NextRequest, NextResponse } from "next/server"
import type { InferSelectModel } from "drizzle-orm"
import { getCurrentUser } from "@/lib/auth"
import { db } from "@/lib/db"
import { courses, purchases, users, purchaseAllocations } from "@/lib/db/schema"

type Course     = InferSelectModel<typeof courses>
type Purchase   = InferSelectModel<typeof purchases>
type User       = InferSelectModel<typeof users>
type Allocation = InferSelectModel<typeof purchaseAllocations>

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function parseDate(value: string | null, endOfDay = false) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const date = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`)
  return Number.isNaN(date.getTime()) ? null : date
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
}

function monthLabel(key: string) {
  const [year, month] = key.split("-").map(Number)
  return new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" })
    .format(new Date(year, month - 1, 1))
}

function monthsBetween(from: Date, to: Date) {
  const result: string[] = []
  const cursor = new Date(from.getFullYear(), from.getMonth(), 1)
  const last = new Date(to.getFullYear(), to.getMonth(), 1)
  while (cursor <= last) {
    result.push(monthKey(cursor))
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return result
}

export async function GET(req: NextRequest) {
  const admin = await getCurrentUser()
  if (!admin || admin.role !== "admin") {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 })
  }

  const params = req.nextUrl.searchParams
  const instructorId = params.get("instructorId") || null
  const courseId = params.get("courseId") || null
  const fromValue = params.get("from") || null
  const toValue = params.get("to") || null
  const from = parseDate(fromValue)
  const to = parseDate(toValue, true)

  if ((fromValue && !from) || (toValue && !to)) {
    return NextResponse.json({ error: "Dates must use YYYY-MM-DD format." }, { status: 400 })
  }
  if (from && to && from > to) {
    return NextResponse.json({ error: "The start date cannot be after the end date." }, { status: 400 })
  }

  const [allUsers, allCourses, allPurchases, allAllocations] = await Promise.all([
    db.select().from(users),
    db.select().from(courses),
    db.select().from(purchases),
    db.select().from(purchaseAllocations),
  ]) as [User[], Course[], Purchase[], Allocation[]]

  // Build a lookup: purchaseId → locked instructor commission amount
  // (type="instructor" rows in purchase_allocations are the immutable values
  //  recorded at the time of purchase — % changes never affect them)
  const lockedCommission = new Map<string, { amount: number; percent: number }>()
  for (const a of allAllocations) {
    if (a.type === "instructor") {
      lockedCommission.set(a.purchaseId, {
        amount:  Number(a.amount),
        percent: Number(a.percentage),
      })
    }
  }

  const instructors = allUsers.filter((user: User) => user.role === "instructor")
  const students = new Map(allUsers.map((user: User) => [user.id, user]))
  const instructorById = new Map(instructors.map((user: User) => [user.id, user]))
  const instructorsByName = new Map(instructors.map((user: User) => [String(user.name).trim().toLowerCase(), user]))
  const courseInstructor = (course: Course) =>
    (course.instructorId ? instructorById.get(course.instructorId) : undefined)
    ?? instructorsByName.get(String(course.instructor).trim().toLowerCase())

  const filteredCourses = allCourses.filter((course: Course) => {
    const instructor = courseInstructor(course)
    return (!courseId || course.id === courseId)
      && (!instructorId || instructor?.id === instructorId)
  })
  const filteredCourseIds = new Set(filteredCourses.map((course: Course) => course.id))
  const courseById = new Map(filteredCourses.map((course: Course) => [course.id, course]))

  const transactions = allPurchases
    .filter((purchase: Purchase) => {
      if (!filteredCourseIds.has(purchase.courseId)) return false
      const purchasedAt = new Date(String(purchase.purchasedAt))
      return (!from || purchasedAt >= from) && (!to || purchasedAt <= to)
    })
    .map((purchase: Purchase) => {
      const course = courseById.get(purchase.courseId)!
      const instructor = courseInstructor(course)
      const amount = Number(purchase.amount)

      // Use the locked allocation amount if available — this preserves the
      // commission rate that was active at purchase time, so changing the
      // instructor's % later does not retroactively alter historical figures.
      const locked = lockedCommission.get(purchase.id)
      const commissionPercent = locked?.percent ?? Number(instructor?.commissionPercent ?? 0)
      const commissionAmount  = locked?.amount  ?? roundMoney(amount * commissionPercent / 100)

      return {
        purchaseId: purchase.id,
        purchasedAt: String(purchase.purchasedAt),
        paymentId: String(purchase.paymentId),
        studentId: purchase.userId,
        studentName: String(students.get(purchase.userId)?.name ?? "Unknown student"),
        studentEmail: String(students.get(purchase.userId)?.email ?? ""),
        courseId: course.id,
        courseTitle: String(course.title),
        instructorId: instructor?.id ?? null,
        instructorName: String(instructor?.name ?? course.instructor ?? "Unassigned"),
        amount,
        commissionPercent,
        commissionAmount,
      }
    })
    .sort((a, b) => new Date(b.purchasedAt).getTime() - new Date(a.purchasedAt).getTime())

  const monthlyGroups = new Map<string, typeof transactions>()
  for (const transaction of transactions) {
    const key = `${monthKey(new Date(transaction.purchasedAt))}:${transaction.courseId}`
    const rows = monthlyGroups.get(key) ?? []
    rows.push(transaction)
    monthlyGroups.set(key, rows)
  }

  const buildMonthlyRow = (month: string, course: Course) => {
    const rows = monthlyGroups.get(`${month}:${course.id}`) ?? []
    const instructor = courseInstructor(course)
    const grossRevenue    = roundMoney(rows.reduce((sum, row) => sum + row.amount, 0))
    const commissionAmount = roundMoney(rows.reduce((sum, row) => sum + row.commissionAmount, 0))
    // Show the most recent locked rate for display; if no transactions, fall back to current %
    const displayRate = rows.length > 0
      ? rows[rows.length - 1].commissionPercent
      : Number(instructor?.commissionPercent ?? 0)
    return {
      id: `${month}:${course.id}`,
      month,
      monthLabel: monthLabel(month),
      courseId: course.id,
      courseTitle: String(course.title),
      instructorId: instructor?.id ?? null,
      instructorName: String(instructor?.name ?? course.instructor ?? "Unassigned"),
      commissionPercent: displayRate,
      transactionCount: rows.length,
      grossRevenue,
      commissionAmount,
    }
  }

  // A complete range deliberately includes zero-sale course rows for every
  // calendar month it crosses. Without a complete range, only real groups are
  // returned so the all-time report stays concise.
  const monthly = from && to
    ? monthsBetween(from, to).reverse().flatMap((month) => filteredCourses.map((course: Course) => buildMonthlyRow(month, course)))
    : [...monthlyGroups.keys()]
        .map((key) => {
          const separator = key.indexOf(":")
          const month = key.slice(0, separator)
          const course = courseById.get(key.slice(separator + 1))!
          return buildMonthlyRow(month, course)
        })
        .sort((a, b) => b.month.localeCompare(a.month) || a.courseTitle.localeCompare(b.courseTitle))

  return NextResponse.json({
    transactions,
    monthly,
    totals: {
      transactionCount: transactions.length,
      grossRevenue: roundMoney(transactions.reduce((sum, row) => sum + row.amount, 0)),
      commissionAmount: roundMoney(transactions.reduce((sum, row) => sum + row.commissionAmount, 0)),
    },
  })
}
