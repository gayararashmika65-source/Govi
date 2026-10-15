'use client'
import { useEffect, useState } from 'react'
import { api, useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Plus, Stethoscope, Wheat, MessageSquare, Search, Sprout, Tag, MapPin, Clock, CheckCircle2, Loader2, Inbox } from 'lucide-react'
import { StatCard, EmptyState, formatDate, money, timeAgo, SectionHeader } from '@/components/govisahana/common'
import { StatusBadge, VerifiedBadge } from '@/components/govisahana/badges'
import { ImageUpload } from '@/components/govisahana/shared/image-upload'
import { CaseDetailPanel } from './case-detail'
import { MessagingPanel } from '@/components/govisahana/shared/messaging-panel'
import { toast } from 'sonner'
import { CASE_CATEGORIES, COMMON_CROPS, SRI_LANKAN_DISTRICTS } from '@/lib/types'
import type { DashboardState } from './shell'

type Case = { id: string; title: string; crop: string; category: string; status: string; createdAt: string; expert?: { id: string; name: string } | null; farmer: { id: string; name: string }; attachments: any[] }
type Consultation = { id: string; status: string; type: string; agriCase: { id: string; title: string; crop: string }; farmer: { id: string; name: string; avatarUrl?: string | null }; expert: { id: string; name: string; avatarUrl?: string | null } }
type Crop = { id: string; cropName: string; variety?: string | null; quantity: number; unit: string; askingPrice?: number | null; grade?: string | null; district?: string | null; available: boolean }
type Expert = { id: string; title?: string; expertise?: string; bio?: string; rating?: number; serviceAreas?: string; verified: boolean; hourlyRate?: number; user: { id: string; name: string; avatarUrl?: string | null } }

export default function FarmerDashboard({ dash }: { dash: DashboardState }) {
  const { user } = useApp()

  // Sub-views
  if (dash.subView?.type === 'case-detail') return <CaseDetailPanel caseId={dash.subView.id!} onBack={dash.closeSubView} dash={dash} />
  if (dash.subView?.type === 'messaging') return <MessagingPanel consultationId={dash.subView.id!} onBack={dash.closeSubView} />

  if (dash.tab === 'create') return <CreateCaseView onCreated={(id) => dash.openSubView('case-detail', id)} onBack={() => dash.setTab('cases')} />

  if (dash.tab === 'cases') return <CasesView farmerId={user!.id} onOpen={(id) => dash.openSubView('case-detail', id)} onCreate={() => dash.setTab('create')} />
  if (dash.tab === 'experts') return <FindExpertsView onBack={() => dash.setTab('overview')} />
  if (dash.tab === 'crops') return <CropsView />
  if (dash.tab === 'messages') return <MessagesView onOpen={(id) => dash.openSubView('messaging', id)} />

  return <OverviewView dash={dash} />
}

