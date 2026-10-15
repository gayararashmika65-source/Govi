'use client'
import { useState } from 'react'
import { useApp } from '@/lib/store'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { RoleBadge } from '@/components/govisahana/badges'
import { Menu, LogOut, Bell, Sprout, LayoutGrid, Stethoscope, Plus, Search, Wheat, MessageSquare, Inbox, CalendarClock, ClipboardList, Package, Briefcase, Send, Wrench, ShieldCheck, Store, Users, Flag, ScrollText, Settings } from 'lucide-react'
import { useApp as useAppStore } from '@/lib/store'
import FarmerDashboard from './farmer'
import ExpertDashboard from './expert'
import EnterpriseDashboard from './enterprise'
import WorkerDashboard from './worker'
import BuyerDashboard from './buyer'
import AdminDashboard from './admin'

export type DashboardState = {
  tab: string
  subView: null | { type: 'case-detail' | 'messaging' | 'create-case'; id?: string }
  setTab: (t: string) => void
  openSubView: (type: 'case-detail' | 'messaging' | 'create-case', id?: string) => void
  closeSubView: () => void
}

export function useDashboard(): DashboardState {
  const [tab, setTab] = useState('overview')
  const [subView, setSubView] = useState<DashboardState['subView']>(null)
  return {
    tab, subView, setTab,
    openSubView: (type, id) => setSubView({ type, id }),
    closeSubView: () => setSubView(null),
  }
}

const NAV_BY_ROLE: Record<string, { label: string; tab: string; icon: React.ComponentType<{ className?: string }> }[]> = {
  FARMER: [
    { label: 'Overview', tab: 'overview', icon: LayoutGrid },
    { label: 'My Cases', tab: 'cases', icon: Stethoscope },
    { label: 'Report a Problem', tab: 'create', icon: Plus },
    { label: 'Find Experts', tab: 'experts', icon: Search },
    { label: 'My Crop Listings', tab: 'crops', icon: Wheat },
    { label: 'Messages', tab: 'messages', icon: MessageSquare },
  ],
  EXPERT: [
    { label: 'Overview', tab: 'overview', icon: LayoutGrid },
    { label: 'Case Queue', tab: 'queue', icon: Inbox },
    { label: 'My Consultations', tab: 'consultations', icon: CalendarClock },
    { label: 'Messages', tab: 'messages', icon: MessageSquare },
    { label: 'Recommendations', tab: 'recs', icon: ClipboardList },
  ],
  ENTERPRISE: [
    { label: 'Overview', tab: 'overview', icon: LayoutGrid },
    { label: 'My Products', tab: 'products', icon: Package },
    { label: 'Enquiries', tab: 'enquiries', icon: Inbox },
  ],
  WORKER: [
    { label: 'Overview', tab: 'overview', icon: LayoutGrid },
    { label: 'Browse Jobs', tab: 'jobs', icon: Briefcase },
    { label: 'My Applications', tab: 'applications', icon: Send },
    { label: 'My Services', tab: 'services', icon: Wrench },
  ],
  BUYER: [
    { label: 'Overview', tab: 'overview', icon: LayoutGrid },
    { label: 'My Requirements', tab: 'requirements', icon: ClipboardList },
    { label: 'Browse Crops', tab: 'crops', icon: Wheat },
    { label: 'Enquiries', tab: 'enquiries', icon: Inbox },
  ],
  ADMIN: [
    { label: 'Overview', tab: 'overview', icon: LayoutGrid },
    { label: 'Verify Experts', tab: 'verify-experts', icon: ShieldCheck },
    { label: 'Verify Enterprises', tab: 'verify-enterprises', icon: Store },
    { label: 'Users', tab: 'users', icon: Users },
    { label: 'Reports', tab: 'reports', icon: Flag },
    { label: 'Audit Logs', tab: 'audit', icon: ScrollText },
  ],
}

type SidebarProps = {
  userName: string
  userRole: string
  avatarUrl?: string | null
  nav: { label: string; tab: string; icon: React.ComponentType<{ className?: string }> }[]
  currentTab: string
  hasSubView: boolean
  onNav: (tab: string) => void
  onHome: () => void
  onProfile: () => void
  onLogout: () => void
}

function SidebarContent({ userName, userRole, avatarUrl, nav, currentTab, hasSubView, onNav, onHome, onProfile, onLogout }: SidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-sidebar-border p-4">
        <button onClick={onHome} className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Sprout className="h-5 w-5" /></span>
          <div className="leading-none text-left">
            <div className="text-base font-bold text-sidebar-foreground">GoviSahana</div>
            <div className="text-[10px] text-sidebar-foreground/60">Dashboard</div>
          </div>
        </button>
      </div>

      <div className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10"><AvatarImage src={avatarUrl || undefined} /><AvatarFallback className="bg-primary/10 text-sm text-primary">{userName.split(' ').map((s) => s[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold text-sidebar-foreground">{userName}</div>
            <div className="mt-0.5"><RoleBadge role={userRole} /></div>
          </div>
        </div>
      </div>

      <nav className="gs-scroll flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map((item) => (
          <button
            key={item.tab}
            onClick={() => onNav(item.tab)}
            className={cn(
              'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              currentTab === item.tab && !hasSubView ? 'bg-sidebar-primary text-sidebar-primary-foreground' : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
            )}
          >
            <item.icon className="h-4 w-4" /> {item.label}
          </button>
        ))}
      </nav>

      <div className="space-y-1 border-t border-sidebar-border p-3">
        <button onClick={onProfile} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
          <Settings className="h-4 w-4" /> Profile & Settings
        </button>
        <button onClick={onLogout} className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>
    </div>
  )
}

export default function DashboardShell() {
  const { user, setView, logout } = useAppStore()
  const dash = useDashboard()

  if (!user) return null

  const nav = NAV_BY_ROLE[user.role] || []

  const renderDashboard = () => {
    switch (user.role) {
      case 'FARMER': return <FarmerDashboard dash={dash} />
      case 'EXPERT': return <ExpertDashboard dash={dash} />
      case 'ENTERPRISE': return <EnterpriseDashboard dash={dash} />
      case 'WORKER': return <WorkerDashboard dash={dash} />
      case 'BUYER': return <BuyerDashboard dash={dash} />
      case 'ADMIN': return <AdminDashboard dash={dash} />
      default: return null
    }
  }

  const sidebarProps: SidebarProps = {
    userName: user.name, userRole: user.role, avatarUrl: user.avatarUrl,
    nav, currentTab: dash.tab, hasSubView: !!dash.subView,
    onNav: (t) => { dash.setTab(t); dash.closeSubView() },
    onHome: () => setView('home'),
    onProfile: () => setView('onboarding'),
    onLogout: () => logout(),
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] bg-background">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-border bg-sidebar lg:block">
        <SidebarContent {...sidebarProps} />
      </aside>

      <div className="flex flex-1 flex-col">
        {/* Mobile top bar */}
        <div className="flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-2 lg:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9"><Menu className="h-5 w-5" /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SidebarContent {...sidebarProps} />
            </SheetContent>
          </Sheet>
          <span className="text-sm font-semibold">{nav.find((n) => n.tab === dash.tab)?.label || 'Dashboard'}</span>
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setView('home')}><Bell className="h-4 w-4" /></Button>
        </div>
        <main className="flex-1 p-4 sm:p-6">
          {renderDashboard()}
        </main>
      </div>
    </div>
  )
}
