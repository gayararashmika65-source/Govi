'use client'
import { useState, useEffect } from 'react'
import { useApp, api } from '@/lib/store'
import { useT } from '@/lib/use-t'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Mail, Lock, Loader2, KeyRound, ArrowRight, RotateCw, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginView() {
  const { setView, refreshUser } = useApp()
  const t = useT()

  const [mode, setMode] = useState<'otp' | 'password'>('otp')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [otpSent, setOtpSent] = useState(false)
  const [otpCode, setOtpCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // Countdown timer for resend
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [countdown])

  // Submit Password login
  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
      await refreshUser()
      toast.success(t('auth.welcomeBack') + '!')
      setView('dashboard')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Send OTP code via Resend
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!email || !email.includes('@')) {
      toast.error('Please enter a valid email address')
      return
    }

    setLoading(true)
    try {
      const res = await api<{ success: boolean; message: string; simulated?: boolean; code?: string }>('/api/auth/otp/send', {
        method: 'POST',
        body: JSON.stringify({ email, purpose: 'login' }),
      })

      setOtpSent(true)
      setCountdown(60)
      if (res.simulated && res.code) {
        toast.info(`Development mode: Your code is ${res.code}`, { duration: 8000 })
        setOtpCode(res.code)
      } else {
        toast.success(`Verification code sent to ${email}`)
      }
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  // Verify OTP and complete login
  const handleVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpCode
    if (code.length !== 6) {
      toast.error('Please enter all 6 digits of the code')
      return
    }

    setLoading(true)
    try {
      await api('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({ email, code, purpose: 'login' }),
      })
      await refreshUser()
      toast.success(t('auth.welcomeBack') + '!')
      setView('dashboard')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const quickSelect = (mail: string) => {
    setEmail(mail)
    setPassword('password123')
    if (mode === 'otp') {
      setOtpSent(false)
      setOtpCode('')
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <img src="/logo-icon.png" alt="GoviSahana logo" width={64} height={64} className="h-16 w-16" />
        <h1 className="mt-4 text-2xl font-bold">{t('auth.welcomeBack')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('auth.signInSubtitle')}</p>
      </div>

      <Card className="border-border shadow-sm">
        {/* Auth mode toggle tabs */}
        <div className="grid grid-cols-2 border-b border-border text-center text-sm font-medium">
          <button
            type="button"
            onClick={() => { setMode('otp'); setOtpSent(false); }}
            className={`flex items-center justify-center gap-2 py-3 transition-colors ${
              mode === 'otp'
                ? 'border-b-2 border-primary text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            Email OTP (Code)
          </button>
          <button
            type="button"
            onClick={() => setMode('password')}
            className={`flex items-center justify-center gap-2 py-3 transition-colors ${
              mode === 'password'
                ? 'border-b-2 border-primary text-primary font-semibold'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Lock className="h-4 w-4" />
            Password
          </button>
        </div>

        <CardHeader>
          <CardTitle>
            {mode === 'otp' 
              ? (otpSent ? 'Enter Verification Code' : 'Sign In with Email Code') 
              : t('nav.signIn')}
          </CardTitle>
          <CardDescription>
            {mode === 'otp'
              ? (otpSent ? `A 6-digit code was sent to ${email}` : 'We will send a one-time verification code to your email')
              : `${t('auth.email')} · ${t('auth.password')}`}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {mode === 'otp' ? (
            /* OTP LOGIN FLOW */
            !otpSent ? (
              /* Step 1: Request OTP */
              <form onSubmit={handleSendOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp-email">{t('auth.email')}</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="otp-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.lk"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading || !email} className="w-full bg-primary hover:bg-primary/90">
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Send Code to Email
                </Button>
              </form>
            ) : (
              /* Step 2: Enter 6-digit OTP */
              <div className="space-y-5">
                <div className="flex flex-col items-center justify-center space-y-3 py-2">
                  <InputOTP
                    maxLength={6}
                    value={otpCode}
                    onChange={(val) => {
                      setOtpCode(val)
                      if (val.length === 6) {
                        handleVerifyOtp(val)
                      }
                    }}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                  <p className="text-xs text-muted-foreground">Enter the 6-digit verification code</p>
                </div>

                <Button
                  onClick={() => handleVerifyOtp()}
                  disabled={loading || otpCode.length !== 6}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Verify & Sign In
                </Button>

                <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtpCode(''); }}
                    className="hover:underline text-foreground"
                  >
                    Change email
                  </button>
                  <button
                    type="button"
                    disabled={countdown > 0 || loading}
                    onClick={() => handleSendOtp()}
                    className={`inline-flex items-center gap-1 ${
                      countdown > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-primary font-medium hover:underline'
                    }`}
                  >
                    <RotateCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                  </button>
                </div>
              </div>
            )
          ) : (
            /* PASSWORD LOGIN FLOW */
            <form onSubmit={submitPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email')}</Label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.lk"
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('auth.password')}</Label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-9"
                    required
                  />
                </div>
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-primary hover:bg-primary/90">
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {loading ? t('auth.signingIn') : t('auth.signInBtn')}
              </Button>
            </form>
          )}

          <div className="mt-4 text-center text-sm text-muted-foreground">
            {t('auth.noAccount')}{' '}
            <button onClick={() => setView('register')} className="font-medium text-primary hover:underline">
              {t('auth.createOne')}
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Demo Accounts Quick-Select */}
      <div className="mt-4 rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('auth.demoAccounts')}</p>
        <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
          {[
            ['farmer@demo.lk', 'FARMER'],
            ['expert@demo.lk', 'EXPERT'],
            ['enterprise@demo.lk', 'ENTERPRISE'],
            ['worker@demo.lk', 'WORKER'],
            ['buyer@demo.lk', 'BUYER'],
            ['admin@demo.lk', 'ADMIN'],
          ].map(([mail, role]) => (
            <button
              key={mail}
              onClick={() => quickSelect(mail)}
              className="flex items-center justify-between rounded-md border border-border bg-background px-2 py-1.5 hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="font-medium text-foreground">{t('role.' + role)}</span>
              <span className="truncate text-muted-foreground">{mail}</span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">{t('auth.demoClick')}</p>
      </div>
    </div>
  )
}
