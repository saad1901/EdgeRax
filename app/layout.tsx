import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import './globals.css'
import { SessionProvider } from '@/lib/session'
import { Toaster } from '@/components/ui/sonner'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Edgerax — Learn Skills That Build Your Future',
  description:
    'Edgerax is a modern online education platform offering high-quality courses in Programming, AI, Data Science, Web Development, Cloud, Cybersecurity, Trading, Finance, Business, and more.',
  applicationName: 'Edgerax',
  keywords: ['online courses', 'e-learning', 'education', 'programming', 'data science', 'web development', 'AI', 'finance', 'edgerax'],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Edgerax',
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.png',          type: 'image/png', sizes: '32x32'   },
      { url: '/icon-192.png',         type: 'image/png', sizes: '192x192' },
      { url: '/icon-512.png',         type: 'image/png', sizes: '512x512' },
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png',  media: '(prefers-color-scheme: dark)'  },
    ],
    apple:   [{ url: '/apple-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8fc' },
    { media: '(prefers-color-scheme: dark)',  color: '#1e1e2e' },
  ],
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} bg-background`}>
      <body className="font-sans antialiased">
        <SessionProvider>
          {children}
          <Toaster richColors position="top-center" />
        </SessionProvider>
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
