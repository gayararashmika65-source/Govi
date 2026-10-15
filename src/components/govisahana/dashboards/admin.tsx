'use client'
import { useEffect, useState } from 'react'
import { api, useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Users, ShieldCheck, Store, Flag, ScrollText, CheckCircle2, XCircle, Loader2, FileText, Inbox } from 'lucide-react'
import { StatCard, EmptyState, formatDate, timeAgo, SectionHeader } from '@/components/govisahana/common'
import { RoleBadge, StatusBadge, VerifiedBadge } from '@/components/govisahana/badges'
import { toast } from 'sonner'
import type { DashboardState } from './shell'

export default function AdminDashboard({ dash }: { dash: DashboardState }) {
  if (dash.tab === 'verify-experts') return <VerifyExpertsView />
  if (dash.tab === 'verify-enterprises') return <VerifyEnterprisesView />
  if (dash.tab === 'users') return <UsersView />
  if (dash.tab === 'reports') return <ReportsView />
  if (dash.tab === 'audit') return <AuditView />
  return <OverviewView dash={dash} />
}

function OverviewView({ dash }: { dash: DashboardState }) {
  const [stats, setStats] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch('/api/admin/stats', { credentials: 'include' }).then((r) => r.json()).then((d) => { setStats(d.stats || {}); setLoading(false) }).catch(() => setLoading(false)) }, [])
  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Platform Overview</h1><p className="text-sm text-muted-foreground">GoviSahana administration dashboard.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total users" value={stats.totalUsers || 0} icon={<Users className="h-4 w-4" />} tone="blue" />
        <StatCard label="Farmers" value={stats.farmers || 0} icon={<Users className="h-4 w-4" />} tone="green" />
        <StatCard label="Experts" value={stats.experts || 0} icon={<ShieldCheck className="h-4 w-4" />} tone="green" />
        <StatCard label="Enterprises" value={stats.enterprises || 0} icon={<Store className="h-4 w-4" />} tone="amber" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total cases" value={stats.totalCases || 0} icon={<Inbox className="h-4 w-4" />} tone="blue" />
        <StatCard label="Open cases" value={stats.openCases || 0} icon={<Inbox className="h-4 w-4" />} tone="amber" />
        <StatCard label="Resolved" value={stats.resolvedCases || 0} icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
        <StatCard label="Pending verifications" value={stats.pendingExpertVerifs || 0} icon={<FileText className="h-4 w-4" />} tone="amber" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Verified experts" value={stats.verifiedExperts || 0} icon={<ShieldCheck className="h-4 w-4" />} tone="green" />
        <StatCard label="Verified enterprises" value={stats.verifiedEnterprises || 0} icon={<Store className="h-4 w-4" />} tone="green" />
        <StatCard label="Knowledge articles" value={stats.totalArticles || 0} icon={<ScrollText className="h-4 w-4" />} tone="blue" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-amber-200"><CardContent className="flex items-center justify-between p-5">
          <div><div className="text-sm text-muted-foreground">Pending expert verifications</div><div className="text-2xl font-bold text-amber-700">{stats.pendingExpertVerifs || 0}</div></div>
          <Button onClick={() => dash.setTab('verify-experts')}>Review</Button>
        </CardContent></Card>
        <Card><CardContent className="flex items-center justify-between p-5">
          <div><div className="text-sm text-muted-foreground">Manage users</div><div className="text-2xl font-bold">{stats.totalUsers || 0}</div></div>
          <Button variant="outline" onClick={() => dash.setTab('users')}>Manage</Button>
        </CardContent></Card>
      </div>
    </div>
  )
}

