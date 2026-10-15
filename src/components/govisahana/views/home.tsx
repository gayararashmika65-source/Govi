'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SectionHeader, money } from '@/components/govisahana/common'
import { VerifiedBadge } from '@/components/govisahana/badges'
import {
  Sprout, Search, Stethoscope, Store, ShoppingBasket, HardHat, GraduationCap,
  ShieldCheck, MessageSquare, Image as ImageIcon, CalendarCheck, Bell,
  ArrowRight, Leaf, Users, TrendingUp, MapPin, BookOpen, Star,
} from 'lucide-react'

type Expert = {
  id: string; title?: string; expertise?: string; bio?: string; rating?: number;
  serviceAreas?: string; verified: boolean; languages?: string;
  user: { id: string; name: string; avatarUrl?: string | null }
}
type Article = { id: string; title: string; summary: string; category?: string; authorName?: string }

export default function HomeView() {
  const { setView, openDetail, user } = useApp()
  const [experts, setExperts] = useState<Expert[]>([])
  const [articles, setArticles] = useState<Article[]>([])

  useEffect(() => {
    fetch('/api/experts?verified=true').then((r) => r.json()).then((d) => setExperts((d.experts || []).slice(0, 3))).catch(() => {})
    fetch('/api/knowledge').then((r) => r.json()).then((d) => setArticles((d.articles || []).slice(0, 3))).catch(() => {})
  }, [])

  const services = [
    { icon: Stethoscope, title: 'Expert Consultations', desc: 'Get verified advice from agricultural officers, researchers and consultants for any crop problem.', view: 'experts' as const },
    { icon: Store, title: 'Agri Marketplace', desc: 'Buy seeds, fertilizer, equipment and irrigation supplies from verified enterprises.', view: 'marketplace' as const },
    { icon: ShoppingBasket, title: 'Crop Trading', desc: 'List your harvest and connect directly with wholesalers, exporters and buyers.', view: 'crops' as const },
    { icon: HardHat, title: 'Workers & Machinery', desc: 'Find skilled farm labour and rent machinery for harvesting and cultivation.', view: 'jobs' as const },
  ]

  const steps = [
    { icon: ImageIcon, title: 'Report your problem', desc: 'Describe symptoms and upload photos of affected crops.' },
    { icon: Search, title: 'Match with an expert', desc: 'We connect you to verified experts by crop, expertise and location.' },
    { icon: MessageSquare, title: 'Get advice & follow up', desc: 'Chat securely, receive structured recommendations and track progress.' },
    { icon: CalendarCheck, title: 'Resolve & improve', desc: 'Apply advice, mark resolved, and keep a complete case history.' },
  ]

  const roles = [
    { icon: Sprout, label: 'Farmer', desc: 'Report problems, get advice, sell crops', view: 'register' as const, color: 'bg-emerald-50 text-emerald-700' },
    { icon: GraduationCap, label: 'Expert', desc: 'Advise farmers, grow your practice', view: 'register' as const, color: 'bg-violet-50 text-violet-700' },
    { icon: Store, label: 'Enterprise', desc: 'Reach farmers with your products', view: 'register' as const, color: 'bg-amber-50 text-amber-700' },
    { icon: HardHat, label: 'Worker', desc: 'Find agricultural jobs & services', view: 'register' as const, color: 'bg-orange-50 text-orange-700' },
    { icon: ShoppingBasket, label: 'Buyer', desc: 'Source crops directly from farms', view: 'register' as const, color: 'bg-cyan-50 text-cyan-700' },
  ]

  return (
    <div>
      {/* HERO */}
      <section className="gs-hero-gradient relative overflow-hidden">
        <div className="gs-pattern absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <Leaf className="h-3.5 w-3.5" /> Built for Sri Lankan Agriculture
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Bridging Rural Farmers with <span className="text-primary">Verified Agricultural Experts</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground leading-relaxed">
              GoviSahana connects farmers with agricultural officers, researchers, enterprises,
              workers and buyers — so knowledge, inputs and markets are always within reach.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setView('experts')} className="bg-primary hover:bg-primary/90">
                <Search className="mr-2 h-4 w-4" /> Find an Expert
              </Button>
              <Button size="lg" variant="outline" onClick={() => setView(user ? 'dashboard' : 'register')}>
                <Stethoscope className="mr-2 h-4 w-4" /> {user ? 'Go to Dashboard' : 'Report a Crop Problem'}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> 6 user roles</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Verified professionals</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> 25 districts</span>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border shadow-xl">
              <img src="/hero-paddy.png" alt="Sri Lankan paddy farmer" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-4 -left-4 hidden rounded-xl border border-border bg-card p-3 shadow-lg sm:block">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><TrendingUp className="h-4 w-4" /></span>
                <div>
                  <div className="text-xs text-muted-foreground">Cases resolved</div>
                  <div className="text-sm font-bold">Track every consultation</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-3 sm:px-6 md:grid-cols-5">
          {[
            { label: 'Find Expert', icon: Search, view: 'experts' as const },
            { label: 'Report Problem', icon: Stethoscope, view: 'register' as const },
            { label: 'Marketplace', icon: Store, view: 'marketplace' as const },
            { label: 'Find Buyers', icon: ShoppingBasket, view: 'crops' as const },
            { label: 'Jobs & Services', icon: HardHat, view: 'jobs' as const },
          ].map((a) => (
            <button key={a.label} onClick={() => setView(a.view)} className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
              <a.icon className="h-4 w-4" /> <span className="hidden sm:inline">{a.label}</span><span className="sm:hidden">{a.label.split(' ')[0]}</span>
            </button>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeader
          center
          eyebrow="What we offer"
          title="Everything Sri Lankan agriculture needs, in one platform"
          description="From expert advice to buying and selling — GoviSahana brings the whole ecosystem together."
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <Card key={s.title} className="group cursor-pointer transition-shadow hover:shadow-md" onClick={() => setView(s.view)}>
              <CardHeader>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <s.icon className="h-5 w-5" />
                </span>
                <CardTitle className="mt-3 text-lg">{s.title}</CardTitle>
                <CardDescription className="leading-relaxed">{s.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                  Explore <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeader
            center
            eyebrow="How it works"
            title="From problem to resolution in four steps"
            description="A clear, tracked workflow ensures farmers get real advice — not guesswork."
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.title} className="relative rounded-xl border border-border bg-card p-5">
                <span className="absolute -top-3 left-5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><s.icon className="h-5 w-5" /></span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-8 flex justify-center">
            <Button onClick={() => setView('experts')} variant="outline">
              See how experts are verified <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </section>

      {/* FEATURED EXPERTS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <SectionHeader eyebrow="Trusted professionals" title="Featured verified experts" description="Agricultural officers, researchers and consultants ready to help." />
          <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => setView('experts')}>
            View all <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {experts.length === 0 ? (
            [0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-xl border border-border bg-muted/40" />)
          ) : experts.map((e) => (
            <Card key={e.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => openDetail('expert-detail', e.id)}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={e.user.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">{e.user.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">{e.user.name}</h3>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{e.title || 'Agricultural Expert'}</p>
                    <div className="mt-1.5"><VerifiedBadge verified={e.verified} /></div>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{e.bio || e.expertise || 'Verified agricultural professional.'}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(e.expertise || '').split(',').filter(Boolean).slice(0, 3).map((t) => (
                    <span key={t} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{t.trim()}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {(e.serviceAreas || 'Sri Lanka').split(',')[0]}</span>
                  {e.rating ? <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {e.rating}</span> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* JOIN AS */}
      <section className="border-y border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeader center title="Join GoviSahana as" className="[&_h2]:text-primary-foreground [&_p]:text-primary-foreground/80" />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {roles.map((r) => (
              <button key={r.label} onClick={() => setView(r.view)} className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-5 text-left backdrop-blur-sm transition-colors hover:bg-primary-foreground/10">
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${r.color}`}><r.icon className="h-5 w-5" /></span>
                <h3 className="mt-3 font-semibold text-primary-foreground">{r.label}</h3>
                <p className="mt-1 text-sm text-primary-foreground/70">{r.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* KNOWLEDGE HUB PREVIEW */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <SectionHeader eyebrow="Knowledge Hub" title="Learn from agricultural resources" description="Practical articles from experts on pests, diseases, soil and cultivation." />
          <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => setView('knowledge')}>
            Browse all <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {articles.length === 0 ? [0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-xl border border-border bg-muted/40" />) :
            articles.map((a) => (
              <Card key={a.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => openDetail('article', a.id)}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    {a.category || 'Article'}
                  </div>
                  <h3 className="mt-2 font-semibold leading-snug line-clamp-2">{a.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3 leading-relaxed">{a.summary}</p>
                  <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">By {a.authorName || 'GoviSahana'}</div>
                </CardContent>
              </Card>
            ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 sm:p-12">
          <img src="/agri-landscape.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-10" />
          <div className="relative space-y-4 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to modernise your farm?</h2>
            <p className="mx-auto max-w-xl text-muted-foreground">Join thousands of Sri Lankan farmers getting verified advice, quality inputs and fair market access.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => setView('register')} className="bg-primary hover:bg-primary/90">Create a free account</Button>
              <Button size="lg" variant="outline" onClick={() => setView('about')}>Learn more</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
