'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Menu, Bell, LogOut, User as UserIcon, LayoutDashboard,
  Search, ShieldCheck, ChevronDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ROLE_LABELS } from '@/lib/types'
import { useT } from '@/lib/use-t'
import { ThemeToggle } from '@/components/theme-toggle'
import { LanguageSwitcher } from '@/components/language-switcher'
import type { View } from '@/lib/store'

const PUBLIC_LINKS: { tKey: string; view: View }[] = [
  { tKey: 'nav.home', view: 'home' },
  { tKey: 'nav.findExperts', view: 'experts' },
  { tKey: 'nav.knowledge', view: 'knowledge' },
  { tKey: 'nav.marketplace', view: 'marketplace' },
  { tKey: 'nav.crops', view: 'crops' },
  { tKey: 'nav.jobs', view: 'jobs' },
  { tKey: 'nav.buyers', view: 'buyer-requirements' },
]

const MORE_LINKS: { tKey: string; view: View }[] = [
  { tKey: 'nav.about', view: 'about' },
  { tKey: 'nav.contact', view: 'contact' },
]

function initials(name: string) {
  return name.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase()
}

export function Navbar() {
  const { user, view, setView, logout } = useApp()
  const t = useT()
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const nav = (v: View) => {
    setView(v)
    setOpen(false)
    setMoreOpen(false)
  }

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-md transition-shadow',
        scrolled && 'shadow-sm',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
        {/* Logo */}
        <button onClick={() => nav('home')} className="flex items-center gap-2.5 shrink-0">
          <img
            src="/logo-icon.png"
            alt="GoviSahana logo"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0"
          />
          <span className="flex flex-col leading-none text-left">
            <span className="text-base font-bold tracking-tight text-foreground">GoviSahana</span>
            <span className="hidden text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:block">
              {t('brand.tagline')}
            </span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="ml-2 hidden items-center gap-0.5 lg:flex">
          {PUBLIC_LINKS.map((l) => (
            <button
              key={l.view}
              onClick={() => nav(l.view)}
              className={cn(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                view === l.view ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {t(l.tKey)}
            </button>
          ))}
          <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground">
                {t('nav.more')} <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {MORE_LINKS.map((l) => (
                <DropdownMenuItem key={l.view} onClick={() => nav(l.view)}>
                  {t(l.tKey)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => nav('privacy')}>{t('nav.privacy')}</DropdownMenuItem>
              <DropdownMenuItem onClick={() => nav('terms')}>{t('nav.terms')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <LanguageSwitcher className="hidden sm:flex" />
          <ThemeToggle />
          {user ? <NotificationsBell /> : null}

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 rounded-full border border-border bg-card py-1 pl-1 pr-2 hover:bg-muted">
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={user.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                      {initials(user.name)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-sm font-medium sm:inline">{user.name.split(' ')[0]}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col">
                    <span className="font-medium">{user.name}</span>
                    <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                    <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                      {ROLE_LABELS[user.role as keyof typeof ROLE_LABELS] || user.role}
                    </span>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => setView('dashboard')}>
                  <LayoutDashboard className="mr-2 h-4 w-4" /> {t('nav.dashboard')}
                </DropdownMenuItem>
                {user.role === 'EXPERT' && (
                  <DropdownMenuItem onClick={() => setView('onboarding')}>
                    <ShieldCheck className="mr-2 h-4 w-4" /> {t('nav.verification')}
                  </DropdownMenuItem>
                )}
                {user.role !== 'EXPERT' && (
                  <DropdownMenuItem onClick={() => setView('onboarding')}>
                    <UserIcon className="mr-2 h-4 w-4" /> {t('nav.profile')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-rose-600 focus:text-rose-700">
                  <LogOut className="mr-2 h-4 w-4" /> {t('nav.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex" onClick={() => nav('login')}>
                {t('nav.signIn')}
              </Button>
              <Button size="sm" onClick={() => nav('register')} className="bg-primary hover:bg-primary/90">
                {t('nav.getStarted')}
              </Button>
            </>
          )}

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetTitle className="mb-4 flex items-center gap-2">
                <img src="/logo-icon.png" alt="GoviSahana logo" width={32} height={32} className="h-8 w-8" />
                GoviSahana
              </SheetTitle>
              <nav className="flex flex-col gap-1">
                {[...PUBLIC_LINKS, ...MORE_LINKS].map((l) => (
                  <button
                    key={l.view}
                    onClick={() => nav(l.view)}
                    className={cn(
                      'rounded-lg px-3 py-2 text-left text-sm font-medium',
                      view === l.view ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {t(l.tKey)}
                  </button>
                ))}
                <div className="my-2 border-t" />
                <button onClick={() => nav('privacy')} className="rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted">{t('nav.privacy')}</button>
                <button onClick={() => nav('terms')} className="rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted">{t('nav.terms')}</button>
                <div className="my-2 border-t" />
                <div className="flex items-center gap-2 px-3 py-1">
                  <LanguageSwitcher />
                  <ThemeToggle />
                </div>
                {!user && (
                  <div className="mt-3 flex flex-col gap-2">
                    <Button variant="outline" onClick={() => nav('login')}>{t('nav.signIn')}</Button>
                    <Button onClick={() => nav('register')} className="bg-primary">{t('nav.getStarted')}</Button>
                  </div>
                )}
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}

function NotificationsBell() {
  const { setView } = useApp()
  const [items, setItems] = useState<{ id: string; title: string; body: string; read: boolean; link?: string | null }[]>([])
  const [unread, setUnread] = useState(0)
  const [open, setOpen] = useState(false)

  const load = async () => {
    try {
      const res = await fetch('/api/notifications?unread=false', { credentials: 'include' })
      const data = await res.json()
      setItems(data.notifications || [])
      setUnread(data.unreadCount || 0)
    } catch { /* ignore */ }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 25000)
    return () => clearInterval(t)
  }, [])

  const markAll = async () => {
    await fetch('/api/notifications/read', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }), credentials: 'include' })
    load()
  }

  return (
    <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (o) load() }}>
      <DropdownMenuTrigger asChild>
        <button className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card hover:bg-muted" aria-label="Notifications">
          <Bell className="h-4.5 w-4.5 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unread > 0 && (
            <button onClick={markAll} className="text-xs font-medium text-primary hover:underline">Mark all read</button>
          )}
        </div>
        <div className="gs-scroll max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">No notifications yet</div>
          ) : items.slice(0, 20).map((n) => (
            <button
              key={n.id}
              onClick={() => { if (n.link) setView(n.link as View); setOpen(false) }}
              className={cn('flex w-full gap-2 border-b px-3 py-2.5 text-left hover:bg-muted/60', !n.read && 'bg-primary/5')}
            >
              <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} />
              <span className="flex flex-col">
                <span className="text-sm font-medium text-foreground">{n.title}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>
              </span>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
