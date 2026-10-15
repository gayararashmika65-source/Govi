'use client'
import { useEffect, useState } from 'react'
import { api, useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Briefcase, Send, Wrench, Plus, MapPin, Loader2, CheckCircle2 } from 'lucide-react'
import { StatCard, EmptyState, money, formatDate, timeAgo } from '@/components/govisahana/common'
import { StatusBadge } from '@/components/govisahana/badges'
import { ImageUpload } from '@/components/govisahana/shared/image-upload'
import { toast } from 'sonner'
import { SRI_LANKAN_DISTRICTS } from '@/lib/types'
import type { DashboardState } from './shell'

type JobApp = { id: string; status: string; coverNote?: string | null; createdAt: string; job: { id: string; title: string; location?: string | null; wage?: number | null; status: string } }
type Service = { id: string; title: string; description?: string | null; category?: string | null; price?: number | null; district?: string | null; available: boolean }
type Job = { id: string; title: string; description?: string | null; requiredSkills?: string | null; location?: string | null; startDate?: string | null; endDate?: string | null; paymentTerms?: string | null; wage?: number | null; status: string; _count?: { applications: number } }

export default function WorkerDashboard({ dash }: { dash: DashboardState }) {
  if (dash.tab === 'jobs') return <JobsView />
  if (dash.tab === 'applications') return <ApplicationsView />
  if (dash.tab === 'services') return <ServicesView />
  return <OverviewView dash={dash} />
}

function OverviewView({ dash }: { dash: DashboardState }) {
  const { user } = useApp()
  const [counts, setCounts] = useState({ applications: 0, services: 0 })
  useEffect(() => { fetch('/api/my', { credentials: 'include' }).then((r) => r.json()).then((d) => setCounts({ applications: (d.listings?.jobApplications || []).length, services: (d.listings?.services || []).length })).catch(() => {}) }, [])
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Welcome, {user?.name.split(' ')[0]}</h1><p className="text-sm text-muted-foreground">Find agricultural jobs and offer your services.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Applications" value={counts.applications} icon={<Send className="h-4 w-4" />} tone="amber" />
        <StatCard label="Services listed" value={counts.services} icon={<Wrench className="h-4 w-4" />} tone="green" />
        <StatCard label="Account" value={user?.status === 'ACTIVE' ? 'Active' : 'Pending'} icon={<CheckCircle2 className="h-4 w-4" />} tone="blue" />
      </div>
      <Card><CardHeader><CardTitle className="text-base">Quick actions</CardTitle></CardHeader><CardContent className="space-y-2">
        <Button className="w-full justify-start" onClick={() => dash.setTab('jobs')}><Briefcase className="mr-2 h-4 w-4" /> Browse jobs</Button>
        <Button variant="outline" className="w-full justify-start" onClick={() => dash.setTab('services')}><Plus className="mr-2 h-4 w-4" /> Offer a service</Button>
      </CardContent></Card>
    </div>
  )
}

function JobsView() {
  const { openDetail } = useApp()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  useEffect(() => { fetch(`/api/jobs${q ? `?q=${encodeURIComponent(q)}` : ''}`, { credentials: 'include' }).then((r) => r.json()).then((d) => { setJobs(d.jobs || []); setLoading(false) }).catch(() => setLoading(false)) }, [q])
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Browse Jobs</h1><p className="text-sm text-muted-foreground">Find agricultural work opportunities.</p></div>
      <Input placeholder="Search jobs…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
      {loading ? <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-muted/40" />)}</div> :
        jobs.length === 0 ? <EmptyState icon={<Briefcase className="h-5 w-5" />} title="No jobs found" /> :
        <div className="grid gap-3 sm:grid-cols-2">
          {jobs.map((j) => (
            <button key={j.id} onClick={() => openDetail('job-detail', j.id)} className="rounded-xl border border-border bg-card p-4 text-left hover:shadow-md">
              <div className="flex items-center justify-between"><span className="font-semibold">{j.title}</span><StatusBadge status={j.status} /></div>
              <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{j.description}</p>
              <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {j.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {j.location}</span>}
                {j.wage && <span>{money(j.wage)}</span>}
                {j._count && <span>· {j._count.applications} applied</span>}
              </div>
            </button>
          ))}
        </div>}
    </div>
  )
}

