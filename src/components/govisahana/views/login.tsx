'use client'
import { useState } from 'react'
import { useApp, api } from '@/lib/store'
import { useT } from '@/lib/use-t'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mail, Lock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function LoginView() {
  const { setView, refreshUser } = useApp()
  const t = useT()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
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

  const quickLogin = (mail: string) => {
    setEmail(mail)
    setPassword('password123')
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-md flex-col justify-center px-4 py-10">
      <div className="mb-6 flex flex-col items-center text-center">
        <img src="/logo-icon.png" alt="GoviSahana logo" width={64} height={64} className="h-16 w-16" />
        <h1 className="mt-4 text-2xl font-bold">{t('auth.welcomeBack')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('auth.signInSubtitle')}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('nav.signIn')}</CardTitle>
          <CardDescription>{t('auth.email')} · {t('auth.password')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <div className="relative">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.lk" className="pl-9" required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="pl-9" required />
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
            <button key={mail} onClick={() => quickLogin(mail)} className="flex items-center justify-between rounded-md border border-border bg-background px-2 py-1.5 hover:border-primary/40 hover:bg-primary/5">
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
