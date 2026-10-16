'use client'
import { useEffect, useState } from 'react'
import { api, useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Inbox, Stethoscope, MessageSquare, ClipboardList, CheckCircle2, Sprout, Tag, Clock, Users, Loader2 } from 'lucide-react'
import { StatCard, EmptyState, timeAgo, SectionHeader } from '@/components/govisahana/common'
import { StatusBadge, VerifiedBadge } from '@/components/govisahana/badges'
import { CaseDetailPanel } from './case-detail'
import { MessagingPanel } from '@/components/govisahana/shared/messaging-panel'
import { toast } from 'sonner'
import type { DashboardState } from './shell'

type Case = { id: string; title: string; crop: string; category: string; status: string; district?: string | null; createdAt: string; farmer: { id: string; name: string }; expert?: { id: string; name: string } | null; attachments: any[] }
type Consultation = { id: string; status: string; type: string; agriCase: { id: string; title: string; crop: string }; farmer: { id: string; name: string; avatarUrl?: string | null }; expert: { id: string; name: string } }

export default function ExpertDashboard({ dash }: { dash: DashboardState }) {
  const { user } = useApp()

  if (dash.subView?.type === 'case-detail') return <CaseDetailPanel caseId={dash.subView.id!} onBack={dash.closeSubView} isExpert />
  if (dash.subView?.type === 'messaging') return <MessagingPanel consultationId={dash.subView.id!} onBack={dash.closeSubView} />

  if (dash.tab === 'queue') return <QueueView onOpen={(id) => dash.openSubView('case-detail', id)} />
  if (dash.tab === 'consultations') return <ConsultationsView onOpen={(id) => dash.openSubView('messaging', id)} />
  if (dash.tab === 'messages') return <ConsultationsView onOpen={(id) => dash.openSubView('messaging', id)} />
  if (dash.tab === 'recs') return <RecommendationsView onOpen={(id) => dash.openSubView('case-detail', id)} />

  return <OverviewView dash={dash} />
}

function OverviewView({ dash }: { dash: DashboardState }) {
  const { user } = useApp()
  const [stats, setStats] = useState({ openCases: 0, myCases: 0, consultations: 0, resolved: 0 })
  const [recent, setRecent] = useState<Case[]>([])

  useEffect(() => {
    fetch('/api/cases', { credentials: 'include' }).then((r) => r.json()).then((d) => {
      const cases = d.cases || []
      setStats((s) => ({
        ...s,
        openCases: cases.filter((c: Case) => c?.status && ['OPEN', 'UNDER_REVIEW'].includes(c.status)).length,
        myCases: cases.filter((c: Case) => c.expert?.id === user?.id).length,
        resolved: cases.filter((c: Case) => c?.status === 'RESOLVED' && c.expert?.id === user?.id).length,
      }))
      setRecent(cases.slice(0, 5))
    }).catch(() => {})
    fetch('/api/consultations', { credentials: 'include' }).then((r) => r.json()).then((d) => setStats((s) => ({ ...s, consultations: (d.consultations || []).length }))).catch(() => {})
  }, [user])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Welcome, {user?.name.split(' ')[0]}</h1>
        <p className="text-sm text-muted-foreground">Help Sri Lankan farmers solve their agricultural problems.</p>
      </div>

      {!user?.profileComplete && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-center gap-2 text-sm text-amber-900"><ClipboardList className="h-4 w-4" /> Complete your expert profile and submit verification to receive a verified badge.</div>
          <Button size="sm" variant="outline" onClick={() => dash.setTab('overview')} className="shrink-0">Go to profile</Button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open cases" value={stats.openCases} icon={<Inbox className="h-4 w-4" />} tone="amber" />
        <StatCard label="My cases" value={stats.myCases} icon={<Stethoscope className="h-4 w-4" />} tone="green" />
        <StatCard label="Consultations" value={stats.consultations} icon={<MessageSquare className="h-4 w-4" />} tone="blue" />
        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent cases</CardTitle>
          <Button size="sm" variant="outline" onClick={() => dash.setTab('queue')}>View queue</Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {recent.length === 0 ? <EmptyState icon={<Inbox className="h-5 w-5" />} title="No cases yet" description="Open cases from farmers will appear here." /> :
            recent.map((c) => (
              <button key={c.id} onClick={() => dash.openSubView('case-detail', c.id)} className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted/50">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Sprout className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{c.title}</div><div className="text-xs text-muted-foreground">{c.crop} · {c.farmer?.name || 'Farmer'} · {timeAgo(c.createdAt)}</div></div>
                <StatusBadge status={c.status} />
              </button>
            ))}
        </CardContent>
      </Card>
    </div>
  )
}

