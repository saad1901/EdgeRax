import { NextRequest, NextResponse } from "next/server"
import { jwtVerify } from "jose"

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "edgerax-dev-secret-change-in-production"
)
const COOKIE_NAME = "edgerax_token"

// Routes that require a logged-in user
const USER_ROUTES = ["/my-courses", "/profile", "/community"]
// Routes that require admin role
const ADMIN_ROUTES = ["/admin"]
const INSTRUCTOR_ROUTES = ["/instructor"]

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  const requiresUser  = USER_ROUTES.some((p) => pathname.startsWith(p))
  const requiresAdmin = ADMIN_ROUTES.some((p) => pathname.startsWith(p))
  const requiresInstructor = INSTRUCTOR_ROUTES.some((p) => pathname.startsWith(p))

  if (!requiresUser && !requiresAdmin && !requiresInstructor) return NextResponse.next()

  const token = req.cookies.get(COOKIE_NAME)?.value

  if (!token) {
    return NextResponse.redirect(
      new URL(`/auth?redirect=${encodeURIComponent(pathname)}`, req.url)
    )
  }

  try {
    const { payload } = await jwtVerify(token, SECRET)

    if (requiresAdmin && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url))
    }

    if (requiresInstructor && payload.role !== "instructor" && payload.role !== "admin") {
      return NextResponse.redirect(new URL("/", req.url))
    }

    return NextResponse.next()
  } catch {
    // Token invalid / expired
    const res = NextResponse.redirect(
      new URL(`/auth?redirect=${encodeURIComponent(pathname)}`, req.url)
    )
    res.cookies.delete(COOKIE_NAME)
    return res
  }
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/instructor/:path*",
    "/my-courses",
    "/profile",
    "/community/:path*",
  ],
}
