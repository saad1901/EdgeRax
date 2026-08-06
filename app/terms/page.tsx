import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Terms of Service — Edgerax",
}

export default function TermsPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeft data-icon="inline-start" />Back to Home
        </Button>

        <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>

        <div className="flex flex-col gap-8">

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground leading-relaxed">
              By accessing or using Edgerax ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">2. Use of the Platform</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>You must be at least 18 years old to register and purchase courses.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You may not share your account or purchased course access with others.</li>
              <li>You may not reproduce, distribute, or resell any course content.</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">3. Course Access</h2>
            <p className="text-muted-foreground leading-relaxed">
              Upon purchase, you receive access to the course for the validity period specified at the time of purchase (or lifetime access if no validity is set). We reserve the right to update, modify, or remove course content at any time.
            </p>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
            <h2 className="text-xl font-semibold text-destructive">4. No Refunds</h2>
            <p className="text-muted-foreground leading-relaxed">
              All purchases are final and non-refundable. Please review course content carefully using free preview lessons before purchasing. See our <Link href="/privacy-policy" className="underline hover:text-foreground">Privacy Policy</Link> for full details.
            </p>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20 p-5">
            <h2 className="text-xl font-semibold">5. Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              All courses are for <strong>educational purposes only</strong>. Edgerax is not responsible for any decisions or outcomes resulting from information learned on this Platform. Use all information at your own risk.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">6. Intellectual Property</h2>
            <p className="text-muted-foreground leading-relaxed">
              All content on the Platform — including videos, text, graphics, and code — is the property of Edgerax or its instructors. Unauthorised copying, sharing, or distribution is strictly prohibited.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">7. Limitation of Liability</h2>
            <p className="text-muted-foreground leading-relaxed">
              To the maximum extent permitted by law, Edgerax shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the Platform or reliance on course content.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">8. Governing Law</h2>
            <p className="text-muted-foreground leading-relaxed">
              These Terms are governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in India.
            </p>
          </section>

        </div>
      </div>
    </AppShell>
  )
}
