import nextPWA from "@ducanh2912/next-pwa";

const withPWA = nextPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  // External packages that must stay server-side only
  serverExternalPackages: ["pdfkit", "mysql2"],

  images: {
    unoptimized: true,
  },

  // Hide the dev overlay indicator (the floating button bottom-left)
  devIndicators: false,

  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options",    value: "nosniff" },
          { key: "X-Frame-Options",            value: "SAMEORIGIN" },
          { key: "X-XSS-Protection",           value: "1; mode=block" },
          { key: "Referrer-Policy",            value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",         value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: blob: https:",
              "media-src 'self' blob: https://edgerax.b-cdn.net https://*.wasabisys.com",
              "connect-src 'self' https://api.razorpay.com https://lumberjack.razorpay.com https://edgerax.b-cdn.net https://*.wasabisys.com",
              "frame-src 'self' blob: https://api.razorpay.com https://www.youtube.com https://player.vimeo.com https://fast.wistia.com https://www.dailymotion.com https://streamable.com https://www.loom.com",
              "font-src 'self' data:",
            ].join("; "),
          },
        ],
      },
      {
        // PDF viewer route — must NOT send X-Frame-Options so the iframe can load
        // the PDF on the same origin. The global SAMEORIGIN would block it.
        source: "/api/upload/pdf/:path*",
        headers: [
          { key: "X-Frame-Options",      value: "" },
          { key: "Content-Disposition",  value: "inline" },
          // Prevent download via right-click / save — handled in the route itself too
          { key: "Content-Type",         value: "application/pdf" },
        ],
      },
      {
        source: "/storage/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex" }],
      },
    ]
  },
}

export default withPWA(nextConfig)
