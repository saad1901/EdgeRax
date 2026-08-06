<div align="center">

  # EdgeRax - Mega Course Platform

  **A production-ready LMS and course marketplace for modern online learning.**

  Built with Next.js, React, TiDB, Razorpay, AWS S3, and Amazon CloudFront.

  <p>
    <img src="https://img.shields.io/badge/Next.js-15-000000?logo=next.js&logoColor=white" alt="Next.js 15" />
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=20232A" alt="React 19" />
    <img src="https://img.shields.io/badge/AWS-S3%20%2B%20CloudFront-FF9900?logo=amazonaws&logoColor=white" alt="AWS S3 and CloudFront" />
    <img src="https://img.shields.io/badge/TypeScript-Ready-3178C6?logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/License-Internal-lightgrey" alt="Internal license" />
  </p>
</div>

---

## Overview

Mega Course Platform is a full-featured learning management system and course marketplace designed for students, instructors, and administrators.

The platform supports course discovery, secure payments, progress tracking, certificates, referrals, instructor earnings, community features, and large-scale media delivery through **AWS S3 and Amazon CloudFront**.

## Highlights

### Student experience

- Browse courses with detailed curriculum, instructor profiles, reviews, and duration.
- Purchase courses through Razorpay with coupon support and free lesson previews.
- Learn through a progress-tracking player with videos, PDFs, and external resources.
- Manage owned courses, receipts, invoices, and completion certificates.
- Participate in an approved student community with posts, chat, and announcements.
- Reset passwords through secure email-token flows.
- Install the platform as a Progressive Web App with offline support.

### Instructor workspace

- Create and manage courses, chapters, lessons, and learning materials.
- Upload videos, PDFs, thumbnails, and images using AWS-backed signed uploads.
- View revenue and per-course sales breakdowns.
- Track earnings using the configured instructor commission percentage.

### Administration

- Manage users, courses, instructors, transactions, coupons, payouts, referrals, certificates, and settings.
- Configure percent or fixed-value coupons with course targeting, expiry, and usage limits.
- Operate referral rewards and withdrawal approval workflows.
- Send templated and bulk marketing emails through SMTP.
- Manage Android and iOS application releases.
- Control media uploads through AWS S3 presigned URLs.

## Technology Stack

| Layer | Technology | Purpose |
| --- | --- | --- |
| Application | **Next.js 15 App Router** | Server-rendered application and route handlers |
| UI | **React 19**, Tailwind CSS v4, Base UI, shadcn/ui, lucide-react | Responsive and accessible interface |
| Database | **TiDB** / MySQL-compatible database | Persistent application data |
| ORM | **Drizzle ORM 0.45** | Type-safe database access and migrations |
| Authentication | **JOSE** and bcryptjs | JWT cookie sessions and password hashing |
| Payments | **Razorpay** | Orders, payment verification, and webhooks |
| Object storage | **Amazon S3** | Videos, PDFs, thumbnails, and images |
| Content delivery | **Amazon CloudFront** | Global, low-latency media delivery |
| Email | **Nodemailer** and SMTP | Password reset and marketing communication |
| Certificates | **PDFKit** | On-demand completion certificates |
| PWA | **Workbox** via next-pwa | Installability and offline asset caching |
| Charts | **Recharts** | Revenue and referral analytics |
| Tooling | **pnpm** and Node.js 20+ | Dependency management and runtime |

## AWS Infrastructure

AWS is a core part of the platform's media architecture.

- **Amazon S3** stores course videos, PDFs, thumbnails, and other large assets.
- **Amazon CloudFront** distributes media globally for low-latency playback.
- **Presigned URLs** allow uploads to go directly from the client to S3 instead of passing large files through the Next.js server.
- **Byte-range video support** enables efficient streaming and seeking.
- **Origin Access Control** keeps the S3 bucket private while allowing CloudFront to serve approved content.

### Media flow

```text
Instructor/Admin
      │
      │  Presigned upload URL
      ▼
Amazon S3  ───────────────►  Amazon CloudFront  ───────────────►  Student
(private bucket)             (global CDN)                         (playback)
```

> Legacy files such as `lib/wasabi-video.ts` retain their historical names, but the implementation uses AWS S3 and Amazon CloudFront.

## Project Structure

