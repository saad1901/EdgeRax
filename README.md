<div align="center">

<img src="public/icon-512.png" alt="Edgerax Logo" width="100" height="100" />

# Edgerax

**Learn Skills That Build Your Future**

A full-featured online education platform built with Next.js 15 — supporting course delivery, live internships, a community forum, instructor dashboards, and a complete admin panel.

[![Next.js](https://img.shields.io/badge/Next.js-15-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![MySQL](https://img.shields.io/badge/MySQL-Drizzle_ORM-4479A1?logo=mysql&logoColor=white)](https://orm.drizzle.team/)
[![Razorpay](https://img.shields.io/badge/Payments-Razorpay-02042B?logo=razorpay&logoColor=white)](https://razorpay.com/)
[![PWA](https://img.shields.io/badge/PWA-Enabled-5A0FC8?logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Live](https://img.shields.io/badge/Live-edgerax.com-22c55e?logo=vercel&logoColor=white)](https://edgerax.com/)

</div>

> 🌐 **Live at [edgerax.com](https://edgerax.com/)**

---

## ✨ Features

### For Students
- 🎓 Browse courses by category — Programming, AI, Web Dev, Cloud, Finance, and more
- 📺 Video, PDF, and URL-based lesson players
- 💳 Secure checkout via **Razorpay** with coupon code support
- 📈 Progress tracking across enrolled courses
- 🏆 Auto-generated **PDF certificates** on course completion
- 💬 Community forum with posts, comments, likes, bookmarks, and real-time chat
- 💼 Internship listings — apply, pay fees, get offer letters, submit tasks
- 🔗 Referral system with earnings and withdrawal requests
- 🔐 Device session management and password reset via email

### For Instructors
- 📝 Full course & chapter/lesson CRUD
- 📊 Revenue and commission dashboard
- 💸 Payout request management

### For Admins
- 🗂️ 15+ admin sections — courses, students, instructors, community, revenue
- 🎟️ Coupon management (percentage & flat, per-course or global)
- 📣 Community moderation and announcements
- 📱 Mobile app distribution (Android APK / iOS IPA uploads)
- 📧 Email marketing tools
- ⚙️ Site-wide settings — device limits, referral rates, access control

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Language | TypeScript 5.7 |
| Styling | Tailwind CSS v4 + shadcn/ui + Base UI |
| Database | MySQL / MariaDB via Drizzle ORM |
| Auth | Custom JWT (`jose`) + bcryptjs, httpOnly cookies |
| Payments | Razorpay |
| Object Storage | Wasabi S3-compatible (videos) |
| CDN | Gcore CDN for video delivery |
| Email | Nodemailer (SMTP) |
| PDF | PDFKit (server) + react-pdf (viewer) |
| Charts | Recharts |
| Real-time | WebSockets (`ws`) for community chat |
| PWA | @ducanh2912/next-pwa |
| Analytics | Vercel Analytics |
| Runtime | Custom Node.js HTTP server |
| Package Manager | pnpm |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- MySQL / MariaDB database

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/edgerax.git
cd edgerax

# Install dependencies
pnpm install
```

### Environment Variables

Create a `.env` file in the project root:

```env
# ── Database ─────────────────────────────────────────
DATABASE_URL=mysql://user:password@host:3306/dbname
DB_SSL=false                          # true for TiDB Cloud / PlanetScale
DB_CONNECTION_LIMIT=10                # optional, default 10

# ── Auth ─────────────────────────────────────────────
JWT_SECRET=your-very-long-secret-key  # required in production

# ── Payments (Razorpay) ──────────────────────────────
RAZORPAY_KEY_ID=rzp_live_xxx
RAZORPAY_KEY_SECRET=your_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxx

# ── Video Storage (Wasabi S3) ────────────────────────
WASABI_BUCKET=your-bucket-name
WASABI_ACCESS_KEY_ID=your-access-key
WASABI_SECRET_ACCESS_KEY=your-secret-key
WASABI_REGION=us-east-1               # optional, default us-east-1

# ── CDN (Gcore) ──────────────────────────────────────
GCORE_CDN_URL=https://cdn.yourdomain.com  # optional

# ── Email (SMTP) ─────────────────────────────────────
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@yourdomain.com
SMTP_PASSWORD=your-smtp-password
SMTP_FROM=Edgerax <noreply@yourdomain.com>

# ── App ──────────────────────────────────────────────
APP_URL=https://yourdomain.com
PORT=3000                             # optional, default 3000
```

### Run

```bash
# Development
pnpm dev

# Production build
pnpm build

# Production start (custom Node.js server)
pnpm start
```

> Database migrations run automatically on server start via the instrumentation hook.

---

## 📁 Project Structure

```
├── app/
│   ├── page.tsx              # Homepage / course catalog
│   ├── admin/                # Full admin panel (15+ sections)
│   ├── instructor/           # Instructor dashboard
│   ├── courses/              # Public course pages
│   ├── learn/                # Lesson player
│   ├── community/            # Forum + real-time chat
│   ├── careers/              # Internship listings
│   ├── my-courses/           # Student dashboard
│   ├── my-internships/       # Internship tracking
│   ├── profile/              # Account settings
│   └── api/                  # REST API routes
├── lib/
│   ├── db/
│   │   ├── schema.ts         # Drizzle ORM schema (25+ tables)
│   │   └── index.ts          # DB connection pool
│   ├── auth.ts               # JWT + session management
│   ├── wasabi-video.ts       # S3 video storage
│   ├── certificate.ts        # PDF certificate generation
│   └── mail.ts               # Nodemailer email service
├── components/               # Reusable UI components
├── middleware.ts             # Route-level auth guards
├── server.js                 # Custom Node.js HTTP server
└── next.config.mjs           # Next.js + PWA configuration
```

---

## 🔐 Authentication & Roles

Edgerax uses a custom JWT-based auth system with three roles:

| Role | Access |
|---|---|
| `user` | Course catalog, checkout, learning, community, profile |
| `instructor` | All user access + instructor dashboard + course management |
| `admin` | Full access including the admin panel |

Sessions are managed as httpOnly cookies with multi-device tracking. Middleware enforces role-based route protection at the edge.

---

## 🏗️ Deployment

The app is designed to run on any Node.js-capable host (Hostinger, Railway, Render, VPS, etc.) and is **Vercel-compatible** too.

```bash
# Vercel install hook (used by vercel.json if deploying to Vercel)
pnpm vercel-install

# Standard build + start
pnpm build && pnpm start
```

The PWA is disabled in development and auto-enabled in production.

---

## 📜 License

Private — all rights reserved.

