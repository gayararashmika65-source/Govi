'use client'
import { useEffect, useState } from 'react'
import { api, useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Package, Plus, Inbox, Store, Loader2, MessageSquare, TrendingUp } from 'lucide-react'
import { StatCard, EmptyState, money, timeAgo } from '@/components/govisahana/common'
import { ImageUpload } from '@/components/govisahana/shared/image-upload'
import { toast } from 'sonner'
import { SRI_LANKAN_DISTRICTS } from '@/lib/types'
import type { DashboardState } from './shell'

type Product = { id: string; title: string; description?: string | null; category?: string | null; price?: number | null; unit?: string | null; imageUrl?: string | null; available: boolean; district?: string | null }
type Enquiry = { id: string; type: string; message: string; status: string; createdAt: string; sender: { id: string; name: string } }

export default function EnterpriseDashboard({ dash }: { dash: DashboardState }) {
  const { user } = useApp()
  if (dash.tab === 'products') return <ProductsView />
  if (dash.tab === 'enquiries') return <EnquiriesView />
  return <OverviewView dash={dash} />
}

function OverviewView({ dash }: { dash: DashboardState }) {
  const { user } = useApp()
  const [counts, setCounts] = useState({ products: 0, enquiries: 0 })
  useEffect(() => {
    fetch('/api/my', { credentials: 'include' }).then((r) => r.json()).then((d) => setCounts({ products: (d.listings?.products || []).length, enquiries: (d.enquiries?.received || []).length })).catch(() => {})
  }, [])
  return (
    <div className="space-y-6">
      <div><h1 className="text-2xl font-bold">Welcome, {user?.name.split(' ')[0]}</h1><p className="text-sm text-muted-foreground">Manage your agricultural products and reach farmers across Sri Lanka.</p></div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Products listed" value={counts.products} icon={<Package className="h-4 w-4" />} tone="green" />
        <StatCard label="Enquiries received" value={counts.enquiries} icon={<Inbox className="h-4 w-4" />} tone="amber" />
        <StatCard label="Account status" value={user?.status === 'ACTIVE' ? 'Active' : 'Pending'} icon={<TrendingUp className="h-4 w-4" />} tone="blue" />
      </div>
      <Card><CardHeader><CardTitle className="text-base">Quick actions</CardTitle></CardHeader><CardContent className="space-y-2">
        <Button className="w-full justify-start" onClick={() => dash.setTab('products')}><Plus className="mr-2 h-4 w-4" /> Add a product</Button>
        <Button variant="outline" className="w-full justify-start" onClick={() => dash.setTab('enquiries')}><Inbox className="mr-2 h-4 w-4" /> View enquiries</Button>
      </CardContent></Card>
    </div>
  )
}

function ProductsView() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const load = () => { fetch('/api/my', { credentials: 'include' }).then((r) => r.json()).then((d) => { setProducts(d.listings?.products || []); setLoading(false) }).catch(() => setLoading(false)) }
  useEffect(() => { load() }, [])
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">My Products</h1><p className="text-sm text-muted-foreground">Manage your marketplace listings.</p></div>
        <Button onClick={() => setShowForm((s) => !s)}><Plus className="mr-2 h-4 w-4" /> {showForm ? 'Cancel' : 'Add product'}</Button>
      </div>
      {showForm && <ProductForm onSaved={() => { setShowForm(false); load() }} />}
      {loading ? <div className="grid gap-3 sm:grid-cols-2">{[0, 1].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-muted/40" />)}</div> :
        products.length === 0 ? <EmptyState icon={<Package className="h-5 w-5" />} title="No products yet" description="Add your first product to reach farmers." action={<Button onClick={() => setShowForm(true)}><Plus className="mr-2 h-4 w-4" /> Add product</Button>} /> :
        <div className="grid gap-3 sm:grid-cols-2">
          {products.map((p) => (
            <Card key={p.id}><CardContent className="p-4">
              <div className="flex gap-3">
                {p.imageUrl ? <img src={p.imageUrl} alt="" className="h-20 w-20 rounded-lg border border-border object-cover" /> : <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground"><Package className="h-6 w-6" /></div>}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2"><span className="truncate font-semibold">{p.title}</span>{!p.available && <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">Hidden</span>}</div>
                  <div className="text-xs text-muted-foreground">{p.category || 'Uncategorised'} · {p.district || '—'}</div>
                  <div className="mt-1 font-bold text-primary">{money(p.price)}{p.unit ? ` / ${p.unit}` : ''}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="outline" size="sm" onClick={() => { fetch(`/api/products/${p.id}`, { method: 'PATCH', body: JSON.stringify({ available: !p.available }), headers: { 'Content-Type': 'application/json' }, credentials: 'include' }).then(() => load()) }}>{p.available ? 'Hide' : 'Show'}</Button>
                <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => { if (confirm('Delete this product?')) { fetch(`/api/products/${p.id}`, { method: 'DELETE', credentials: 'include' }).then(() => load()) } }}>Delete</Button>
              </div>
            </CardContent></Card>
          ))}
        </div>}
    </div>
  )
}