function VerifyExpertsView() {
  const [pending, setPending] = useState<any[]>([])
  const [experts, setExperts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    fetch('/api/admin/users?role=EXPERT', { credentials: 'include' }).then((r) => r.json()).then((d) => {
      const all = d.users || []
      const pendingVerifs: any[] = []
      all.forEach((u: any) => { (u.expertProfile?.verifications || []).forEach((v: any) => pendingVerifs.push({ ...v, expert: u.expertProfile, user: u })) })
      setPending(pendingVerifs)
      setExperts(all)
      setLoading(false)
    }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const review = async (verificationId: string, action: 'APPROVE' | 'REJECT') => {
    try {
      await api('/api/admin/verify', { method: 'POST', body: JSON.stringify({ type: 'EXPERT', id: verificationId, action }) })
      toast.success(`Verification ${action.toLowerCase()}`)
      load()
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="space-y-5">
      <SectionHeader title="Verify Agricultural Experts" description="Review qualification documents submitted by experts." />
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
        pending.length === 0 ? <EmptyState icon={<ShieldCheck className="h-5 w-5" />} title="No pending verifications" description="All expert verifications have been reviewed." /> :
        <div className="grid gap-3">{pending.map((v) => (
          <Card key={v.id}><CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-11 w-11"><AvatarImage src={v.user.avatarUrl || undefined} /><AvatarFallback className="bg-primary/10 text-primary text-xs">{v.user.name.split(' ').map((s: string) => s[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="font-medium">{v.user.name}</span><StatusBadge status={v.status} /></div>
                <p className="text-xs text-muted-foreground">{v.expert.title || 'Expert'} · {v.expert.expertise}</p>
                {v.note && <p className="mt-1 text-sm text-muted-foreground">Note: {v.note}</p>}
                <a href={v.documentPath} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"><FileText className="h-4 w-4" /> View document</a>
              </div>
            </div>
            {v.status === 'PENDING' && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => review(v.id, 'APPROVE')}><CheckCircle2 className="mr-2 h-4 w-4" /> Approve</Button>
                <Button size="sm" variant="outline" className="text-rose-600" onClick={() => review(v.id, 'REJECT')}><XCircle className="mr-2 h-4 w-4" /> Reject</Button>
              </div>
            )}
          </CardContent></Card>
        ))}</div>}

      <div className="mt-8">
        <h3 className="mb-3 text-sm font-semibold text-muted-foreground">All experts ({experts.length})</h3>
        <div className="grid gap-2">{experts.map((u: any) => (
          <div key={u.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <Avatar className="h-8 w-8"><AvatarImage src={u.avatarUrl || undefined} /><AvatarFallback className="bg-muted text-xs">{u.name.split(' ').map((s: string) => s[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{u.name}</div><div className="text-xs text-muted-foreground">{u.email}</div></div>
            <VerifiedBadge verified={!!u.expertProfile?.verified} />
          </div>
        ))}</div>
      </div>
    </div>
  )
}

function VerifyEnterprisesView() {
  const [enterprises, setEnterprises] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = () => { fetch('/api/admin/users?role=ENTERPRISE', { credentials: 'include' }).then((r) => r.json()).then((d) => { setEnterprises(d.users || []); setLoading(false) }).catch(() => setLoading(false)) }
  useEffect(() => { load() }, [])
  const review = async (id: string, action: 'APPROVE' | 'REJECT') => {
    try { await api('/api/admin/verify', { method: 'POST', body: JSON.stringify({ type: 'ENTERPRISE', id, action }) }); toast.success(`Business ${action.toLowerCase()}`); load() } catch (e) { toast.error((e as Error).message) }
  }
  return (
    <div className="space-y-5">
      <SectionHeader title="Verify Agricultural Enterprises" description="Approve or reject business verification." />
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
        enterprises.length === 0 ? <EmptyState icon={<Store className="h-5 w-5" />} title="No enterprises registered" /> :
        <div className="grid gap-3">{enterprises.map((u: any) => {
          const ep = u.enterpriseProfile || {}
          return (
            <Card key={u.id}><CardContent className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="font-medium">{ep.businessName || u.name}</span><VerifiedBadge verified={!!ep.verified} /></div>
                  <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                    <span>{ep.businessType || '—'}</span>
                    {ep.district && <span>{ep.district}</span>}
                    {ep.registrationNo && <span>Reg: {ep.registrationNo}</span>}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{u.email}</div>
                </div>
                <Button size="sm" variant="outline" onClick={() => review(ep.id, ep.verified ? 'REJECT' : 'APPROVE')}>{ep.verified ? 'Revoke' : 'Verify'}</Button>
              </div>
            </CardContent></Card>
          )
        })}</div>}
    </div>
  )
}

function UsersView() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [role, setRole] = useState('all')
  const load = (r: string) => { fetch(`/api/admin/users${r !== 'all' ? `?role=${r}` : ''}`, { credentials: 'include' }).then((res) => res.json()).then((d) => { setUsers(d.users || []); setLoading(false) }).catch(() => setLoading(false)) }
  useEffect(() => { load('all') }, [])
  const toggleStatus = async (u: any) => {
    const next = u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
    try { await api(`/api/admin/users/${u.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) }); toast.success(`User ${next.toLowerCase()}`); load(role) } catch (e) { toast.error((e as Error).message) }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionHeader title="Manage Users" description="View and manage all platform users." />
        <Select value={role} onValueChange={(v) => { setRole(v); load(v) }}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>{['all', 'FARMER', 'EXPERT', 'ENTERPRISE', 'WORKER', 'BUYER', 'ADMIN'].map((r) => <SelectItem key={r} value={r}>{r === 'all' ? 'All roles' : r.charAt(0) + r.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
        <div className="grid gap-2">{users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
            <Avatar className="h-9 w-9"><AvatarImage src={u.avatarUrl || undefined} /><AvatarFallback className="bg-muted text-xs">{u.name.split(' ').map((s: string) => s[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2"><span className="truncate text-sm font-medium">{u.name}</span><RoleBadge role={u.role} /><StatusBadge status={u.status} /></div>
              <div className="text-xs text-muted-foreground">{u.email} · joined {formatDate(u.createdAt)}</div>
            </div>
            {u.role !== 'ADMIN' && <Button size="sm" variant="outline" className={u.status === 'ACTIVE' ? 'text-rose-600' : 'text-emerald-600'} onClick={() => toggleStatus(u)}>{u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}</Button>}
          </div>
        ))}</div>}
    </div>
  )
}

function ReportsView() {
  const [reports, setReports] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const load = () => { fetch('/api/admin/reports', { credentials: 'include' }).then((r) => r.json()).then((d) => { setReports(d.reports || []); setLoading(false) }).catch(() => setLoading(false)) }
  useEffect(() => { load() }, [])
  const update = async (id: string, status: string) => { try { await api('/api/admin/reports', { method: 'PATCH', body: JSON.stringify({ id, status }) }); toast.success('Report updated'); load() } catch (e) { toast.error((e as Error).message) } }
  return (
    <div className="space-y-5">
      <SectionHeader title="Reported Content" description="Moderate reports filed by users." />
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
        reports.length === 0 ? <EmptyState icon={<Flag className="h-5 w-5" />} title="No reports" description="Reported content will appear here." /> :
        <div className="grid gap-3">{reports.map((r) => (
          <Card key={r.id}><CardContent className="p-4">
            <div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="font-medium">{r.targetType}</span><StatusBadge status={r.status} /></div><span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{r.reason}</p>
            <div className="mt-1 text-xs text-muted-foreground">Reported by {r.reporter?.name || 'unknown'}</div>
            {r.status === 'OPEN' && <div className="mt-2 flex gap-2"><Button size="sm" variant="outline" onClick={() => update(r.id, 'REVIEWING')}>Mark reviewing</Button><Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => update(r.id, 'RESOLVED')}>Resolve</Button></div>}
          </CardContent></Card>
        ))}</div>}
    </div>
  )
}

function AuditView() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch('/api/admin/audit', { credentials: 'include' }).then((r) => r.json()).then((d) => { setLogs(d.logs || []); setLoading(false) }).catch(() => setLoading(false)) }, [])
  return (
    <div className="space-y-5">
      <SectionHeader title="Audit Logs" description="A record of sensitive administrative actions." />
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
        logs.length === 0 ? <EmptyState icon={<ScrollText className="h-5 w-5" />} title="No audit logs" /> :
        <Card><CardContent className="p-0">
          <div className="gs-scroll max-h-[70vh] overflow-y-auto divide-y">
            {logs.map((l) => (
              <div key={l.id} className="flex items-start gap-3 p-3">
                <span className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><ScrollText className="h-3.5 w-3.5" /></span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="text-sm font-medium">{l.action}</span><span className="text-xs text-muted-foreground">{timeAgo(l.createdAt)}</span></div>
                  <div className="text-xs text-muted-foreground">by {l.actor?.name || 'system'} · {l.detail || ''}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent></Card>}
    </div>
  )
}
