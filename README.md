# Mega Course Platform

A full-featured, production-grade Learning Management System (LMS) / course marketplace built with **Next.js 15 (App Router)**, **Drizzle ORM**, **TiDB**, **Razorpay**, **AWS S3**, and **Amazon CloudFront CDN**. Designed for course creators, students, instructors, and site admins — with a PWA, referral program, community, certificates, and instructor payouts.

---

## ✨ Features

### For Students
- Browse course catalog with rich details, instructor profile, curriculum, reviews, and duration
- Secure **Razorpay** checkout with coupon support and free lesson previews (`l.preview`)
- Progress-tracking learning view with chapters/lessons, embedded videos, PDFs, and links
- **My Courses** library, receipts/invoices, and **certificates of completion** (PDF download)
- Student community (posts, chat, announcements) for approved members
- Passwordless-style forgot/reset flow via email tokens (Nodemailer)
- PWA installability via Workbox — works offline and installs like a native app

### For Instructors
- Dedicated instructor dashboard with revenue and per-course sales breakdown
- Create & manage their own courses, chapters, lessons, and content
- Upload videos, PDFs, and thumbnails to AWS S3
- Track earnings based on a global `commissionPercent` stored per instructor

### For Admins
- Unified admin shell (`/admin`) with dashboard, courses, students, instructors, transactions, coupons, payouts, referrals, certificates, settings, community, marketing, access, shares
- Create/edit/delete courses, chapters, lessons, set prices, validity, status
- **Coupon engine** — percent or fixed amount, per-course or all courses, max usage, expiry
- **Referral program** with global reward %, unique share links, and reward tracking
- **Withdrawals / Payouts** approval flow with manual marking
- Email templating + bulk marketing sends (Nodemailer + SMTP)
- App releases manager for Android/iOS builds
- Thumbnail, PDF, and video upload endpoints backed by AWS S3 signed URLs

---

## 🏗️ Architecture & Stack