function ProductForm({ onSaved }: { onSaved: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', category: '', price: '', unit: '', district: '', imageUrl: '' })
  const [submitting, setSubmitting] = useState(false)
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }))
  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title) { toast.error('Title is required'); return }
    setSubmitting(true)
    try {
      await api('/api/products', { method: 'POST', body: JSON.stringify({ title: form.title, description: form.description || undefined, category: form.category || undefined, price: form.price ? Number(form.price) : undefined, unit: form.unit || undefined, district: form.district || undefined, imageUrl: form.imageUrl || undefined }) })
      toast.success('Product added!')
      onSaved()
    } catch (e) { toast.error((e as Error).message) } finally { setSubmitting(false) }
  }
  return (
    <Card><CardContent className="pt-6">
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2"><Label>Product title *</Label><Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Urea Fertilizer (50kg)" required /></div>
          <div className="space-y-2"><Label>Category</Label><Select value={form.category} onValueChange={(v) => set('category', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{['Fertilizer', 'Seeds', 'Equipment', 'Irrigation', 'Agrochemicals', 'Other'].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>District</Label><Select value={form.district} onValueChange={(v) => set('district', v)}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger><SelectContent>{SRI_LANKAN_DISTRICTS.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Price (Rs)</Label><Input type="number" value={form.price} onChange={(e) => set('price', e.target.value)} /></div>
          <div className="space-y-2"><Label>Unit</Label><Input value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="bag / unit / litre" /></div>
        </div>
        <div className="space-y-2"><Label>Description</Label><Textarea value={form.description} onChange={(e) => set('description', e.target.value)} rows={3} /></div>
        <div className="space-y-2"><Label>Product image</Label><ImageUpload value={form.imageUrl} onChange={(u) => set('imageUrl', u)} /></div>
        <div className="flex justify-end"><Button type="submit" disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Publish product</Button></div>
      </form>
    </CardContent></Card>
  )
}

function EnquiriesView() {
  const [enquiries, setEnquiries] = useState<Enquiry[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { fetch('/api/enquiries', { credentials: 'include' }).then((r) => r.json()).then((d) => { setEnquiries(d.enquiries || []); setLoading(false) }).catch(() => setLoading(false)) }, [])
  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold">Enquiries</h1><p className="text-sm text-muted-foreground">Messages from farmers interested in your products.</p></div>
      {loading ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
        enquiries.length === 0 ? <EmptyState icon={<Inbox className="h-5 w-5" />} title="No enquiries yet" description="When farmers enquire about your products, they appear here." /> :
        <div className="grid gap-3">{enquiries.map((e) => (
          <Card key={e.id}><CardContent className="p-4">
            <div className="flex items-center justify-between"><span className="font-medium">{e.sender.name}</span><span className="text-xs text-muted-foreground">{timeAgo(e.createdAt)}</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{e.message}</p>
          </CardContent></Card>
        ))}</div>}
    </div>
  )
}
