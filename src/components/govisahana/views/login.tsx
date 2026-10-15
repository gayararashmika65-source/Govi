'use client'
import { useState, useEffect } from 'react'
import { useApp, api } from '@/lib/store'
import { useT } from '@/lib/use-t'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Lock, Loader2, ArrowLeft, KeyRound, CheckCircle2, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'

export default function LoginView() {
  const { setView, refreshUser } = useApp()
  const t = useT()

  // Login state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Forgot password state
  const [mode, setMode] = useState<'login' | 'forgot'>('login')
  const [resetStep, setResetStep] = useState<1 | 2>(1)
  const [resetEmail, setResetEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [simulatedNotice, setSimulatedNotice] = useState<string | null>(null)

  // Countdown timer for resend OTP
  useEffect(() => {
    if (mode !== 'forgot' || resetStep !== 2 || countdown <= 0) return
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(timer)
  }, [mode, resetStep, countdown])

  // Submit standard Password login
  const submitLogin = async (e: React.FormEvent) => {
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

  // Step 1: Send Password Reset OTP
  const handleSendResetOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const targetEmail = resetEmail.trim().toLowerCase()
    if (!targetEmail) {
      toast.error('Please enter your email address.')
      return
    }

    setResetLoading(true)
    try {
      const res = await api<{ success: boolean; simulated?: boolean; code?: string; message?: string }>(
        '/api/auth/otp/send',
        {
          method: 'POST',
          body: JSON.stringify({ email: targetEmail, purpose: 'reset' }),
        }
      )

      if (res.simulated && res.code) {
        setSimulatedNotice(res.code)
        toast.info(`Sandbox Mode OTP: ${res.code}`)
      } else {
        setSimulatedNotice(null)
        toast.success(`Verification code sent to ${targetEmail}`)
      }

      setResetStep(2)
      setOtp('')
      setCountdown(60)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setResetLoading(false)
    }
  }

  // Resend Reset OTP
  const handleResendResetOtp = async () => {
    if (countdown > 0 || resetLoading) return
    setResetLoading(true)
    try {
      const res = await api<{ success: boolean; simulated?: boolean; code?: string; message?: string }>(
        '/api/auth/otp/send',
        {
          method: 'POST',
          body: JSON.stringify({ email: resetEmail.trim().toLowerCase(), purpose: 'reset' }),
        }
      )
      if (res.simulated && res.code) {
        setSimulatedNotice(res.code)
        toast.info(`Sandbox Mode OTP: ${res.code}`)
      } else {
        setSimulatedNotice(null)
        toast.success(`New code sent to ${resetEmail}`)
      }
      setCountdown(60)
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setResetLoading(false)
    }
  }

  // Step 2: Verify OTP and update password
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit verification code.')
      return
    }
    if (newPassword.length < 6) {
      toast.error('New password must be at least 6 characters.')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setResetLoading(true)
    try {
      await api('/api/auth/otp/verify', {
        method: 'POST',
        body: JSON.stringify({
          email: resetEmail.trim().toLowerCase(),
          code: otp.trim(),
          purpose: 'reset',
          newPassword,
        }),
      })

      await refreshUser()
      toast.success('Password updated successfully! Welcome back.')
      setView('dashboard')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setResetLoading(false)
    }
  }

  const quickLogin = (mail: string) => {
    setEmail(mail)
    setPassword('password123')
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <img src="/logo-icon.png" alt="GoviSahana logo" width={64} height={64} className="h-16 w-16" />
        <h1 className="mt-4 text-2xl font-bold">
          {mode === 'login' ? t('auth.welcomeBack') : 'Reset Password'}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === 'login' ? t('auth.signInSubtitle') : 'Verify your email to create a new password'}
        </p>
      </div>

      {mode === 'login' ? (
        /* STANDARD LOGIN CARD */
        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>{t('nav.signIn')}</CardTitle>
            <CardDescription>{t('auth.email')} · {t('auth.password')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submitLogin} className="space-y-4">
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
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setResetEmail(email)
                      setMode('forgot')
                      setResetStep(1)
                      setSimulatedNotice(null)
                    }}
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
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

            <div className="mt-4 text-center text-sm text-muted-foreground">
              {t('auth.noAccount')}{' '}
              <button onClick={() => setView('register')} className="font-medium text-primary hover:underline">
                {t('auth.createOne')}
              </button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* FORGOT PASSWORD CARD */
        <Card className="border-border shadow-sm">
          <CardHeader>
            <button
              type="button"
              onClick={() => setMode('login')}
              className="mb-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
            </button>
            <CardTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              {resetStep === 1 ? 'Find your account' : 'Set new password'}
            </CardTitle>
            <CardDescription>
              {resetStep === 1
                ? "Enter your registered email address and we'll send you an OTP verification code."
                : `Enter the 6-digit code sent to ${resetEmail} and choose a new password.`}
            </CardDescription>
          </CardHeader>

          <CardContent>
            {resetStep === 1 ? (
              <form onSubmit={handleSendResetOtp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Your email address</Label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="you@example.lk"
                      className="pl-9"
                      required
                    />
                  </div>
                </div>

                <Button type="submit" disabled={resetLoading} className="w-full bg-primary hover:bg-primary/90">
                  {resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  {resetLoading ? 'Sending code…' : 'Send Verification Code'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleResetPasswordSubmit} className="space-y-4">
                {simulatedNotice && (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-center">
                    <p className="text-xs text-muted-foreground">Sandbox mode verification code:</p>
                    <div className="mt-1 flex items-center justify-center gap-2">
                      <span className="font-mono text-lg font-bold tracking-widest text-amber-900 dark:text-amber-200">
                        {simulatedNotice}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 text-xs border-amber-500/40"
                        onClick={() => setOtp(simulatedNotice)}
                      >
                        Auto-fill
                      </Button>
                    </div>
                  </div>
                )}

                <div className="flex flex-col items-center justify-center space-y-2">
                  <Label className="text-xs text-muted-foreground">6-Digit Verification Code</Label>
                  <InputOTP maxLength={6} value={otp} onChange={(val) => setOtp(val)} disabled={resetLoading}>
                    <InputOTPGroup className="gap-2">
                      <InputOTPSlot index={0} className="h-11 w-10 text-base font-semibold" />
                      <InputOTPSlot index={1} className="h-11 w-10 text-base font-semibold" />
                      <InputOTPSlot index={2} className="h-11 w-10 text-base font-semibold" />
                      <InputOTPSlot index={3} className="h-11 w-10 text-base font-semibold" />
                      <InputOTPSlot index={4} className="h-11 w-10 text-base font-semibold" />
                      <InputOTPSlot index={5} className="h-11 w-10 text-base font-semibold" />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-password">New password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="pl-9"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm new password</Label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-type password"
                      className="pl-9"
                      required
                      minLength={6}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={resetLoading || otp.length !== 6 || !newPassword || !confirmPassword}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  {resetLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  {resetLoading ? 'Resetting Password…' : 'Reset Password & Sign In'}
                </Button>

                <div className="flex items-center justify-between pt-1 text-xs text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setResetStep(1)}
                    className="hover:text-foreground hover:underline"
                  >
                    Change email
                  </button>

                  <button
                    type="button"
                    disabled={countdown > 0 || resetLoading}
                    onClick={handleResendResetOtp}
                    className={cn(
                      'inline-flex items-center gap-1 font-medium',
                      countdown > 0 ? 'text-muted-foreground cursor-not-allowed' : 'text-primary hover:underline'
                    )}
                  >
                    <RotateCcw className={cn('h-3 w-3', resetLoading && 'animate-spin')} />
                    {countdown > 0 ? `Resend in ${countdown}s` : 'Resend code'}
                  </button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      )}

      {/* Demo Accounts Quick-Select (Shown in login mode) */}
      {mode === 'login' && (
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
                onClick={() => quickLogin(mail)}
                className="flex items-center justify-between rounded-md border border-border bg-background px-2 py-1.5 hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="font-medium text-foreground">{t('role.' + role)}</span>
                <span className="truncate text-muted-foreground">{mail}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-muted-foreground">{t('auth.demoClick')}</p>
        </div>
      )}
    </div>
  )
}