| Layer | Tech | Notes |
|---|---|---|
| Framework | **Next.js 15 (App Router)** | RSC + "use client" boundaries; custom `server.js` entrypoint |
| UI | **React 19**, **Tailwind v4**, **Base UI**, **shadcn/ui** (`shadcn@4.8.0`), **lucide-react** | Clean, responsive, accessible components |
| State | React hooks + `sonner` toasts | Minimal client state; server actions via Route Handlers |
| Database | **TiDB (MySQL-compatible)** via **Drizzle ORM 0.45** | Pool in [lib/db/index.ts](file:///media/saad/Workspace1/projects/mega-course/final14/lib/db/index.ts); auto-migration from [lib/db/migrate.ts](file:///media/saad/Workspace1/projects/mega-course/final14/lib/db/migrate.ts) via `instrumentation.ts` |
| Auth | **JOSE**-signed JWT cookies + **bcryptjs** password hashing | Session in [lib/auth.ts](file:///media/saad/Workspace1/projects/mega-course/final14/lib/auth.ts); roles: `user | instructor | admin` |
| Payments | **Razorpay** (Orders API + Webhook) | See [razorpay/order](file:///media/saad/Workspace1/projects/mega-course/final14/app/api/razorpay/order/route.ts), [verify](file:///media/saad/Workspace1/projects/mega-course/final14/app/api/razorpay/verify/route.ts), [webhook](file:///media/saad/Workspace1/projects/mega-course/final14/app/api/razorpay/webhook/route.ts) |
| Storage & CDN | **AWS S3** (media storage) + **Amazon CloudFront CDN** (content delivery) | SDK: `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner` for presigned uploads. Videos, PDFs, and thumbnails served through CloudFront for low-latency streaming worldwide. |
| Email | **Nodemailer** + SMTP | Configurable via env; password reset + marketing templates |
| Certificates | **PDFKit** on-the-fly PDF generation | Downloadable completion certificates tied to a user/course |
| PWA | `@ducanh2912/next-pwa` (Workbox) | Service worker caches static assets; explicitly excludes RSC flight payloads (`pages-rsc` / `pages-rsc-prefetch`) per project convention |
| Charts | **Recharts** | Admin analytics, revenue, referral charts |
| Package mgmt | **pnpm** + **Node 20+** | Scripts in [package.json](file:///media/saad/Workspace1/projects/mega-course/final14/package.json) |

> **Note on the `wasabi-*` file names:** Despite the legacy file naming (`lib/wasabi-video.ts`, `scripts/test-wasabi-video.js`), **this project uses AWS S3 + Amazon CloudFront** for all object storage and content delivery. Those modules call AWS S3 APIs and are just kept with their original names for code history.

---

## 📁 Project Structure

```
app/
├── (public)         page.tsx, courses/[id], auth/, forgot-password, reset-password, community/
│                    my-courses/, learn/[id], profile/, profile/receipts/, receipts/[id]
│                    privacy-policy/, terms/, manage-sessions/
├── instructor/      page.tsx, courses/, courses/[id]       # Instructor panel
├── admin/           dashboard shell with all admin pages (see Architecture/Admins above)
└── api/             All Route Handlers: /api/auth/*, /api/courses/*, /api/admin/*,
                     /api/razorpay/*, /api/certificates/*, /api/upload/*, /api/video/*,
                     /api/progress, /api/purchases, /api/referral, /api/withdrawals, ...

lib/
├── db/              schema.ts + index.ts (pool) + migrate.ts (auto-run migrations)
├── auth.ts          JWT cookie auth, password hashing, getCurrentUser
├── api.ts           Typed client-side fetch helpers for every endpoint
├── video.ts         AWS S3 video streaming + CloudFront URL helpers
├── wasabi-video.ts  AWS S3 operations (presigned URLs, put/get) — legacy filename
├── certificate.ts   PDFKit certificate generator
├── receipt.ts       Receipt PDF generator
├── email.ts / mail.ts    Email transports + templates
├── session.tsx      React client session provider (useSession hook)
├── course-access.ts Access checks for lessons (purchase + preview gating)
├── format.ts        Price, validity, date helpers
└── types.ts         Shared TS types (Coupon, Course, etc.)

components/          Reusable UI (admin-shell, course-form-dialog, ui/*)
scripts/             One-off helpers (test-wasabi-video.js → actually AWS S3)
server.js            Custom Node HTTP entrypoint that boots Next (binds 0.0.0.0)
next.config.mjs      Next + PWA (Workbox) config
instrumentation.ts   Boot hook → runs auto-migrations on start
middleware.ts        Adds Cache-Control: no-store to RSC flight responses
```

### Important Engineering Conventions (see [project_memory.md](../..))
- **RSC flight responses must not be cached by CDNs or SWs.**
  - `middleware.ts` sets `Cache-Control: no-store` on requests with the `RSC: 1` header or `?_rsc=` query.
  - `next.config.mjs` PWA workbox config explicitly skips `pages-rsc` and `pages-rsc-prefetch` patterns.
- **DB auto-migration:** `instrumentation.ts` → `initDb()` on every boot (safe re-runs).
- **Custom `server.js` does not auto-load `.env`** the way `next dev` does — make sure env is available at start.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js **20+** (with `pnpm` installed: `npm i -g pnpm`)
- A **TiDB** (or MySQL 8+ compatible) database reachable via a connection URL
- **AWS account** with:
  - An **S3 bucket** (for videos, PDFs, thumbnails)
  - An **CloudFront distribution** fronting that bucket for asset delivery
  - AWS credentials with S3 read/write + signed-URL permissions
- **Razorpay** account + API keys
- An SMTP-capable inbox/provider for Nodemailer (or SendGrid/Mailgun SMTP)

### 2. Install

```bash
pnpm install
```

### 3. Environment Variables

Copy `.env.example` (or start from the existing `.env`/`.env.local`) and fill in:

```dotenv
# App
NODE_ENV=development | production
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (TiDB / MySQL-compatible)
DATABASE_URL="mysql2://user:pass@host:4000/db?sslaccept=strict"

# Auth
JWT_SECRET=<32+ random chars>
COOKIE_SECRET=<32+ random chars>

# AWS S3 + CloudFront CDN
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=ap-south-1
S3_BUCKET_NAME=your-course-assets
CLOUDFRONT_DOMAIN=https://dxxxxxxxx.cloudfront.net
# (optional) S3 endpoint override — leave empty to use standard AWS

# Payments — Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...

# Email — Nodemailer / SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
MAIL_FROM="Mega Course <no-reply@example.com>"
SUPPORT_EMAIL=support@example.com
```

### 4. Run dev server

```bash
pnpm dev
```

Open http://localhost:3000 — on first boot Drizzle migrations auto-run via `instrumentation.ts` → [lib/db/migrate.ts](file:///media/saad/Workspace1/projects/mega-course/final14/lib/db/migrate.ts).

### 5. Production build & run

```bash
pnpm build
pnpm start
```

`pnpm start` uses the custom [server.js](file:///media/saad/Workspace1/projects/mega-course/final14/server.js) entrypoint and binds `0.0.0.0:$PORT`.

---

## 🔑 Auth, Roles & Access Control

Three user roles with distinct features:

| Role | Can |
|---|---|
| `user` (student) | Browse, buy, learn, refer, community, certificates |
| `instructor` | Same as user + manage own courses + see `/instructor` earnings panel |
| `admin` | Full access to `/admin` (everything: users, coupons, payouts, config, …) |

Lesson access is enforced by [lib/course-access.ts](file:///media/saad/Workspace1/projects/mega-course/final14/lib/course-access.ts):
- A user owns a course when there is a non-expired `purchase` row.
- A **free preview** lesson (`lesson.preview = true`) is accessible **even without a purchase**, including on the public course page (`Free` badge) and `/learn/...` route.

### Routing overview

| Route | Audience |
|---|---|
| `/` | Catalog + marketing |
| `/courses/[id]` | Public course detail (title, instructor, description, curriculum, free preview lessons, buy box) |
| `/auth` | Login / Signup |
| `/my-courses` | Owned library |
| `/learn/[id]` | Learning player (guarded by access rules) |
| `/profile`, `/profile/receipts` | User settings, referral & earnings, receipts |
| `/community` | Community forum/chat (membership-checked) |
| `/instructor/*` | Instructor workspace |
| `/admin/*` | Admin control panel |

REST-style endpoints live under `app/api/*` Route Handlers; TypeScript fetch wrappers are in [lib/api.ts](file:///media/saad/Workspace1/projects/mega-course/final14/lib/api.ts).

---

## ☁️ AWS S3 + Amazon CloudFront CDN

All large media (course videos, PDFs, thumbnails) is stored in **Amazon S3** and served globally via **Amazon CloudFront CDN** for low-latency playback and reduced egress costs.

### Storage flows
- **Uploads** (courses/instructors/admins): `app/api/upload/video`, `app/api/upload/pdf`, `app/api/upload/thumbnail`, `app/api/upload/image/[filename]`
  - Use AWS presigned URLs (`@aws-sdk/s3-request-presigner`) so media uploads never touch the Next.js server directly.
  - Files are streamed to `s3://<S3_BUCKET_NAME>/videos/`, `/pdfs/`, `/thumbnails/`.
- **Download/Playback**:
  - **Videos** stream via `GET /api/video/[lessonId]` ([video.ts](file:///media/saad/Workspace1/projects/mega-course/final14/lib/video.ts)), which redirects or proxies a CloudFront/S3 URL with byte-range support.
  - **Thumbnails** are served through `/api/thumbnail/[...key]` which rewrites to the CloudFront URL.
  - **PDFs** and other attachments link directly to `https://CLOUDFRONT_DOMAIN/<key>`.

### Recommended S3/CloudFront setup
1. S3 bucket: `Block all public access = ON`; bucket access via CloudFront **Origin Access Control (OAC)** only.
2. CloudFront distribution with:
   - Origin = S3 bucket via OAC
   - Default CachingOptimized policy, plus a custom cache policy that forwards `Range` for video byte-range
   - HTTPS-only (Viewer protocol = Redirect HTTP to HTTPS)
   - Alternate domain names + ACM certificate (e.g. `cdn.yourcourse.app`)
3. IAM user used by the app: inline policy limited to `s3:PutObject`, `s3:GetObject`, `s3:AbortMultipartUpload`, `s3:ListMultipartUploadParts`, `s3:ListBucket`, plus `s3:CreateMultipartUpload` — scoped to your bucket.

> **Caching reminder:** The PWA Service Worker and Next middleware already ensure **RSC flight payloads bypass every cache layer** (browser/CDN/SW). Just remember that **when you put Next behind CloudFront directly**, add a cache behavior for paths matching `*_rsc*` / header `RSC=1` with `Cache-Control: no-store` at the edge.

---

## 💳 Payments & Coupons (Razorpay)

Checkout → `/api/razorpay/order` (creates a Razorpay Order for the purchase amount after coupon validation) → client-side Razorpay popup → `/api/razorpay/verify` validates signature server-side → `purchases` row is written → user gains immediate access via `course-access.ts`.

Webhook listener at `/api/razorpay/webhook` is optional but recommended for late payment success events (with signature verification against `RAZORPAY_WEBHOOK_SECRET`).

### Coupon engine
- Percent (%) or Fixed Amount (₹) discount
- Applies to **one specific course** or **all courses**
- Max usage cap, expiry date, active/inactive toggle
- Management UI: `/admin/coupons`, API: `app/api/admin/coupons/*`
- Validation at checkout: `/api/coupons/validate`

---

## 🤝 Referral Program

- Every user gets a unique referral share link (shown on `/profile` / Refer & Earn card).
- Global **reward %** setting — configurable via Admin → Referrals (stored in settings, fetched `/api/referral`).
- When a referred user completes a purchase, the referrer gets a pending reward equal to `price * reward %`.
- Admins view all referrals, referral rewards, and paid status under `/admin/referrals` and `/admin/payouts`.
- Students see their own referrals, counts, and "You earn ₹X" per course on `/profile`.

---

## 🎓 Certificates & Receipts

- **Certificates** — auto-issued after course is completed (`100% progress`); admin can also issue manually from `/admin/certificates`.
  - Generated on-the-fly with PDFKit → download at `/api/certificates/[id]/download`.
  - Verification endpoint: `/certificates/[id]` — public, verifiable certificate page.
- **Receipts** — generated PDF at purchase time; accessible from `/profile/receipts` and direct `/receipts/[id]`.

---

## ✅ Scripts

```bash
pnpm dev                      # Next dev on 0.0.0.0 (next dev --hostname 0.0.0.0)
pnpm build                    # Production build (next build)
pnpm start                    # Start via custom server.js (binds 0.0.0.0)
pnpm lint                     # ESLint (eslint .)
pnpm vercel-install           # pnpm install without lockfile strictness (CI helper)
```

---

## 🛡️ Security Notes (review checklist for go-live)
1. Rotate every secret in `.env` (JWT, cookies, Razorpay, AWS, SMTP).
2. Disable public listing on the S3 bucket; serve **only** via CloudFront + OAC.
3. Add CloudFront WAF / rate limiting if you expect traffic spikes.
4. Enable Razorpay Webhook and validate signatures in `/api/razorpay/webhook`.
5. Set a strong password policy + rate-limit `/api/auth/*` in your edge/reverse proxy.
6. Backup TiDB with automated snapshots (native to TiDB Cloud).

---

## 📜 License & Credits

Internal project code. Uses open-source packages listed in [package.json](file:///media/saad/Workspace1/projects/mega-course/final14/package.json); see each package for its license.
