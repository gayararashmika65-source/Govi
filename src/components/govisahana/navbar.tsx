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

const PRIMARY_LINKS: { tKey: string; view: View; matchViews?: View[] }[] = [
  { tKey: 'nav.home', view: 'home' },
  { tKey: 'nav.findExperts', view: 'experts', matchViews: ['experts', 'expert-detail'] },
  { tKey: 'nav.knowledge', view: 'knowledge', matchViews: ['knowledge', 'article'] },
  { tKey: 'nav.marketplace', view: 'marketplace', matchViews: ['marketplace', 'product-detail'] },
  { tKey: 'nav.crops', view: 'crops', matchViews: ['crops', 'crop-detail'] },
]

const SECONDARY_LINKS: { tKey: string; view: View; matchViews?: View[] }[] = [
  { tKey: 'nav.jobs', view: 'jobs', matchViews: ['jobs', 'job-detail'] },
  { tKey: 'nav.buyers', view: 'buyer-requirements' },
]

const MORE_LINKS: { tKey: string; view: View }[] = [
  { tKey: 'nav.about', view: 'about' },
  { tKey: 'nav.contact', view: 'contact' },
]

const ALL_NAV_LINKS = [...PRIMARY_LINKS, ...SECONDARY_LINKS, ...MORE_LINKS]

