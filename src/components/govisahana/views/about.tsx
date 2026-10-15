'use client'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { SectionHeader } from '@/components/govisahana/common'
import {
  Sprout, GraduationCap, Store, HardHat, ShoppingBasket, ShieldCheck,
  Target, Eye, Heart, Lightbulb, Users, MapPin, BadgeCheck, Database,
  ArrowRight, Leaf, HandHeart, Lock,
} from 'lucide-react'

export default function AboutView() {
  const { setView } = useApp()

  const values = [
    {
      icon: BadgeCheck,
      title: 'Trust & Verification',
      desc: 'Every expert, enterprise and listing is reviewed before going live. We verify credentials, qualifications and business registrations so farmers can rely on what they see.',
    },
    {
      icon: HandHeart,
      title: 'Accessibility',
      desc: 'Built for rural connectivity. Lightweight pages, Sinhala/Tamil/English-friendly content, and clear workflows that work on entry-level smartphones.',
    },
    {
      icon: Users,
      title: 'Community',
      desc: 'A shared space for farmers, officers, workers and buyers — replacing fragmented middlemen with a trusted, transparent network.',
    },
    {
      icon: Lightbulb,
      title: 'Innovation',
      desc: 'Combining agronomy, structured case management and modern web tooling to bring Sri Lankan agriculture into the digital era.',
    },
  ]

  const roles = [
    { icon: Sprout, label: 'Farmer', desc: 'Report crop problems, get expert advice, list harvests and access quality inputs.' },
    { icon: GraduationCap, label: 'Expert', desc: 'Offer verified consultations, build a practice and earn by helping farmers.' },
    { icon: Store, label: 'Enterprise', desc: 'Reach farmers directly with seeds, fertilizer, equipment and services.' },
    { icon: HardHat, label: 'Worker', desc: 'Find agricultural jobs, machinery rental and service requests near you.' },
    { icon: ShoppingBasket, label: 'Buyer', desc: 'Source produce directly from farms and post crop requirements.' },
    { icon: ShieldCheck, label: 'Admin', desc: 'Verify experts, moderate listings and keep the platform trustworthy.' },
  ]

  const stats = [
    { icon: MapPin, value: '25', label: 'Districts covered' },
    { icon: Users, value: '6', label: 'User roles' },
    { icon: BadgeCheck, value: 'Verified', label: 'Professionals only' },
    { icon: Database, value: 'Real', label: 'Database-backed platform' },
  ]

  return (
    <div>
      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border gs-hero-gradient">
        <div className="gs-pattern absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-20">
          <div className="space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <Leaf className="h-3.5 w-3.5" /> About GoviSahana
            </span>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Bridging Rural Farmers with <span className="text-primary">Verified Agricultural Experts</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground leading-relaxed">
              GoviSahana is a digital agriculture platform built to close the knowledge gap that holds back Sri Lankan farming — connecting farmers with experts, enterprises, workers and buyers in one trusted place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setView('register')} className="bg-primary hover:bg-primary/90">
                Join the platform <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setView('contact')}>
                Contact our team
              </Button>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border shadow-xl">
              <img
                src="/agri-landscape.png"
                alt="Sri Lankan agricultural landscape"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 -left-4 hidden rounded-xl border border-border bg-card p-3 shadow-lg sm:block">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                  <Sprout className="h-4 w-4" />
                </span>
                <div>
                  <div className="text-xs text-muted-foreground">Our mission</div>
                  <div className="text-sm font-bold">Modernising Sri Lankan agriculture</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* OUR MISSION */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Target className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">Our Mission</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              A clear purpose behind every feature we build.
            </p>
          </div>
          <div className="space-y-4 text-base leading-relaxed text-muted-foreground lg:col-span-2">
            <p>
              Sri Lanka&apos;s farming community feeds the nation, yet too many farmers still make decisions
              without timely expert advice — relying on inherited practices, shopkeepers or middlemen.
              GoviSahana exists to <span className="font-medium text-foreground">reduce the agricultural knowledge gap</span> by
              making verified expertise available to every farmer, regardless of location.
            </p>
            <p>
              We aim to <span className="font-medium text-foreground">improve access to expert advice</span> through
              structured case management, to <span className="font-medium text-foreground">create new income opportunities</span> for
              agricultural professionals, and to <span className="font-medium text-foreground">connect farmers directly with buyers</span> so
              more of the final price reaches the grower.
            </p>
            <p>
              Ultimately, our mission is to <span className="font-medium text-foreground">modernise Sri Lankan agriculture</span> with a
              transparent, trustworthy and locally relevant digital platform — built with the people who use it.
            </p>
          </div>
        </div>
      </section>

      {/* OUR STORY */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Eye className="h-5 w-5" />
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight">Our Story</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Why GoviSahana came to be.
            </p>
          </div>
          <div className="space-y-4 text-base leading-relaxed text-muted-foreground lg:col-span-2">
            <p>
              Agriculture employs roughly <span className="font-medium text-foreground">25% of Sri Lanka&apos;s workforce</span> and
              underpins rural livelihoods across the island&apos;s 25 districts. Yet farmers continue to face
              persistent challenges: limited access to agricultural officers and researchers, knowledge gaps on
              pests and diseases, dependence on intermediaries, and information asymmetry that erodes their
              bargaining power at the marketplace.
            </p>
            <p>
              A farmer in Anuradhapura may wait weeks for a field officer visit; a paddy farmer in Polonnaruwa may
              lose a harvest because the local agro-shop sold the wrong chemical; a vegetable grower in Nuwara Eliya
              may sell to a middleman at a fraction of the wholesale price. These are not isolated stories — they
              are systemic gaps.
            </p>
            <p>
              GoviSahana was created to <span className="font-medium text-foreground">bridge these gaps</span>. By bringing verified
              experts, enterprises, workers and buyers onto a single transparent platform, we give farmers the
              knowledge, inputs and market access they need — without surrendering value to layers of middlemen.
            </p>
            <p>
              We are an educational, demo-grade platform built with modern web tooling and a real backend, designed
              to demonstrate how technology can serve rural communities responsibly and respectfully.
            </p>
          </div>
        </div>
      </section>

      {/* OUR VALUES */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeader
          center
          eyebrow="What we stand for"
          title="Our Values"
          description="The principles that shape every decision we make on the platform."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {values.map((v) => (
            <Card key={v.title} className="shadow-sm">
              <CardContent className="space-y-3 p-6">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <v.icon className="h-5 w-5" />
                </span>
                <h3 className="text-base font-semibold">{v.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{v.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* WHO WE SERVE */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeader
            center
            eyebrow="Who we serve"
            title="One platform, six trusted roles"
            description="GoviSahana is built around the people who make Sri Lankan agriculture work."
          />
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {roles.map((r) => (
              <Card key={r.label} className="shadow-sm">
                <CardContent className="flex items-start gap-4 p-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <r.icon className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">{r.label}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{r.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* STATS BAND */}
      <section className="bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="flex items-center gap-4 rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-5 backdrop-blur-sm">
                <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary-foreground/10 text-primary-foreground">
                  <s.icon className="h-5 w-5" />
                </span>
                <div>
                  <div className="text-2xl font-bold leading-tight">{s.value}</div>
                  <div className="text-sm text-primary-foreground/70">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 sm:p-12">
          <img
            src="/agri-landscape.png"
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-10"
          />
          <div className="relative space-y-4 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Heart className="h-6 w-6" />
            </span>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Be part of Sri Lanka&apos;s agricultural future
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Whether you grow, advise, supply, work or buy — there&apos;s a place for you on GoviSahana. Create your free account today.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => setView('register')} className="bg-primary hover:bg-primary/90">
                Create a free account
              </Button>
              <Button size="lg" variant="outline" onClick={() => setView('contact')}>
                Talk to us
              </Button>
            </div>
            <p className="flex items-center justify-center gap-1.5 pt-2 text-xs text-muted-foreground">
              <Lock className="h-3.5 w-3.5" /> Free to join. Demo platform for educational purposes.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
