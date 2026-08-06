import { NextRequest, NextResponse } from "next/server"
import { eq } from "drizzle-orm"
import { getCurrentUser, hashPassword, uid } from "@/lib/auth"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"

async function requireAdmin() {
  const user = await getCurrentUser()
  return user?.role === "admin" ? user : null
}

export async function GET() {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  const allUsers = await db.select().from(users)
  return NextResponse.json(
    allUsers
      .filter((user: any) => user.role === "instructor")
      .map((user: any) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone ?? null,
        role: user.role,
        commissionPercent: Number(user.commissionPercent ?? 0),
        upiId: user.upiId ?? "",
        degree: user.degree ?? "",
        organization: user.organization ?? "",
        bio: user.bio ?? "",
        createdAt: user.createdAt,
      })),
  )
}

export async function POST(req: NextRequest) {
  if (!await requireAdmin()) return NextResponse.json({ error: "Forbidden." }, { status: 403 })

  try {
    const { name, email, password, phone, commissionPercent, upiId, degree, organization, bio } = await req.json()
    const normalizedEmail = String(email ?? "").trim().toLowerCase()
    const commission = Number(commissionPercent)

    if (!String(name ?? "").trim() || !normalizedEmail || !password) {
      return NextResponse.json({ error: "Name, email, and password are required." }, { status: 400 })
    }
    if (String(password).length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters." }, { status: 400 })
    }
    if (Number.isNaN(commission) || commission < 0 || commission > 100) {
      return NextResponse.json({ error: "Commission percentage must be between 0 and 100." }, { status: 400 })
    }

    const existing = await db.select().from(users).where(eq(users.email, normalizedEmail))
    if (existing.length > 0) {
      return NextResponse.json({ error: "An account with this email already exists." }, { status: 409 })
    }

    const instructor = {
      id: uid("inst"),
      name: String(name).trim(),
      email: normalizedEmail,
      password: await hashPassword(String(password)),
      role: "instructor" as const,
      phone: String(phone ?? "").trim() || null,
      commissionPercent: commission,
      upiId: String(upiId ?? "").trim(),
      degree: String(degree ?? "").trim(),
      organization: String(organization ?? "").trim(),
      bio: String(bio ?? "").trim(),
    }

    await db.insert(users).values(instructor)

    return NextResponse.json({
      id: instructor.id,
      name: instructor.name,
      email: instructor.email,
      phone: instructor.phone,
      role: instructor.role,
      commissionPercent: instructor.commissionPercent,
      upiId: instructor.upiId,
      degree: instructor.degree,
      organization: instructor.organization,
      bio: instructor.bio,
    }, { status: 201 })
  } catch (error) {
    console.error("[POST /api/admin/instructors]", error)
    return NextResponse.json({ error: "Failed to create instructor." }, { status: 500 })
  }
}
