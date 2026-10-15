'use client'
import { useEffect, useState } from 'react'
import { api, useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ClipboardList, Plus, Inbox, Wheat, Loader2, MapPin, ShoppingBasket } from 'lucide-react'
import { StatCard, EmptyState, money, formatDate, timeAgo } from '@/components/govisahana/common'
import { StatusBadge } from '@/components/govisahana/badges'
import { toast } from 'sonner'
import { SRI_LANKAN_DISTRICTS, COMMON_CROPS } from '@/lib/types'
import type { DashboardState } from './shell'

type Requirement = { id: string; cropName: string; quantity?: number | null; unit?: string | null; preferredDistrict?: string | null; targetPrice?: number | null; deliveryReq?: string | null; closingDate?: string | null; status: string }
type Enquiry = { id: string; type: string; message: string; status: string; createdAt: string; sender: { id: string; name: string } }

export default function BuyerDashboard({ dash }: { dash: DashboardState }) {
  if (dash.tab === 'requirements') return <RequirementsView />
  if (dash.tab === 'crops') return <CropsView />
  if (dash.tab === 'enquiries') return <EnquiriesView />
  return <OverviewView dash={dash} />
}

function OverviewView({ dash }: { dash: DashboardState }) {
  const { user } = useApp()
  const [counts, setCounts] = useState({ requirements: 0, enquiries: 0 })
  useEffect(() => { fetch('/api/my', { credentials: 'include' }).then((r) => r.json()).then((d) => setCounts({ requirements: (d.listings?.buyerRequirements || []).length, enquiries: (d.enquiries?.sent || []).length })).catch(() => {}) }, [])
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Welcome, {user?.name.split(' ')[0]}</h1><p className="text-sm text-muted-foreground">Source crops directly from Sri Lankan farmers.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Active requirements" value={counts.requirements} icon={<ClipboardList className="h-4 w-4" />} tone="green" />
        <StatCard label="Enquiries sent" value={counts.enquiries} icon={<Inbox className="h-4 w-4" />} tone="amber" />
        <StatCard label="Account" value={user?.status === 'ACTIVE' ? 'Active' : 'Pending'} icon={<ShoppingBasket className="h-4 w-4" />} tone="blue" />
      </div>
      <Card><CardHeader><CardTitle className="text-base">Quick actions</CardTitle></CardHeader><CardContent className="space-y-2">
        <Button className="w-full justify-start" onClick={() => dash.setTab('requirements')}><Plus className="mr-2 h-4 w-4" /> Post a crop requirement</Button>
        <Button variant="outline" className="w-full justify-start" onClick={() => dash.setTab('crops')}><Wheat className="mr-2 h-4 w-4" /> Browse crop listings</Button>
      </CardContent></Card>
    </div>
  )
}

function RequirementsView() {
  const [reqs, setReqs] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const load = () => { fetch('/api/buyer-requirements?mine=true', { credentials: 'include' }).then((r) => r.json()).then((d) => { setReqs(d.requirements || []); setLoading(false) }).catch(() => setLoading(false)) }
  useEffect(() => { load() }, [])
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3"><div><h1 className="text-2xl font-bold">My Requirements</h1><p className="text-sm text-muted-foreground">Publish what crops you want to buy.</p></div><Button onClick={() => setShowForm((s) => !s)}><Plus className="mr-2 h-4 w-4" /> {showForm ? 'Cancel' : 'Post requirement'}</Button></div>
      {showForm && <RequirementForm onSaved={() => { setShowForm(false); load() }} />}
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
        reqs.length === 0 ? <EmptyState icon={<ClipboardList className="h-5 w-5" />} title="No requirements yet" description="Post a crop requirement so farmers can find you." action={<Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" /> Post requirement</Button>} /> :
        <div className="grid gap-3">{reqs.map((r) => (
          <Card key={r.id}><CardContent className="p-4">
            <div className="flex items-center justify-between"><span className="font-semibold">{r.cropName}</span><StatusBadge status={r.status} /></div>
            <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
              {r.quantity && <span>{r.quantity} {r.unit || ''}</span>}
              {r.preferredDistrict && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {r.preferredDistrict}</span>}
              {r.targetPrice && <span>{money(r.targetPrice)}</span>}
              {r.closingDate && <span>Closes {formatDate(r.closingDate)}</span>}
            </div>
            {r.deliveryReq && <p className="mt-1 text-sm text-muted-foreground">{r.deliveryReq}</p>}
          </CardContent></Card>
        ))}</div>}
    </div>
  )
}

function RequirementForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ cropName: '', quantity: '', unit: 'kg', preferredDistrict: '', targetPrice: '', deliveryReq: '', closingDate: '' })
  const [submitting, setSubmitting] = useState(false)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.cropName) { toast.error('Crop name is required'); return }
    setSubmitting(true)
    try {
      await api('/api/buyer-requirements', { method: 'POST', body: JSON.stringify({ cropName: form.cropName, quantity: form.quantity ? Number(form.quantity) : undefined, unit: form.unit, preferredDistrict: form.preferredDistrict || undefined, targetPrice: form.targetPrice ? Number(form.targetPrice) : undefined, deliveryReq: form.deliveryReq || undefined, closingDate: form.closingDate || undefined }) })
      toast.success('Requirement posted!'); onSaved()
    } catch (e) { toast.error((e as Error).message) } finally { setSubmitting(false) }
  }
  return (
    <Card><CardContent className="pt-6"><form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Crop *</Label><Select value={form.cropName} onValueChange={(v) => set('cropName', v)}><SelectTrigger><SelectValue placeholder="Select crop" /></SelectTrigger><SelectContent>{COMMON_CROPS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Preferred district</Label><Select value={form.preferredDistrict} onValueChange={(v) => set('preferredDistrict', v)}><SelectTrigger><SelectValue placeholder="Any" /></SelectTrigger><SelectContent>{SRI_LANKAN_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2"><Label>Quantity</Label><Input type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} /></div>
        <div className="space-y-2"><Label>Unit</Label><Select value={form.unit} onValueChange={(v) => set('unit', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{['kg', 'ton', 'bunch', 'bag'].map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label>Target price (Rs)</Label><Input type="number" value={form.targetPrice} onChange={(e) => set('targetPrice', e.target.value)} /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label>Delivery requirement</Label><Input value={form.deliveryReq} onChange={(e) => set('deliveryReq', e.target.value)} placeholder="e.g. Colombo warehouse" /></div>
        <div className="space-y-2"><Label>Closing date</Label><Input type="date" value={form.closingDate} onChange={(e) => set('closingDate', e.target.value)} /></div>
      </div>
      <div className="flex justify-end"><Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Post requirement</Button></div>
    </form></CardContent></Card>
  )
}

function CropsView() {
  const { openDetail } = useApp()
  const [crops, setCrops] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  useEffect(() => { fetch(`/api/crops${q ? `?q=${encodeURIComponent(q)}` : ''}`, { credentials: 'include' }).then((r) => r.json()).then((d) => { setCrops(d.crops || []); setLoading(false) }).catch(() => setLoading(false)) }, [q])
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Browse Crop Listings</h1><p className="text-sm text-muted-foreground">Find crops from farmers across Sri Lanka.</p></div>
      <Input placeholder="Search crops…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-md" />
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
        crops.length === 0 ? <EmptyState icon={<Wheat className="h-5 w-5" />} title="No crops found" /> :
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{crops.map((c) => (
          <button key={c.id} onClick={() => openDetail('crop-detail', c.id)} className="rounded-xl border border-border bg-card p-4 text-left hover:shadow-md">
            <div className="font-semibold">{c.cropName}{c.variety ? ` · ${c.variety}` : ''}</div>
            <div className="mt-1 text-sm text-muted-foreground">{c.quantity} {c.unit} · {c.grade || 'No grade'}</div>
            <div className="mt-1 flex items-center justify-between"><span className="font-bold text-primary">{money(c.askingPrice)}</span><span className="text-xs text-muted-foreground">{c.district || '—'}</span></div>
          </button>
        ))}</div>}
    </div>
  )
}

function EnquiriesView() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch('/api/enquiries', { credentials: 'include' }).then((r) => r.json()).then((d) => { setEnquiries(d.enquiries || []); setLoading(false) }).catch(() => setLoading(false)) }, [])
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Enquiries</h1><p className="text-sm text-muted-foreground">Messages you have sent to farmers and sellers.</p></div>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
        enquiries.length === 0 ? <EmptyState icon={<Inbox className="h-5 w-5" />} title="No enquiries yet" description="Enquire about crops or products from the marketplace." /> :
        <div className="grid gap-3">{enquiries.map((e) => (
          <Card key={e.id}><CardContent className="p-4">
            <div className="flex items-center justify-between"><span className="font-medium">{e.type}</span><span className="text-xs text-muted-foreground">{timeAgo(e.createdAt)}</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{e.message}</p>
          </CardContent></Card>
        ))}</div>}
    </div>
  )
}
