'use client'
import { useState, useEffect } from 'react'
import { useApp, api } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Sprout,
  Mail,
  Lock,
  User as UserIcon,
  Phone,
  Loader2,
  Check,
  ArrowLeft,
  GraduationCap,
  Store,
  HardHat,
  ShoppingBasket,
  KeyRound,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { ROLE_OPTIONS } from '@/lib/types'
import { cn } from '@/lib/utils'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  FARMER: Sprout,
  EXPERT: GraduationCap,
  ENTERPRISE: Store,
  WORKER: HardHat,
  BUYER: ShoppingBasket,
}

export default function RegisterView() {
  const { setView, refreshUser } = useApp()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [role, setRole] = useState<string>('')
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' })
  const [otp, setOtp] = useState('')
  const [sendingOtp, setSendingOtp] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [simulatedNotice, setSimulatedNotice] = useState<string | null>(null)

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  // Countdown timer for resend OTP
  useEffect(() => {
    if (step !== 3 || countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [step, countdown])

  // Step 2 submit: Send OTP to user's email
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!form.name || !form.email || !form.password) {
      toast.error('Please fill in all required fields.')
      return
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters.')
      return
    }

    setSendingOtp(true)
    try {
      const res = await api<{ success: boolean; simulated?: boolean; code?: string; message?: string }>(
        '/api/auth/otp/send',
        {
          method: 'POST',
          body: JSON.stringify({ email: form.email, purpose: 'register' }),
        }
      )

      if (res.simulated && res.code) {
        setSimulatedNotice(res.code)
        toast.info(`Sandbox Mode OTP: ${res.code}`)
      } else {
        setSimulatedNotice(null)
        toast.success(`Verification code sent to ${form.email}`)
      }

      setStep(3)
      setOtp('')
      setCountdown(60)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSendingOtp(false)
    }
  }

  // Resend OTP in Step 3
  const handleResendOtp = async () => {
    if (countdown > 0 || sendingOtp) return
    setSendingOtp(true)
    try {
      const res = await api<{ success: boolean; simulated?: boolean; code?: string; message?: string }>(
        '/api/auth/otp/send',
        {
          method: 'POST',
          body: JSON.stringify({ email: form.email, purpose: 'register' }),
        }
      )
      if (res.simulated && res.code) {
        setSimulatedNotice(res.code)
        toast.info(`Sandbox Mode OTP: ${res.code}`)
      } else {
        setSimulatedNotice(null)
        toast.success(`New code sent to ${form.email}`)
      }
      setCountdown(60)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSendingOtp(false)
    }
  }

  // Step 3 submit: Verify OTP and finalize registration with password
  const verifyAndRegister = async (codeToVerify?: string) => {
    const finalCode = (codeToVerify ?? otp).trim()
    if (finalCode.length !== 6) {
      toast.error('Please enter the 6-digit verification code.')
      return
    }

    setVerifying(true)
    try {
      await api('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: form.email,
          code: finalCode,
          purpose: 'register',
          name: form.name,
          password: form.password,
          role,
          phone: form.phone || undefined,
        }),
      })

      await refreshUser()
      toast.success('Account created and verified! Welcome to GoviSahana.')
      setView('onboarding')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setVerifying(false)
    }
  }

  const handleOtpChange = (val: string) => {
    setOtp(val)
    if (val.length === 6 && !verifying) {
      verifyAndRegister(val)
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      {/* Top back button */}
      <button
        onClick={() => {
          if (step === 3) setStep(2)
          else if (step === 2) setStep(1)
          else setView('home')
        }}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      {/* Progress step indicator */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
            step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          {step > 1 ? <Check className="h-3.5 w-3.5" /> : '1'}
        </span>
        <span className={cn(step === 1 ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          Role
        </span>

        <span className="mx-1 h-px w-6 bg-border sm:w-8" />

        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
            step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          {step > 2 ? <Check className="h-3.5 w-3.5" /> : '2'}
        </span>
        <span className={cn(step === 2 ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          Details
        </span>

        <span className="mx-1 h-px w-6 bg-border sm:w-8" />

        <span
          className={cn(
            'flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold',
            step === 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
          )}
        >
          3
        </span>
        <span className={cn(step === 3 ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          Verify Email
        </span>
      </div>

      {/* Step 1: Choose Role */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <img src="/logo-icon.png" alt="GoviSahana logo" width={24} height={24} className="h-6 w-6" /> Join
              GoviSahana
            </CardTitle>
            <CardDescription>Select the option that best describes you. Farmer registration is always free.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              {ROLE_OPTIONS.map((r) => {
                const Icon = ROLE_ICONS[r.value] || Sprout
                return (
                  <button
                    key={r.value}
                    onClick={() => setRole(r.value)}
                    className={cn(
                      'flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all',
                      role === r.value ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-muted/40'
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 items-center justify-center rounded-lg',
                        role === r.value ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary'
                      )}
                    >
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
            <div className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <button type="button" onClick={() => setView('login')} className="font-medium text-primary hover:underline">
                Log in
              </button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Account Details & Password */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle>Create your account</CardTitle>
            <CardDescription>
              Registering as{' '}
              <span className="font-medium text-primary">{ROLE_OPTIONS.find((r) => r.value === role)?.label}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <div className="relative">
                  <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="e.g. Saman Bandara"
                    className="pl-9"
                    required
                    minLength={2}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => set('email', e.target.value)}
                      placeholder="you@example.lk"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">
                    Phone <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <div className="relative">
                    <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="phone"
                      value={form.phone}
                      onChange={(e) => set('phone', e.target.value)}
                      placeholder="077 123 4567"
                      className="pl-9"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="At least 6 characters"
                    className="pl-9"
                    required
                    minLength={6}
                  />
                </div>
                <p className="text-xs text-muted-foreground">You will use this password to sign in after verification.</p>
              </div>

              <p className="text-xs text-muted-foreground">
                By continuing you agree to our{' '}
                <button type="button" onClick={() => setView('terms')} className="text-primary hover:underline">
                  Terms
                </button>{' '}
                and{' '}
                <button type="button" onClick={() => setView('privacy')} className="text-primary hover:underline">
                  Privacy Policy
                </button>
                .
              </p>

              <Button type="submit" disabled={sendingOtp} className="w-full bg-primary hover:bg-primary/90">
                {sendingOtp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {sendingOtp ? 'Sending verification code…' : 'Continue to Email Verification'}
              </Button>

              <div className="text-center text-sm text-muted-foreground">
                Already have an account?{' '}
                <button type="button" onClick={() => setView('login')} className="font-medium text-primary hover:underline">
                  Log in
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Enter OTP */}
      {step === 3 && (
        <Card className="border-border shadow-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <KeyRound className="h-6 w-6" />
            </div>
            <CardTitle>Verify Your Email</CardTitle>
            <CardDescription className="max-w-md mx-auto">
              We have sent a 6-digit verification code to <span className="font-semibold text-foreground">{form.email}</span>.
              Please check your inbox (and spam folder) and enter it below.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {simulatedNotice && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Resend Free Tier Testing Mode
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Resend free tier only sends emails to the account owner (<code className="font-mono text-foreground font-semibold">ngrashmika1@gmail.com</code>). For testing with other emails, use this code:
                </p>
                <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                  <span className="font-mono text-xl font-bold tracking-widest text-amber-900 dark:text-amber-200 bg-amber-500/20 px-3 py-1 rounded-md border border-amber-500/30">
                    {simulatedNotice}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs border-amber-500/40 hover:bg-amber-500/20"
                    onClick={() => {
                      setOtp(simulatedNotice)
                      verifyAndRegister(simulatedNotice)
                    }}
                  >
                    Auto-fill & Complete
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-col items-center justify-center space-y-4">
              <InputOTP maxLength={6} value={otp} onChange={handleOtpChange} disabled={verifying}>
                <InputOTPGroup className="gap-2">
                  <InputOTPSlot index={0} className="h-12 w-11 text-lg font-semibold" />
                  <InputOTPSlot index={1} className="h-12 w-11 text-lg font-semibold" />
                  <InputOTPSlot index={2} className="h-12 w-11 text-lg font-semibold" />
                  <InputOTPSlot index={3} className="h-12 w-11 text-lg font-semibold" />
                  <InputOTPSlot index={4} className="h-12 w-11 text-lg font-semibold" />
                  <InputOTPSlot index={5} className="h-12 w-11 text-lg font-semibold" />
                </InputOTPGroup>
              </InputOTP>
              <p className="text-xs text-muted-foreground">Enter the 6-digit code received via Resend</p>
            </div>

            <Button
              type="button"
              disabled={otp.length !== 6 || verifying}
              onClick={() => verifyAndRegister()}
              className="w-full bg-primary hover:bg-primary/90"
            >
              {verifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
              {verifying ? 'Verifying & Creating Account…' : 'Verify & Complete Registration'}
            </Button>

            <div className="flex flex-col items-center justify-between gap-3 pt-2 text-sm sm:flex-row">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Wrong email? Change details
              </button>

              <button
                type="button"
                disabled={countdown > 0 || sendingOtp}
                onClick={handleResendOtp}
                className={cn(
                  'inline-flex items-center gap-1.5 text-xs font-medium',
                  countdown > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-primary hover:underline'
                )}
              >
                <RotateCcw className={cn('h-3.5 w-3.5', sendingOtp && 'animate-spin')} />
                {countdown > 0 ? `Resend code in ${countdown}s` : 'Resend code'}
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