```text
app/
├── (public)/          Catalog, authentication, community, learning, and profile pages
├── instructor/        Instructor dashboard and course management
├── admin/             Administrative dashboard and management pages
└── api/               Authentication, courses, payments, uploads, video, and platform APIs

lib/
├── db/                Database schema, connection pool, and migrations
├── auth.ts            JWT authentication and password hashing
├── api.ts             Typed client-side API helpers
├── video.ts           AWS S3 video and CloudFront URL helpers
├── wasabi-video.ts    AWS S3 operations with a legacy filename
├── certificate.ts     Certificate PDF generation
├── receipt.ts         Receipt PDF generation
├── email.ts           Email transports and templates
├── session.tsx        Client session provider
├── course-access.ts   Purchase and preview access rules
└── types.ts           Shared TypeScript types

components/            Reusable application and UI components
scripts/               Development and maintenance utilities
server.js              Custom Node.js production entrypoint
instrumentation.ts     Startup database initialization hook
middleware.ts          RSC cache-control handling
```

## Getting Started

### Prerequisites

- Node.js **20 or newer**.
- pnpm, installable with `npm install --global pnpm`.
- TiDB or MySQL 8-compatible database.
- AWS account with an S3 bucket and CloudFront distribution.
- Razorpay account and API credentials.
- SMTP-capable email provider.

### Installation

```bash
pnpm install
```

### Environment variables

Create `.env.local` from `.env.example` and configure the following values:

```dotenv
# Application
NODE_ENV=development
PORT=3000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database
DATABASE_URL="mysql2://user:password@host:4000/database?sslaccept=strict"

# Authentication
JWT_SECRET=replace-with-a-long-random-secret
COOKIE_SECRET=replace-with-a-long-random-secret

# AWS S3 + CloudFront
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_REGION=ap-south-1
S3_BUCKET_NAME=your-course-assets
CLOUDFRONT_DOMAIN=https://dxxxxxxxxxxxx.cloudfront.net

# Razorpay
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=your-razorpay-secret
RAZORPAY_WEBHOOK_SECRET=your-webhook-secret

# SMTP
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
MAIL_FROM="Mega Course <no-reply@example.com>"
SUPPORT_EMAIL=support@example.com
```

### Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Database initialization runs during application startup through `instrumentation.ts`.

### Build for production

```bash
pnpm build
pnpm start
```

The production server uses `server.js` and binds to `0.0.0.0:$PORT`.

## Roles and Access Control

| Role | Capabilities |
| --- | --- |
| `user` | Browse, purchase, learn, refer, use the community, and receive certificates |
| `instructor` | All user capabilities plus course management and earnings analytics |
| `admin` | Full platform administration, configuration, payouts, users, and content |

Lesson access is controlled by purchase status and preview availability. Free preview lessons remain accessible without a purchase.

## Core Routes

| Route | Purpose |
| --- | --- |
| `/` | Course catalog and marketing homepage |
| `/courses/[id]` | Public course details and purchase page |
| `/auth` | Login and registration |
| `/my-courses` | Student course library |
| `/learn/[id]` | Protected learning player |
| `/profile` | User profile, referrals, and earnings |
| `/community` | Student community |
| `/instructor/*` | Instructor workspace |
| `/admin/*` | Administration panel |

## Payments and Coupons

The checkout flow creates a Razorpay order, validates coupons, opens the client-side payment interface, verifies the payment signature on the server, and records the purchase. The optional webhook endpoint handles late payment-success events with signature verification.

Coupons can be configured as percentage or fixed-value discounts and scoped to a single course or the entire catalog. Usage limits, expiry dates, and active status are supported.

## Certificates and Receipts

- Certificates are generated with PDFKit when a learner reaches 100% course progress.
- Administrators can also issue certificates manually.
- Public certificate verification is available through `/certificates/[id]`.
- Receipts are generated at purchase time and available from the user's profile.

## Engineering Notes

- RSC flight responses are explicitly excluded from CDN and service-worker caching.
- `middleware.ts` applies `Cache-Control: no-store` to RSC requests.
- `instrumentation.ts` initializes database migrations safely during startup.
- The custom `server.js` entrypoint does not automatically load environment files like `next dev`; load environment variables before starting production.
- Keep S3 private and serve protected assets through CloudFront with Origin Access Control.

## Available Scripts

```bash
pnpm dev                 # Start the development server
pnpm build               # Create a production build
pnpm start               # Run the production server
pnpm lint                # Run ESLint
pnpm vercel-install      # Install dependencies without strict lockfile enforcement
```

## Security Checklist

Before going live:

1. Rotate all development secrets and credentials.
2. Block public access and public listing on the S3 bucket.
3. Use CloudFront Origin Access Control for S3 access.
4. Validate Razorpay webhook signatures.
5. Add rate limiting to authentication and payment endpoints.
6. Consider CloudFront WAF protection for public production traffic.
7. Configure automated database backups.

## License

Internal project. Refer to `package.json` for the licenses of third-party dependencies.