function QueueView({ onOpen }: { onOpen: (id: string) => void }) {
  const { user } = useApp()
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')

  const load = () => {
    fetch('/api/cases', { credentials: 'include' }).then((r) => r.json()).then((d) => { setCases(d.cases || []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  const filtered = filter === 'open' ? cases.filter((c) => c?.status && ['OPEN', 'UNDER_REVIEW'].includes(c.status)) : filter === 'mine' ? cases.filter((c) => c.expert?.id === user?.id) : cases

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Case Queue</h1><p className="text-sm text-muted-foreground">Review agricultural cases and accept those you can help with.</p></div>
      <div className="flex gap-1.5">
        {[{ k: 'open', l: 'Open' }, { k: 'mine', l: 'Assigned to me' }, { k: 'all', l: 'All' }].map((f) => (
          <button key={f.k} onClick={() => setFilter(f.k)} className={`rounded-lg px-3 py-1.5 text-xs font-medium ${filter === f.k ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>{f.l}</button>
        ))}
      </div>
      {loading ? <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted/40" />)}</div> :
        filtered.length === 0 ? <EmptyState icon={<Inbox className="h-5 w-5" />} title="No cases" description="New cases from farmers will appear here." /> :
        <div className="grid gap-3">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => onOpen(c.id)} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:shadow-md">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Sprout className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="truncate font-medium">{c.title}</span><StatusBadge status={c.status} /></div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Sprout className="h-3 w-3" /> {c.crop}</span>
                  <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {c.category}</span>
                  <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {c.farmer?.name || 'Farmer'}</span>
                  {(c.attachments?.length ?? 0) > 0 && <span>· {c.attachments?.length} photo(s)</span>}
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(c.createdAt)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>}
    </div>
  )
}

function ConsultationsView({ onOpen }: { onOpen: (id: string) => void }) {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/consultations', { credentials: 'include' }).then((r) => r.json()).then((d) => { setConsultations(d.consultations || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  const update = async (id: string, status: string) => {
    try {
      await api(`/api/consultations/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      toast.success(`Consultation ${status.toLowerCase()}`)
      setConsultations((cs) => cs.map((c) => (c.id === id ? { ...c, status } : c)))
    } catch (e) { toast.error((e as Error).message) }
  }

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Consultations</h1><p className="text-sm text-muted-foreground">Accept or decline consultation requests and message farmers.</p></div>
      {loading ? <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-muted/40" />)}</div> :
        consultations.length === 0 ? <EmptyState icon={<MessageSquare className="h-5 w-5" />} title="No consultations yet" description="When farmers request consultations, they will appear here." /> :
        <div className="grid gap-3">
          {consultations.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={c.farmer?.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {(c.farmer?.name || 'Farmer').split(' ').filter(Boolean).map((s) => s[0]).slice(0, 2).join('').toUpperCase() || 'F'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{c.farmer?.name || 'Farmer'}</span>
                      <StatusBadge status={c.status} />
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      Re: {c.agriCase?.title || 'Agricultural Case'} · {c.type || 'CHAT'}
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => onOpen(c.id)}><MessageSquare className="mr-2 h-4 w-4" /> Message</Button>
                  {c.status === 'REQUESTED' && (
                    <>
                      <Button size="sm" variant="outline" className="text-emerald-700" onClick={() => update(c.id, 'ACCEPTED')}><CheckCircle2 className="mr-2 h-4 w-4" /> Accept</Button>
                      <Button size="sm" variant="ghost" className="text-rose-600" onClick={() => update(c.id, 'DECLINED')}>Decline</Button>
                    </>
                  )}
                  {c.status === 'ACCEPTED' && <Button size="sm" variant="outline" onClick={() => update(c.id, 'COMPLETED')}>Mark completed</Button>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>}
    </div>
  )
}

function RecommendationsView({ onOpen }: { onOpen: (id: string) => void }) {
  const [recs, setRecs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/experts?verified=false', { credentials: 'include' }).catch(() => {})
    // Use cases to find ones with recommendations
    fetch('/api/cases', { credentials: 'include' }).then((r) => r.json()).then((d) => {
      const casesWithRecs = (d.cases || []).filter((c: any) => c.status === 'RESOLVED' || c.expertId)
      setRecs(casesWithRecs)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-5">
      <SectionHeader title="My recommendations" description="Cases you have provided recommendations for." />
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
        recs.length === 0 ? <EmptyState icon={<ClipboardList className="h-5 w-5" />} title="No recommendations yet" description="Accept a case and submit your advice to build your track record." /> :
        <div className="grid gap-3">{recs.map((c) => (
          <button key={c.id} onClick={() => onOpen(c.id)} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:shadow-md">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><CheckCircle2 className="h-5 w-5" /></span>
            <div className="min-w-0 flex-1"><div className="truncate font-medium">{c.title}</div><div className="text-xs text-muted-foreground">{c.crop} · {c.farmer?.name || 'Farmer'}</div></div>
            <StatusBadge status={c.status} />
          </button>
        ))}</div>}
    </div>
  )
}
