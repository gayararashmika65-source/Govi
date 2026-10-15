'use client'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ShieldCheck, Info } from 'lucide-react'

type Section = {
  id: string
  title: string
  body: React.ReactNode
}

export default function PrivacyView() {
  const { setView } = useApp()

  const sections: Section[] = [
    {
      id: 'intro',
      title: '1. Introduction',
      body: (
        <div className="space-y-3">
          <p>
            GoviSahana (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates a digital agriculture platform that connects Sri Lankan
            farmers with verified agricultural experts, enterprises, workers and buyers. We take your privacy seriously
            and are committed to protecting the personal information you share with us.
          </p>
          <p>
            This Privacy Policy explains what information we collect, how we use it, who we share it with, and the
            choices you have. By creating an account or using any part of GoviSahana, you consent to the practices
            described here.
          </p>
        </div>
      ),
    },
    {
      id: 'collect',
      title: '2. Information we collect',
      body: (
        <div className="space-y-3">
          <p>We collect information you provide directly and information generated automatically when you use the platform:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li><span className="font-medium text-foreground">Account information</span> — name, email address, hashed password, selected role (Farmer, Expert, Enterprise, Worker, Buyer, Admin) and contact details.</li>
            <li><span className="font-medium text-foreground">Profile data</span> — specialisations, service areas, languages, qualifications, business details and any other fields you complete on your profile.</li>
            <li><span className="font-medium text-foreground">Case &amp; problem details</span> — crop type, symptoms, location, descriptions and notes you submit when reporting an agricultural case.</li>
            <li><span className="font-medium text-foreground">Uploaded images</span> — photographs of affected crops, profile pictures, product images and listing photos you choose to upload.</li>
            <li><span className="font-medium text-foreground">Messages</span> — content of consultations, enquiries and other communications sent between users on the platform.</li>
            <li><span className="font-medium text-foreground">Usage data</span> — device type, browser, pages visited and interactions, collected to keep the platform secure and improve usability.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'use',
      title: '3. How we use your information',
      body: (
        <div className="space-y-3">
          <p>We use your information to:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Create and manage your account and authenticate your sessions.</li>
            <li>Match farmers with suitable experts based on crop, expertise and location.</li>
            <li>Display your public profile, listings and verified badges to other users.</li>
            <li>Facilitate consultations, enquiries and messages between users.</li>
            <li>Verify experts, enterprises and listings, and moderate platform content.</li>
            <li>Send service notifications (e.g. new case assigned, message received, verification updates).</li>
            <li>Maintain security, investigate abuse and comply with applicable Sri Lankan law.</li>
            <li>Improve features, fix issues and understand how the platform is used.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'sharing',
      title: '4. How we share information',
      body: (
        <div className="space-y-3">
          <p>
            We do not sell your personal information. We only share data with other users as needed to operate the
            platform:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>When a farmer opens a case, relevant details are shared with the assigned expert.</li>
            <li>When you start a consultation or enquiry, your contact details are visible to the other party.</li>
            <li>When you list crops, products or services, the listing information is public.</li>
            <li>When a buyer posts a requirement, the requirement details are visible to relevant farmers.</li>
          </ul>
          <p>
            Some profile fields (such as private contact details or internal admin notes) are never shown publicly.
            Access is restricted on a role-based, need-to-know basis.
          </p>
        </div>
      ),
    },
    {
      id: 'security',
      title: '5. Data security',
      body: (
        <div className="space-y-3">
          <p>We use industry-standard safeguards to protect your information:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li><span className="font-medium text-foreground">Hashed passwords</span> — passwords are never stored in plain text. We use a salted scrypt-based hash.</li>
            <li><span className="font-medium text-foreground">Signed sessions</span> — authentication cookies are HMAC-signed and httpOnly, so they cannot be read by JavaScript.</li>
            <li><span className="font-medium text-foreground">Role-based access</span> — data access is enforced server-side using role checks and a row-level authorisation pattern, so users can only read or modify their own data (and the data they are explicitly permitted to access).</li>
            <li><span className="font-medium text-foreground">Restricted uploads</span> — file uploads are validated by type and size, and stored separately from application code.</li>
            <li><span className="font-medium text-foreground">Audit logging</span> — sensitive admin and verification actions are recorded for accountability.</li>
          </ul>
          <p>
            No system is perfectly secure. If you believe your account has been compromised, please contact us immediately.
          </p>
        </div>
      ),
    },
    {
      id: 'cookies',
      title: '6. Cookies & sessions',
      body: (
        <div className="space-y-3">
          <p>
            GoviSahana uses a single essential session cookie to keep you signed in. This cookie is httpOnly, signed,
            and does not contain your password. We do not use third-party advertising or tracking cookies.
          </p>
          <p>
            You can clear the session cookie by logging out. Some site preferences may be stored in your browser&apos;s
            local storage.
          </p>
        </div>
      ),
    },
    {
      id: 'rights',
      title: '7. Your rights',
      body: (
        <div className="space-y-3">
          <p>Depending on your role and applicable law, you may have the right to:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Access the personal information we hold about you.</li>
            <li>Correct inaccurate or incomplete profile data.</li>
            <li>Request deletion of your account and associated content (subject to legitimate retention for records and audit).</li>
            <li>Withdraw consent for optional processing such as marketing notifications.</li>
            <li>Object to or restrict certain uses of your data.</li>
          </ul>
          <p>To exercise these rights, contact us using the details below.</p>
        </div>
      ),
    },
    {
      id: 'third-parties',
      title: '8. Third-party services',
      body: (
        <div className="space-y-3">
          <p>
            GoviSahana may integrate with third-party tools for hosting, file storage, analytics or email delivery.
            These providers process limited data on our behalf and are expected to follow their own privacy standards.
            We do not share your personal information with third parties for their own marketing purposes.
          </p>
          <p>
            Links to external websites (e.g. Department of Agriculture resources) are provided for convenience and are
            not covered by this policy.
          </p>
        </div>
      ),
    },
    {
      id: 'children',
      title: "9. Children's privacy",
      body: (
        <div className="space-y-3">
          <p>
            GoviSahana is intended for use by adults and registered agricultural enterprises. We do not knowingly
            collect personal information from children under 16. If you believe a child has provided us with personal
            data, please contact us and we will delete it.
          </p>
        </div>
      ),
    },
    {
      id: 'retention',
      title: '10. Data retention',
      body: (
        <div className="space-y-3">
          <p>
            We retain your information for as long as your account is active, and for a reasonable period afterwards
            to keep records of consultations, listings and audit logs. Verification records and audit entries may be
            retained longer to comply with accountability obligations. You may request earlier deletion of personal
            data, subject to legitimate record-keeping needs.
          </p>
        </div>
      ),
    },
    {
      id: 'changes',
      title: '11. Changes to this policy',
      body: (
        <div className="space-y-3">
          <p>
            We may update this Privacy Policy from time to time to reflect changes in our practices or for legal
            reasons. Material changes will be highlighted on the platform. The date at the bottom of this page
            indicates when the policy was last revised.
          </p>
        </div>
      ),
    },
    {
      id: 'contact',
      title: '12. Contact us',
      body: (
        <div className="space-y-3">
          <p>
            If you have any questions, requests or concerns about this Privacy Policy or your personal data,
            please contact us:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Department of Agriculture, Peradeniya, Sri Lanka</li>
            <li>Phone: +94 81 238 8000</li>
            <li>Email: hello@govisahana.lk</li>
          </ul>
          <p>
            You can also use our{' '}
            <button onClick={() => setView('contact')} className="font-medium text-primary hover:underline">
              Contact Us
            </button>{' '}
            page.
          </p>
        </div>
      ),
    },
  ]

  return (
    <div>
      {/* HEADER */}
      <section className="relative overflow-hidden border-b border-border gs-hero-gradient">
        <div className="gs-pattern absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Your privacy matters
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            How GoviSahana collects, uses and protects your personal information.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
          {/* Sidebar TOC */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <Card className="shadow-sm">
              <CardContent className="p-4">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contents
                </h2>
                <nav className="mt-3 space-y-1">
                  {sections.map((s) => (
                    <a
                      key={s.id}
                      href={`#${s.id}`}
                      className="block rounded-md px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-primary/5 hover:text-primary"
                    >
                      {s.title}
                    </a>
                  ))}
                </nav>
              </CardContent>
            </Card>
            <div className="mt-4 text-xs text-muted-foreground">
              Last updated: {new Date().toLocaleDateString('en-LK', { year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
          </aside>

          {/* Main content */}
          <div className="space-y-6">
            <Alert className="border-primary/20 bg-primary/5">
              <Info className="text-primary" />
              <AlertTitle className="text-foreground">Demo policy</AlertTitle>
              <AlertDescription>
                GoviSahana is a demo platform built for educational purposes. This Privacy Policy is illustrative
                and is not legal advice. No real-world personal data should be relied upon as protected here.
              </AlertDescription>
            </Alert>

            <div className="prose prose-sm max-w-none space-y-10">
              {sections.map((s) => (
                <section key={s.id} id={s.id} className="scroll-mt-24">
                  <h2 className="text-xl font-bold tracking-tight text-foreground">{s.title}</h2>
                  <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:hover:underline [&_strong]:text-foreground [&_li]:leading-relaxed">
                    {s.body}
                  </div>
                </section>
              ))}
            </div>

            <Card className="shadow-sm">
              <CardContent className="flex flex-col items-start justify-between gap-4 p-6 sm:flex-row sm:items-center">
                <div>
                  <h3 className="font-semibold text-foreground">Have a privacy question?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We&apos;re happy to clarify anything in this policy.
                  </p>
                </div>
                <Button onClick={() => setView('contact')} className="bg-primary hover:bg-primary/90">
                  Contact our team
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