function OverviewView({ dash }: { dash: DashboardState }) {
  const { user, setView } = useApp()
  const [stats, setStats] = useState({ cases: 0, open: 0, resolved: 0, crops: 0, consultations: 0 })
  const [recent, setRecent] = useState<Case[]>([])

  useEffect(() => {
    fetch('/api/cases', { credentials: 'include' }).then((r) => r.json()).then((d) => {
      const cases = d.cases || []
      setStats((s) => ({ ...s, cases: cases.length, open: cases.filter((c: Case) => ['OPEN', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS'].includes(c.status)).length, resolved: cases.filter((c: Case) => c.status === 'RESOLVED').length }))
      setRecent(cases.slice(0, 4))
    }).catch(() => {})
    fetch('/api/my', { credentials: 'include' }).then((r) => r.json()).then((d) => {
      setStats((s) => ({ ...s, crops: (d.listings?.crops || []).length }))
    }).catch(() => {})
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ayubowan, {user?.name.split(' ')[0]} 👋</h1>
        <p className="text-sm text-muted-foreground">Here&apos;s an overview of your farming activity on GoviSahana.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total cases" value={stats.cases} icon={<Stethoscope className="h-4 w-4" />} tone="green" />
        <StatCard label="Open cases" value={stats.open} icon={<Inbox className="h-4 w-4" />} tone="amber" />
        <StatCard label="Resolved" value={stats.resolved} icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
        <StatCard label="Crop listings" value={stats.crops} icon={<Wheat className="h-4 w-4" />} tone="blue" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent cases</CardTitle>
            <Button size="sm" variant="outline" onClick={() => dash.setTab('cases')}>View all</Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {recent.length === 0 ? (
              <EmptyState icon={<Stethoscope className="h-5 w-5" />} title="No cases yet" description="Report a crop problem to get expert advice." action={<Button onClick={() => dash.setTab('create')}><Plus className="mr-2 h-4 w-4" /> Report a problem</Button>} />
            ) : recent.map((c) => (
              <button key={c.id} onClick={() => dash.openSubView('case-detail', c.id)} className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left hover:bg-muted/50">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary"><Sprout className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{c.title}</div>
                  <div className="text-xs text-muted-foreground">{c.crop} · {timeAgo(c.createdAt)}</div>
                </div>
                <StatusBadge status={c.status} />
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Quick actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button className="w-full justify-start" onClick={() => dash.setTab('create')}><Plus className="mr-2 h-4 w-4" /> Report a crop problem</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => dash.setTab('experts')}><Search className="mr-2 h-4 w-4" /> Find an expert</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => dash.setTab('crops')}><Wheat className="mr-2 h-4 w-4" /> List a crop for sale</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => setView('marketplace')}><Tag className="mr-2 h-4 w-4" /> Buy agri products</Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CasesView({ farmerId, onOpen, onCreate }: { farmerId: string; onOpen: (id: string) => void; onCreate: () => void }) {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetch('/api/cases', { credentials: 'include' }).then((r) => r.json()).then((d) => { setCases(d.cases || []); setLoading(false) }).catch(() => setLoading(false))
  }, [farmerId])

  const filtered = filter === 'all' ? cases : cases.filter((c) => c.status === filter)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">My Cases</h1><p className="text-sm text-muted-foreground">Track all your agricultural problems and expert advice.</p></div>
        <Button onClick={onCreate}><Plus className="mr-2 h-4 w-4" /> Report a problem</Button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {['all', 'OPEN', 'UNDER_REVIEW', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((f) => (
          <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1.5 text-xs font-medium capitalize ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-muted/70'}`}>
            {f === 'all' ? 'All' : f.replace(/_/g, ' ').toLowerCase()}
          </button>
        ))}
      </div>
      {loading ? <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted/40" />)}</div> :
        filtered.length === 0 ? <EmptyState icon={<Stethoscope className="h-5 w-5" />} title="No cases here" description="Report a crop problem to get expert advice." action={<Button onClick={onCreate}><Plus className="mr-2 h-4 w-4" /> Report a problem</Button>} /> :
        <div className="grid gap-3">
          {filtered.map((c) => (
            <button key={c.id} onClick={() => onOpen(c.id)} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-shadow hover:shadow-md">
              <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary"><Sprout className="h-5 w-5" /></span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{c.title}</span>
                  <StatusBadge status={c.status} />
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Sprout className="h-3 w-3" /> {c.crop}</span>
                  <span className="flex items-center gap-1"><Tag className="h-3 w-3" /> {c.category}</span>
                  {c.expert && <span>· Expert: {c.expert.name}</span>}
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(c.createdAt)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>}
    </div>
  )
}

function CreateCaseView({ onCreated, onBack }: { onCreated: (id: string) => void; onBack: () => void }) {
  const [form, setForm] = useState({ crop: '', category: '', title: '', description: '', district: '' })
  const [attachments, setAttachments] = useState<string[]>([])
  const [expertId, setExpertId] = useState('')
  const [experts, setExperts] = useState<Expert[]>([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    fetch('/api/experts?verified=true').then((r) => r.json()).then((d) => setExperts(d.experts || [])).catch(() => {})
  }, [])

  const addAttachment = (url: string) => { if (url) setAttachments((a) => [...a, url]) }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.crop || !form.category || !form.title || !form.description) { toast.error('Please complete all required fields'); return }
    setSubmitting(true)
    try {
      const data = await api<{ case: { id: string } }>('/api/cases', { method: 'POST', body: JSON.stringify({ ...form, attachments, expertId: expertId || undefined }) })
      toast.success('Case submitted! Experts have been notified.')
      onCreated(data.case.id)
    } catch (e) { toast.error((e as Error).message) } finally { setSubmitting(false) }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
      <div><h1 className="text-2xl font-bold">Report a crop problem</h1><p className="text-sm text-muted-foreground">Describe the issue clearly and add photos so experts can diagnose accurately.</p></div>

      <form onSubmit={submit} className="space-y-4">
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Crop *</Label>
                <Select value={form.crop} onValueChange={(v) => setForm((f) => ({ ...f, crop: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger>
                  <SelectContent>{COMMON_CROPS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Problem category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>{CASE_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2"><Label>Title *</Label><Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Yellowing patches in paddy field" required /></div>
            <div className="space-y-2"><Label>Description *</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe the symptoms, when they started, affected area, weather, and any treatments already tried." rows={5} required /></div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Your district</Label>
                <Select value={form.district} onValueChange={(v) => setForm((f) => ({ ...f, district: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger>
                  <SelectContent>{SRI_LANKAN_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Request a specific expert (optional)</Label>
                <Select value={expertId} onValueChange={setExpertId}>
                  <SelectTrigger><SelectValue placeholder="Let experts find me" /></SelectTrigger>
                  <SelectContent>
                    {experts.map((e) => <SelectItem key={e.user.id} value={e.user.id}>{e.user.name} {e.verified ? '✓' : ''}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Photographs</CardTitle></CardHeader>
          <CardContent>
            {attachments.length > 0 && (
              <div className="mb-3 grid grid-cols-3 gap-2">
                {attachments.map((a, i) => (
                  <div key={i} className="relative">
                    <img src={a} alt="" className="h-24 w-full rounded-lg border border-border object-cover" />
                    <button type="button" onClick={() => setAttachments((arr) => arr.filter((_, idx) => idx !== i))} className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white text-xs">×</button>
                  </div>
                ))}
              </div>
            )}
            <ImageUpload value="" onChange={addAttachment} label="Add a photograph" />
            <p className="mt-2 text-xs text-muted-foreground">Clear close-up photos of affected leaves/stems help experts diagnose accurately.</p>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBack}>Cancel</Button>
          <Button type="submit" disabled={submitting} className="bg-primary hover:bg-primary/90">{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />} Submit case</Button>
        </div>
      </form>
    </div>
  )
}

function FindExpertsView({ onBack }: { onBack: () => void }) {
  const { openDetail } = useApp()
  const [experts, setExperts] = useState<Expert[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  useEffect(() => {
    fetch(`/api/experts?verified=true${q ? `&q=${encodeURIComponent(q)}` : ''}`, { credentials: 'include' }).then((r) => r.json()).then((d) => { setExperts(d.experts || []); setLoading(false) }).catch(() => setLoading(false))
  }, [q])

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
      <SectionHeader eyebrow="Verified experts" title="Find an expert to consult" description="Browse verified agricultural professionals and view their profiles." />
      <Input placeholder="Search by name, expertise or crop…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
      {loading ? <div className="grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-muted/40" />)}</div> :
        <div className="grid gap-3 sm:grid-cols-2">
          {experts.map((e) => (
            <button key={e.user.id} onClick={() => openDetail('expert-detail', e.id)} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-shadow hover:shadow-md">
              <Avatar className="h-12 w-12"><AvatarImage src={e.user.avatarUrl || undefined} /><AvatarFallback className="bg-primary/10 text-primary text-xs">{e.user.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="truncate font-medium">{e.user.name}</span><VerifiedBadge verified={e.verified} /></div>
                <p className="truncate text-xs text-muted-foreground">{e.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{e.bio || e.expertise}</p>
              </div>
            </button>
          ))}
        </div>}
    </div>
  )
}

function MessagesView({ onOpen }: { onOpen: (id: string) => void }) {
  const [consultations, setConsultations] = useState<Consultation[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/consultations', { credentials: 'include' }).then((r) => r.json()).then((d) => { setConsultations(d.consultations || []); setLoading(false) }).catch(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Messages</h1><p className="text-sm text-muted-foreground">Your consultations with experts.</p></div>
      {loading ? <div className="space-y-2">{[0, 1].map((i) => <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted/40" />)}</div> :
        consultations.length === 0 ? <EmptyState icon={<MessageSquare className="h-5 w-5" />} title="No messages yet" description="When you request a consultation, your conversations will appear here." /> :
        <div className="grid gap-3">
          {consultations.map((c) => (
            <button key={c.id} onClick={() => onOpen(c.id)} className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left hover:shadow-md">
              <Avatar className="h-11 w-11"><AvatarImage src={c.expert.avatarUrl || undefined} /><AvatarFallback className="bg-primary/10 text-primary text-xs">{c.expert.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><span className="truncate font-medium">{c.expert.name}</span><StatusBadge status={c.status} /></div>
                <div className="text-xs text-muted-foreground">Re: {c.agriCase.title}</div>
              </div>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>}
    </div>
  )
}

function CropsView() {
  const { refreshUser } = useApp()
  const [crops, setCrops] = useState<Crop[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const load = () => {
    fetch('/api/my', { credentials: 'include' }).then((r) => r.json()).then((d) => { setCrops(d.listings?.crops || []); setLoading(false) }).catch(() => setLoading(false))
  }
  useEffect(() => { load() }, [])

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">My Crop Listings</h1><p className="text-sm text-muted-foreground">Publish your harvest for buyers to find.</p></div>
        <Button onClick={() => setShowForm((s) => !s)}><Plus className="mr-2 h-4 w-4" /> {showForm ? 'Cancel' : 'List a crop'}</Button>
      </div>
      {showForm && <CropForm onSaved={() => { setShowForm(false); load(); refreshUser() }} />}
      {loading ? <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl border border-border bg-muted/40" />)}</div> :
        crops.length === 0 ? <EmptyState icon={<Wheat className="h-5 w-5" />} title="No crop listings yet" description="List your harvest to connect with buyers." action={<Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" /> List a crop</Button>} /> :
        <div className="grid gap-3 sm:grid-cols-2">
          {crops.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{c.cropName}{c.variety ? ` · ${c.variety}` : ''}</div>
                    <div className="mt-0.5 text-sm text-muted-foreground">{c.quantity} {c.unit} · {c.grade || 'No grade'}</div>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="h-3 w-3" /> {c.district || '—'} {c.available ? '· Available' : '· Sold'}</div>
                  </div>
                  <div className="text-right"><div className="font-bold text-primary">{money(c.askingPrice)}</div><div className="text-xs text-muted-foreground">per {c.unit}</div></div>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => { fetch(`/api/crops/${c.id}`, { method: 'PATCH', body: JSON.stringify({ available: !c.available }), headers: { 'Content-Type': 'application/json' }, credentials: 'include' }).then(() => load()) }}>{c.available ? 'Mark sold' : 'Reopen'}</Button>
                  <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => { if (confirm('Delete this listing?')) { fetch(`/api/crops/${c.id}`, { method: 'DELETE', credentials: 'include' }).then(() => load()) } }}>Delete</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>}
    </div>
  )
}

function CropForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ cropName: '', variety: '', quantity: '', unit: 'kg', district: '', askingPrice: '', grade: 'A', expectedHarvestDate: '', imageUrl: '' })
  const [submitting, setSubmitting] = useState(false)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cropName || !form.quantity) { toast.error('Crop name and quantity are required'); return }
    setSubmitting(true)
    try {
      await api('/api/crops', { method: 'POST', body: JSON.stringify({ cropName: form.cropName, variety: form.variety || undefined, quantity: Number(form.quantity), unit: form.unit, district: form.district || undefined, askingPrice: form.askingPrice ? Number(form.askingPrice) : undefined, grade: form.grade, expectedHarvestDate: form.expectedHarvestDate || undefined, imageUrl: form.imageUrl || undefined }) })
      toast.success('Crop listed!')
      onSaved()
    } catch (e) { toast.error((e as Error).message) } finally { setSubmitting(false) }
  }

  return (
    <Card><CardContent className="pt-6">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2"><Label>Crop name *</Label><Input value={form.cropName} onChange={(e) => set('cropName', e.target.value)} placeholder="e.g. Rice (Paddy)" required /></div>
          <div className="space-y-2"><Label>Variety</Label><Input value={form.variety} onChange={(e) => set('variety', e.target.value)} placeholder="e.g. BG 352 (Nadu)" /></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2"><Label>Quantity *</Label><Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} required /></div>
          <div className="space-y-2"><Label>Unit</Label><Select value={form.unit} onValueChange={(v) => set('unit', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['kg', 'ton', 'bunch', 'bag', 'piece'].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Grade</Label><Select value={form.grade} onValueChange={(v) => set('grade', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['A', 'B', 'C'].map((g) => <SelectItem key={g} value={g}>{g}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2"><Label>Asking price (Rs/unit)</Label><Input type="number" value={form.askingPrice} onChange={(e) => set('askingPrice', e.target.value)} /></div>
          <div className="space-y-2"><Label>District</Label><Select value={form.district} onValueChange={(v) => set('district', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{SRI_LANKAN_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Expected harvest</Label><Input type="date" value={form.expectedHarvestDate} onChange={(e) => set('expectedHarvestDate', e.target.value)} /></div>
        </div>
        <div className="space-y-2"><Label>Photo</Label><ImageUpload value={form.imageUrl} onChange={(u) => set('imageUrl', u)} /></div>
        <div className="flex justify-end"><Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Publish listing</Button></div>
      </form>
    </CardContent></Card>
  )
}