function ApplicationsView() {
  const [apps, setApps] = useState<JobApp[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch('/api/my', { credentials: 'include' }).then((r) => r.json()).then((d) => { setApps(d.listings?.jobApplications || []); setLoading(false) }).catch(() => setLoading(false)) }, [])
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">My Applications</h1><p className="text-sm text-muted-foreground">Track jobs you have applied for.</p></div>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
        apps.length === 0 ? <EmptyState icon={<Send className="h-5 w-5" />} title="No applications yet" description="Browse jobs and apply to get started." /> :
        <div className="grid gap-3">{apps.map((a) => (
          <Card key={a.id}><CardContent className="p-4">
            <div className="flex items-center justify-between"><span className="font-semibold">{a.job.title}</span><StatusBadge status={a.status} /></div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {a.job.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {a.job.location}</span>}
              {a.job.wage && <span>{money(a.job.wage)}</span>}
              <span>{timeAgo(a.createdAt)}</span>
            </div>
            {a.coverNote && <p className="mt-2 text-sm text-muted-foreground">“{a.coverNote}”</p>}
          </CardContent></Card>
        ))}</div>}
    </div>
  )
}

function ServicesView() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const load = () => { fetch('/api/my', { credentials: 'include' }).then((r) => r.json()).then((d) => { setServices(d.listings?.services || []); setLoading(false) }).catch(() => setLoading(false)) }
  useEffect(() => { load() }, [])
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">My Services</h1><p className="text-sm text-muted-foreground">Offer machinery rental or farm services.</p></div><Button onClick={() => setShowForm((s) => !s)}><Plus className="mr-2 h-4 w-4" /> {showForm ? 'Cancel' : 'Add service'}</Button></div>
      {showForm && <ServiceForm onSaved={() => { setShowForm(false); load() }} />}
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
        services.length === 0 ? <EmptyState icon={<Wrench className="h-5 w-5" />} title="No services yet" description="Offer machinery rental or labour services." action={<Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" /> Add service</Button>} /> :
        <div className="grid gap-3 sm:grid-cols-2">{services.map((s) => (
          <Card key={s.id}><CardContent className="p-4">
            <div className="flex items-start justify-between"><span className="font-semibold">{s.title}</span>{!s.available && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Hidden</span>}</div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{s.description}</p>
            <div className="mt-2 flex items-center justify-between"><span className="font-bold text-primary">{money(s.price)}</span><span className="text-xs text-muted-foreground">{s.category || ''} · {s.district || '—'}</span></div>
            <div className="mt-3 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { fetch(`/api/services/${s.id}`, { method: 'PATCH', body: JSON.stringify({ available: !s.available }), headers: { 'Content-Type': 'application/json' }, credentials: 'include' }).then(() => load()) }}>{s.available ? 'Hide' : 'Show'}</Button>
              <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => { if (confirm('Delete?')) { fetch(`/api/services/${s.id}`, { method: 'DELETE', credentials: 'include' }).then(() => load()) } }}>Delete</Button>
            </div>
          </CardContent></Card>
        ))}</div>}
    </div>
  )
}

function ServiceForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', category: '', price: '', district: '', imageUrl: '' })
  const [submitting, setSubmitting] = useState(false)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) { toast.error('Title is required'); return }
    setSubmitting(true)
    try {
      await api('/api/services', { method: 'POST', body: JSON.stringify({ title: form.title, description: form.description || undefined, category: form.category || undefined, price: form.price ? Number(form.price) : undefined, district: form.district || undefined, imageUrl: form.imageUrl || undefined }) })
      toast.success('Service added!'); onSaved()
    } catch (e) { toast.error((e as Error).message) } finally { setSubmitting(false) }
  }
  return (
    <Card><CardContent className="pt-6"><form onSubmit={submit} className="space-y-4">
      <div className="space-y-2"><Label>Service title *</Label><Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Combine Harvester Rental" required /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Category</Label><Select value={form.category} onValueChange={(v) => set('category', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{['Machinery', 'Labour', 'Spraying', 'Harvesting', 'Land Preparation', 'Other'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>District</Label><Select value={form.district} onValueChange={(v) => set('district', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{SRI_LANKAN_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="space-y-2"><Label>Price (Rs)</Label><Input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} /></div>
      <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} /></div>
      <div className="space-y-2"><Label>Image</Label><ImageUpload value={form.imageUrl} onChange={(u) => set('imageUrl', u)} /></div>
      <div className="flex justify-end"><Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Publish service</Button></div>
    </form></CardContent></Card>
  )
}