function isLinkActive(link: { view: View; matchViews?: View[] }, currentView: View) {
  if (currentView === link.view) return true
  if (link.matchViews && link.matchViews.includes(currentView)) return true
  return false
}

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

  const isSecondaryActive = SECONDARY_LINKS.some((l) => isLinkActive(l, view))
  const isMoreItemActive = MORE_LINKS.some((l) => view === l.view) || view === 'privacy' || view === 'terms'
  const moreActive = isMoreItemActive || isSecondaryActive

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-md transition-shadow',
        scrolled && 'shadow-sm',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 sm:gap-4 px-4 sm:px-6">
        {/* Logo / Brand (Left) */}
        <div className="flex items-center shrink-0">
          <button
            onClick={() => nav('home')}
            className="flex items-center gap-2.5 rounded-lg py-1 transition-opacity hover:opacity-90 focus-visible:outline-none"
            aria-label="GoviSahana Home"
          >
            <img
              src="/logo-icon.png"
              alt="GoviSahana logo"
              width={36}
              height={36}
              className="h-9 w-9 shrink-0 object-contain"
            />
            <span className="flex flex-col justify-center text-left">
              <span className="text-base font-bold tracking-tight text-foreground leading-tight">
                GoviSahana
              </span>
              <span className="hidden text-[10px] font-medium uppercase tracking-wider text-muted-foreground sm:block leading-tight">
                {t('brand.tagline')}
              </span>
            </span>
          </button>
        </div>

        {/* Desktop Nav Links (Centered) */}
        <nav className="hidden items-center justify-center gap-1 lg:flex flex-1 mx-2 xl:mx-4">
          {PRIMARY_LINKS.map((l) => {
            const active = isLinkActive(l, view)
            return (
              <button
                key={l.view}
                onClick={() => nav(l.view)}
                className={cn(
                  'inline-flex h-9 items-center justify-center rounded-lg px-2.5 xl:px-3 text-sm font-medium transition-colors whitespace-nowrap',
                  active
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {t(l.tKey)}
              </button>
            )
          })}

          {/* Secondary links (visible on xl: screens, folded into More on lg) */}
          {SECONDARY_LINKS.map((l) => {
            const active = isLinkActive(l, view)
            return (
              <button
                key={l.view}
                onClick={() => nav(l.view)}
                className={cn(
                  'hidden xl:inline-flex h-9 items-center justify-center rounded-lg px-2.5 2xl:px-3 text-sm font-medium transition-colors whitespace-nowrap',
                  active
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {t(l.tKey)}
              </button>
            )
          })}

          <DropdownMenu open={moreOpen} onOpenChange={setMoreOpen}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  'inline-flex h-9 items-center justify-center gap-1 rounded-lg px-2.5 text-sm font-medium transition-colors whitespace-nowrap',
                  moreActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {t('nav.more')} <ChevronDown className="h-3.5 w-3.5 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="xl:hidden">
                {SECONDARY_LINKS.map((l) => (
                  <DropdownMenuItem
                    key={l.view}
                    onClick={() => nav(l.view)}
                    className={isLinkActive(l, view) ? 'font-semibold text-primary' : ''}
                  >
                    {t(l.tKey)}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
              </div>
              {MORE_LINKS.map((l) => (
                <DropdownMenuItem
                  key={l.view}
                  onClick={() => nav(l.view)}
                  className={view === l.view ? 'font-semibold text-primary' : ''}
                >
                  {t(l.tKey)}
                </DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => nav('privacy')}
                className={view === 'privacy' ? 'font-semibold text-primary' : ''}
              >
                {t('nav.privacy')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => nav('terms')}
                className={view === 'terms' ? 'font-semibold text-primary' : ''}
              >
                {t('nav.terms')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        {/* Right utility & action controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <LanguageSwitcher className="hidden sm:flex" />
          <ThemeToggle />

          {user ? (
            <>
              <NotificationsBell />
              <div className="hidden h-5 w-px bg-border/60 sm:block mx-0.5" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-9 items-center gap-2 rounded-full border border-border bg-card pl-1 pr-2.5 hover:bg-muted transition-colors shrink-0 focus-visible:outline-none"
                    aria-label="User account menu"
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={user.avatarUrl || undefined} alt={user.name} />
                      <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                        {initials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden text-sm font-medium sm:inline max-w-[120px] truncate">
                      {user.name.split(' ')[0]}
                    </span>
                    <ChevronDown className="hidden h-3 w-3 text-muted-foreground sm:inline shrink-0 opacity-70" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col">
                      <span className="font-medium truncate">{user.name}</span>
                      <span className="text-xs font-normal text-muted-foreground truncate">{user.email}</span>
                      <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                        {t('role.' + user.role)}
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
            </>
          ) : (
            <>
              <div className="hidden h-5 w-px bg-border/60 sm:block mx-0.5" />
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:inline-flex h-9 px-3"
                onClick={() => nav('login')}
              >
                {t('nav.signIn')}
              </Button>
              <Button
                size="sm"
                onClick={() => nav('register')}
                className="h-9 px-3.5 bg-primary hover:bg-primary/90 shadow-sm"
              >
                {t('nav.getStarted')}
              </Button>
            </>
          )}

          {/* Mobile menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0 lg:hidden"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72">
              <SheetTitle className="mb-4 flex items-center gap-2.5">
                <img
                  src="/logo-icon.png"
                  alt="GoviSahana logo"
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 object-contain"
                />
                <span className="flex flex-col text-left">
                  <span className="text-base font-bold text-foreground leading-tight">GoviSahana</span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground leading-tight">
                    {t('brand.tagline')}
                  </span>
                </span>
              </SheetTitle>
              <nav className="flex flex-col gap-1">
                {ALL_NAV_LINKS.map((l) => {
                  const active = isLinkActive(l, view)
                  return (
                    <button
                      key={l.view}
                      onClick={() => nav(l.view)}
                      className={cn(
                        'flex items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors',
                        active ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted',
                      )}
                    >
                      {t(l.tKey)}
                    </button>
                  )
                })}
                <div className="my-2 border-t" />
                <button
                  onClick={() => nav('privacy')}
                  className={cn(
                    'flex items-center rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    view === 'privacy' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {t('nav.privacy')}
                </button>
                <button
                  onClick={() => nav('terms')}
                  className={cn(
                    'flex items-center rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    view === 'terms' ? 'bg-primary/10 text-primary font-semibold' : 'text-muted-foreground hover:bg-muted',
                  )}
                >
                  {t('nav.terms')}
                </button>
                <div className="my-2 border-t" />
                <div className="flex items-center justify-between px-3 py-1">
                  <span className="text-xs font-medium text-muted-foreground">Settings</span>
                  <div className="flex items-center gap-2">
                    <LanguageSwitcher />
                    <ThemeToggle />
                  </div>
                </div>
                {!user && (
                  <div className="mt-3 flex flex-col gap-2">
                    <Button variant="outline" className="h-9" onClick={() => nav('login')}>
                      {t('nav.signIn')}
                    </Button>
                    <Button onClick={() => nav('register')} className="h-9 bg-primary shadow-sm">
                      {t('nav.getStarted')}
                    </Button>
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
  const t = useT()
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
    const timer = setInterval(load, 25000)
    return () => clearInterval(timer)
  }, [])

  const markAll = async () => {
    await fetch('/api/notifications/read', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ all: true }), credentials: 'include' })
    load()
  }

  return (
    <DropdownMenu open={open} onOpenChange={(o) => { setOpen(o); if (o) load() }}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card hover:bg-muted transition-colors shrink-0 focus-visible:outline-none"
          aria-label={t('nav.notifications')}
        >
          <Bell className="h-4.5 w-4.5 text-muted-foreground" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-background">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3.5 py-2.5">
          <span className="text-sm font-semibold">{t('nav.notifications')}</span>
          {unread > 0 && (
            <button onClick={markAll} className="text-xs font-medium text-primary hover:underline">{t('nav.markAllRead')}</button>
          )}
        </div>
        <div className="gs-scroll max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-muted-foreground">{t('nav.noNotifications')}</div>
          ) : items.slice(0, 20).map((n) => (
            <button
              key={n.id}
              onClick={() => { if (n.link) setView(n.link as View); setOpen(false) }}
              className={cn('flex w-full gap-2.5 border-b border-border/60 px-3.5 py-2.5 text-left hover:bg-muted/60 transition-colors', !n.read && 'bg-primary/5')}
            >
              <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', n.read ? 'bg-transparent' : 'bg-primary')} />
              <span className="flex flex-col min-w-0">
                <span className="text-sm font-medium text-foreground truncate">{n.title}</span>
                <span className="text-xs text-muted-foreground line-clamp-2">{n.body}</span>
              </span>
            </button>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
