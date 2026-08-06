import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"

export const metadata = {
  title: "Privacy Policy — Edgerax",
  description: "Privacy policy and terms for the Edgerax online education platform.",
}

export default function PrivacyPolicyPage() {
  return (
    <AppShell>
      <div className="mx-auto max-w-3xl">
        <Button variant="ghost" size="sm" className="mb-4 -ml-2" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeft data-icon="inline-start" />Back to Home
        </Button>

        <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
        <p className="text-sm text-muted-foreground mb-8">Last updated: {new Date().toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>

        <div className="prose prose-sm dark:prose-invert max-w-none flex flex-col gap-8">

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">1. Introduction</h2>
            <p className="text-muted-foreground leading-relaxed">
              Welcome to Edgerax ("we", "our", or "us"). This Privacy Policy explains how we collect, use, and protect your personal information when you use our platform at www.edgerax.com. By accessing or using our services, you agree to the terms of this policy.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">2. Information We Collect</h2>
            <p className="text-muted-foreground leading-relaxed">We collect the following information when you register and use our platform:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Full name, email address, and phone number (required at registration)</li>
              <li>Payment information processed securely through Razorpay (we do not store card details)</li>
              <li>Course progress and learning activity</li>
              <li>Device and browser information for security and analytics</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>To provide access to purchased courses</li>
              <li>To process payments and referral payouts</li>
              <li>To send important account and transaction notifications</li>
              <li>To improve our platform and user experience</li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">4. Payment Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              All payments are processed through <strong>Razorpay</strong>, a PCI-DSS compliant payment gateway. We do not store, process, or have access to your card details. Razorpay's privacy policy governs the processing of your payment information.
            </p>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
            <h2 className="text-xl font-semibold text-destructive">5. No Refund Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong>All course purchases on Edgerax are strictly non-refundable.</strong> Once a course is purchased, access is granted immediately and no refunds will be issued under any circumstances, including but not limited to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-1">
              <li>Change of mind after purchase</li>
              <li>Dissatisfaction with course content</li>
              <li>Technical issues on the user's end</li>
              <li>Accidental or duplicate purchases</li>
            </ul>
            <p className="text-muted-foreground leading-relaxed">
              Please review the course details, curriculum, and free preview lessons carefully before making a purchase.
            </p>
          </section>

          <section className="flex flex-col gap-3 rounded-xl border border-amber-300/40 bg-amber-50/50 dark:bg-amber-950/20 p-5">
            <h2 className="text-xl font-semibold">6. Educational Purpose & Risk Disclaimer</h2>
            <p className="text-muted-foreground leading-relaxed">
              <strong>All courses on Edgerax are strictly for educational and informational purposes only.</strong>
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>
                <strong>Not financial advice:</strong> Nothing on this platform constitutes financial, investment, trading, or legal advice. Course content should not be treated as a recommendation to buy, sell, or hold any financial instrument.
              </li>
              <li>
                <strong>Data accuracy:</strong> While we make reasonable efforts to keep course content accurate and up-to-date, <strong>we do not guarantee the accuracy, completeness, or timeliness of any information provided.</strong> Market data, strategies, and examples may be outdated or incorrect. We are not responsible for any errors or omissions in course content.
              </li>
              <li>
                <strong>At your own risk:</strong> Any action you take based on information from our courses is entirely at your own risk. <strong>Edgerax, its instructors, and its team are not responsible for any financial losses, damages, or consequences</strong> arising from the use of information provided on this platform.
              </li>
              <li>
                <strong>Past performance:</strong> Any results, examples, or case studies mentioned in courses do not guarantee future performance. Trading and investing carry significant risk of financial loss.
              </li>
            </ul>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">7. Referral Program</h2>
            <p className="text-muted-foreground leading-relaxed">
              Referral rewards are credited at our discretion and are subject to verification. We reserve the right to modify or discontinue the referral program at any time. Referral earnings are not transferable and hold no cash value outside the withdrawal process defined on the platform.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">8. Data Security</h2>
            <p className="text-muted-foreground leading-relaxed">
              We use industry-standard security practices including encrypted passwords, HTTP-only authentication cookies, and HTTPS to protect your data. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">9. Your Rights</h2>
            <p className="text-muted-foreground leading-relaxed">
              You may request deletion of your account and personal data by contacting us. We will process such requests within a reasonable time, subject to any legal obligations to retain certain records.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">10. Changes to This Policy</h2>
            <p className="text-muted-foreground leading-relaxed">
              We may update this Privacy Policy from time to time. Continued use of the platform after changes constitutes acceptance of the updated policy. We recommend reviewing this page periodically.
            </p>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="text-xl font-semibold">11. Contact Us</h2>
            <p className="text-muted-foreground leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us through the contact details listed in the website footer.
            </p>
          </section>

        </div>
      </div>
    </AppShell>
  )
}
