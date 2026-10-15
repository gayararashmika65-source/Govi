'use client'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { ROLE_OPTIONS } from '@/lib/types'
import {
  Sprout, ShieldCheck, MapPin, Users, ArrowRight, CheckCircle2, Search, Store, ShoppingBasket, HardHat, GraduationCap,
} from 'lucide-react'

// Minimal nav for unauthenticated visitors — logo + Sign in/Get Started only (no platform links)
export function MinimalNav() {
  const { setView } = useApp()
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <button onClick={() => setView('home')} className="flex items-center gap-2.5 shrink-0">
          <img src="/logo-icon.png" alt="GoviSahana logo" width={36} height={36} className="h-9 w-9 shrink-0" />
          <span className="flex flex-col leading-none text-left">
            <span className="text-base font-bold tracking-tight text-foreground">GoviSahana</span>
            <span className="hidden text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:block">
              Agriculture, Connected
            </span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setView('login')}>Sign in</Button>
          <Button size="sm" onClick={() => setView('register')} className="bg-primary hover:bg-primary/90">
            Get Started
          </Button>
        </div>
      </div>
    </header>
  )
}

// Welcome gate — shown to unauthenticated visitors instead of the full home page.
// Does NOT expose marketplace/experts/knowledge/functions. Just a pitch + register/login CTAs.
export function WelcomeScreen() {
  const { setView } = useApp()

  const roles = [
    { icon: Sprout, label: 'Farmer', color: 'bg-emerald-50 text-emerald-700' },
    { icon: GraduationCap, label: 'Expert', color: 'bg-violet-50 text-violet-700' },
    { icon: Store, label: 'Enterprise', color: 'bg-amber-50 text-amber-700' },
    { icon: HardHat, label: 'Worker', color: 'bg-orange-50 text-orange-700' },
    { icon: ShoppingBasket, label: 'Buyer', color: 'bg-cyan-50 text-cyan-700' },
  ]

  const benefits = [
    'Report crop problems and get advice from verified agricultural experts',
    'Buy quality seeds, fertilizer and equipment from trusted enterprises',
    'Sell your harvest directly to wholesalers, exporters and buyers',
    'Find agricultural jobs, machinery and skilled workers in your area',
  ]

  return (
    <div className="gs-hero-gradient relative overflow-hidden">
      <div className="gs-pattern absolute inset-0 opacity-60" />
      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          {/* Left: pitch */}
          <div className="space-y-6 text-center lg:text-left">
            <div className="flex justify-center lg:justify-start">
              <img src="/logo-icon.png" alt="GoviSahana" width={88} height={88} className="h-22 w-22" />
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <Sprout className="h-3.5 w-3.5" /> Built for Sri Lankan Agriculture
            </span>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Bridging Rural Farmers with <span className="text-primary">Verified Agricultural Experts</span>
            </h1>
            <p className="max-w-xl text-base text-muted-foreground leading-relaxed sm:text-lg">
              GoviSahana connects Sri Lankan farmers with agricultural officers, researchers,
              enterprises, workers and buyers — so knowledge, inputs and markets are always within reach.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center lg:justify-start">
              <Button size="lg" onClick={() => setView('register')} className="bg-primary hover:bg-primary/90">
                Create a free account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button size="lg" variant="outline" onClick={() => setView('login')}>
                Sign in
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-1 text-sm text-muted-foreground lg:justify-start">
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> 6 user roles</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> Verified professionals</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> 25 districts</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Farmer registration is always free.{' '}
              <button onClick={() => setView('login')} className="font-medium text-primary hover:underline">
                Already have an account? Sign in
              </button>
            </p>
          </div>

          {/* Right: benefits card */}
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xl sm:p-8">
              <h2 className="text-lg font-semibold text-foreground">What you can do on GoviSahana</h2>
              <ul className="mt-4 space-y-3">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                    <span className="text-sm text-muted-foreground leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 border-t border-border pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Join as</p>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {roles.map((r) => (
                    <button
                      key={r.label}
                      onClick={() => setView('register')}
                      className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-2.5 text-center transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${r.color}`}>
                        <r.icon className="h-4 w-4" />
                      </span>
                      <span className="text-[11px] font-medium text-foreground">{r.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 rounded-lg bg-primary/5 p-3 text-center">
                <p className="text-xs text-muted-foreground">
                  <Search className="mr-1 inline h-3 w-3 text-primary" />
                  Registration takes less than a minute.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
