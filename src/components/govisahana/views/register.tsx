'use client'
import { useState } from 'react'
import Image from 'next/image'
import { useApp, api } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Sprout, Mail, Lock, User as UserIcon, Phone, Loader2, Check, ArrowLeft, GraduationCap, Store, HardHat, ShoppingBasket } from 'lucide-react'
import { toast } from 'sonner'
import { ROLE_OPTIONS } from '@/lib/types'
import { cn } from '@/lib/utils'

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  FARMER: Sprout, EXPERT: GraduationCap, ENTERPRISE: Store, WORKER: HardHat, BUYER: ShoppingBasket,
}

export default function RegisterView() {
  const { setView, refreshUser } = useApp()
  const [step, setStep] = useState<1 | 2>(1)
  const [role, setRole] = useState<string>('')
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [loading, setLoading] = useState(false)

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ ...form, role }),
      })
      await refreshUser()
      toast.success('Account created! Welcome to GoviSahana.')
      setView('onboarding')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <button onClick={() => (step === 2 ? setStep(1) : setView('home'))} className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div className="mb-6 flex items-center gap-2 text-sm">
        <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold', step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>{step > 1 ? <Check className="h-3.5 w-3.5" /> : '1'}</span>
        <span className={cn(step === 1 ? 'font-medium text-foreground' : 'text-muted-foreground')}>Choose your role</span>
        <span className="mx-1 h-px w-8 bg-border" />
        <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold', step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>2</span>
        <span className={cn(step === 2 ? 'font-medium text-foreground' : 'text-muted-foreground')}>Your details</span>
      </div>

      {step === 1 ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Image src="/logo-icon.png" alt="GoviSahana logo" width={24} height={24} className="h-6 w-6" /> Join GoviSahana</CardTitle>
            <CardDescription>Select the option that best describes you. Farmer registration is always free.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              {ROLE_OPTIONS.map((r) => {
                const Icon = ROLE_ICONS[r.value] || Sprout
                return (
                  <button
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all',
                      role === r.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/40',
                    )}
                  >
                    <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg', role === r.value ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary')}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="font-semibold">{r.label}</span>
                    <span className="text-xs text-muted-foreground">{r.desc}</span>
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground">Administrators are provisioned separately and cannot self-register.</p>
            <Button disabled={!role} onClick={() => setStep(2)} className="w-full bg-primary hover:bg-primary/90">
              Continue
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>Registering as <span className="font-medium text-primary">{ROLE_OPTIONS.find((r) => r.value === role)?.label}</span></CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Saman Bandara" className="pl-9" required minLength={2} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@example.lk" className="pl-9" required />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone <span className="text-muted-foreground">(optional)</span></Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input id="phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="077 123 4567" className="pl-9" />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="password" type="password" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="At least 6 characters" className="pl-9" required minLength={6} />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                By creating an account you agree to our{' '}
                <button type="button" onClick={() => setView('terms')} className="text-primary hover:underline">Terms</button> and{' '}
                <button type="button" onClick={() => setView('privacy')} className="text-primary hover:underline">Privacy Policy</button>.
              </p>
              <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? 'Creating account…' : 'Create account'}
              </Button>
              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button type="button" onClick={() => setView('login')} className="font-medium text-primary hover:underline">Log in</button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
