'use client'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { ScrollText, Info } from 'lucide-react'

type Section = {
  id: string
  title: string
  body: React.ReactNode
}

export default function TermsView() {
  const { setView } = useApp()

  const sections: Section[] = [
    {
      id: 'acceptance',
      title: '1. Acceptance of terms',
      body: (
        <div className="space-y-3">
          <p>
            These Terms &amp; Conditions (&quot;Terms&quot;) govern your access to and use of the GoviSahana platform
            (&quot;the Service&quot;). By creating an account, browsing listings or using any feature of GoviSahana,
            you agree to be bound by these Terms in full.
          </p>
          <p>
            If you do not agree with any part of these Terms, please do not use the Service. If you are registering
            on behalf of an enterprise or organisation, you confirm that you have the authority to bind that entity.
          </p>
        </div>
      ),
    },
    {
      id: 'accounts',
      title: '2. Account registration & responsibilities',
      body: (
        <div className="space-y-3">
          <p>You agree to:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Provide accurate, current and complete information when registering.</li>
            <li>Keep your password confidential and not share your account credentials.</li>
            <li>Be at least 16 years of age, or register through a parent/guardian where applicable.</li>
            <li>Accept responsibility for all activity that occurs under your account.</li>
            <li>Notify us promptly of any unauthorised use or security breach.</li>
            <li>Maintain truthful profile and listing information, including crop listings, services and job posts.</li>
          </ul>
          <p>
            Misuse of accounts — including impersonation, false credentials or fake listings — may result in
            immediate suspension and removal of content.
          </p>
        </div>
      ),
    },
    {
      id: 'roles',
      title: '3. Role-based access',
      body: (
        <div className="space-y-3">
          <p>
            GoviSahana supports six user roles: Farmer, Expert, Enterprise, Worker, Buyer and Admin. Each role has
            different permissions and capabilities. You may only use features available to your assigned role and
            must not attempt to bypass access controls.
          </p>
          <p>
            Admins have the authority to verify or reject expert and enterprise applications, moderate content and
            take enforcement action. Admin decisions are recorded in the platform audit log.
          </p>
        </div>
      ),
    },
    {
      id: 'verification',
      title: '4. Verification of experts, enterprises & listings',
      body: (
        <div className="space-y-3">
          <p>
            Experts and enterprises may apply for a Verified badge. Verification is a manual, good-faith review of
            submitted qualifications, registrations and references — it is not an endorsement or guarantee of any
            specific outcome.
          </p>
          <p>
            GoviSahana reserves the right to grant, suspend or revoke verified status at any time if information is
            found to be inaccurate or if conduct is inconsistent with these Terms.
          </p>
          <p>
            A verified badge does not certify that an expert&apos;s advice will be correct for your specific situation,
            and you remain responsible for decisions taken on your farm.
          </p>
        </div>
      ),
    },
    {
      id: 'prohibited',
      title: '5. Prohibited conduct',
      body: (
        <div className="space-y-3">
          <p>You agree not to:</p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Post false, misleading, fraudulent or duplicate listings.</li>
            <li>Impersonate another person, professional or organisation.</li>
            <li>Share credentials, transfer accounts or create accounts to circumvent suspensions.</li>
            <li>Use the platform to harass, discriminate against or harm other users.</li>
            <li>Upload malicious code, copyrighted material you do not own, or unlawful content.</li>
            <li>Attempt to access data, accounts or systems you are not authorised to access.</li>
            <li>Scrape, mirror or overload the platform, or use it for unsolicited commercial messaging.</li>
            <li>List prohibited, illegal or quarantine-restricted agricultural inputs or crops.</li>
          </ul>
          <p>
            Violations may result in content removal, account suspension or permanent banning, and where relevant,
            referral to the appropriate authorities.
          </p>
        </div>
      ),
    },
    {
      id: 'marketplace',
      title: '6. Marketplace & transactions',
      body: (
        <div className="space-y-3">
          <p>
            GoviSahana hosts listings for products, crops, services and buyer requirements. Listings are
            informational and are intended to help buyers and sellers find each other.
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li><span className="font-medium text-foreground">No payment processing.</span> GoviSahana does not currently enable real payment processing. Any payment, delivery or warranty arrangement is made directly between the parties.</li>
            <li><span className="font-medium text-foreground">No intermediary.</span> GoviSahana is not a party to any transaction and is not responsible for the conduct, quality, safety or legality of listings.</li>
            <li><span className="font-medium text-foreground">Taxes & duties.</span> Parties are responsible for any applicable taxes, duties and regulatory requirements.</li>
            <li><span className="font-medium text-foreground">Disputes.</span> If a dispute arises, parties should first attempt to resolve it directly. GoviSahana may, at its discretion, assist by removing listings or content that breaches these Terms.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'consultations',
      title: '7. Consultations & advice',
      body: (
        <div className="space-y-3">
          <p>
            Experts may offer consultations and recommendations through the platform. The following important
            conditions apply:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li><span className="font-medium text-foreground">Advice is general in nature.</span> Experts provide guidance based on the information and images you share. Outcomes depend on many field-specific factors.</li>
            <li><span className="font-medium text-foreground">Apply at your own risk.</span> Farmers apply expert advice at their own risk. GoviSahana is not liable for any crop loss, yield reduction or financial impact resulting from following advice.</li>
            <li><span className="font-medium text-foreground">Not a substitute for official advisories.</span> GoviSahana complements but does not replace official Department of Agriculture advisories, subsidy schemes or plant quarantine instructions.</li>
            <li><span className="font-medium text-foreground">Chemicals & inputs.</span> Always read and follow label instructions for any pesticide, fertiliser or agrochemical, and observe Sri Lankan regulations on restricted and banned substances.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'ip',
      title: '8. Intellectual property',
      body: (
        <div className="space-y-3">
          <p>
            The GoviSahana name, logo, design, software and original content are the property of GoviSahana and
            protected by applicable intellectual property laws. You may not copy, modify, distribute or create
            derivative works from the platform without permission.
          </p>
          <p>
            Content you post — such as profile text, listings, case details and uploaded images — remains your
            property. By posting, you grant GoviSahana a non-exclusive, royalty-free licence to display, reproduce
            and use that content on the platform for the purpose of operating the Service.
          </p>
          <p>
            You must not upload content that infringes the intellectual property rights of any third party.
          </p>
        </div>
      ),
    },
    {
      id: 'liability',
      title: '9. Limitation of liability',
      body: (
        <div className="space-y-3">
          <p>
            GoviSahana is provided on an &quot;as is&quot; and &quot;as available&quot; basis. To the maximum extent
            permitted by law, GoviSahana, its operators and contributors are not liable for:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Any indirect, incidental or consequential damages arising from use of the Service.</li>
            <li>Crop losses, financial losses or business interruption arising from advice, listings or transactions.</li>
            <li>The accuracy, completeness or reliability of user-generated content.</li>
            <li>Service interruptions, data loss or unauthorised access, despite reasonable security measures.</li>
          </ul>
          <p>
            You use the platform at your own discretion and accept that no advice or listing should be relied upon
            without independent verification appropriate to your situation.
          </p>
        </div>
      ),
    },
    {
      id: 'disputes',
      title: '10. Dispute resolution',
      body: (
        <div className="space-y-3">
          <p>
            We encourage users to resolve disputes amicably and in good faith. If a dispute cannot be resolved
            directly, parties may seek mediation through appropriate Sri Lankan agricultural or consumer authorities.
          </p>
          <p>
            GoviSahana may, at its discretion, suspend or remove listings or accounts involved in unresolved
            serious disputes or suspected fraud, while not acting as an arbitrator of the underlying transaction.
          </p>
        </div>
      ),
    },
    {
      id: 'termination',
      title: '11. Account suspension & termination',
      body: (
        <div className="space-y-3">
          <p>
            You may close your account at any time. GoviSahana may suspend or terminate accounts that breach these
            Terms, that remain inactive for extended periods, or that pose a risk to the platform or its users.
          </p>
          <p>
            Upon termination, certain content (such as listings and messages) may be deactivated or retained in
            archived form for audit and record-keeping purposes.
          </p>
        </div>
      ),
    },
    {
      id: 'changes',
      title: '12. Changes to these Terms',
      body: (
        <div className="space-y-3">
          <p>
            We may revise these Terms from time to time. Material changes will be communicated on the platform.
            Continued use of GoviSahana after changes take effect constitutes acceptance of the revised Terms.
          </p>
          <p>
            The date shown at the bottom of this page indicates when the Terms were last updated.
          </p>
        </div>
      ),
    },
    {
      id: 'contact',
      title: '13. Contact us',
      body: (
        <div className="space-y-3">
          <p>
            For any questions about these Terms, please contact us:
          </p>
          <ul className="list-disc space-y-1 pl-6">
            <li>Dalugama, Kelaniya, Sri Lanka</li>
            <li>Phone: 074 121 6582</li>
            <li>Email: govisahana.srilanka@gmail.com</li>
          </ul>
          <p>
            You can also reach us via our{' '}
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
            <ScrollText className="h-3.5 w-3.5" /> The rules of the platform
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Terms &amp; Conditions
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            The agreement between GoviSahana and everyone who uses the platform.
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
              <AlertTitle className="text-foreground">Demo terms</AlertTitle>
              <AlertDescription>
                GoviSahana is a demo platform built for educational purposes. These Terms are illustrative and
                are not legal advice. They are not a binding legal contract with any real-world entity.
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
                  <h3 className="font-semibold text-foreground">Have a question about these Terms?</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    We&apos;re happy to clarify anything before you sign up.
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
