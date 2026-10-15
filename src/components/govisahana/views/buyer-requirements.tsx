'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter, SheetClose,
} from '@/components/ui/sheet'
import { SectionHeader, EmptyState, money, formatDate } from '@/components/govisahana/common'
import { StatusBadge } from '@/components/govisahana/badges'
import {
  ShoppingBasket, Search, MapPin, ArrowLeft, Calendar, Scale, Truck, Send, Sprout, User,
} from 'lucide-react'
import { toast } from 'sonner'

type Requirement = {
  id: string
  cropName: string
  quantity?: number | null
  unit?: string | null
  preferredDistrict?: string | null
  targetPrice?: number | null
  deliveryReq?: string | null
  closingDate?: string | null
  status: string
  owner: { id: string; name: string }
}

export default function BuyerRequirementsView() {
  const { setView, user } = useApp()
  const [items, setItems] = useState<Requirement[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')

  // Enquiry sheet
  const [open, setOpen] = useState(false)
  const [target, setTarget] = useState<Requirement | null>(null)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    fetch(`/api/buyer-requirements?${params.toString()}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setItems(d.requirements || []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [q])

  function openEnquiry(req: Requirement) {
    if (!user) {
      toast.info('Please sign in to send an enquiry')
      setView('login')
      return
    }
    setTarget(req)
    setMessage(`Hi, I can supply ${req.cropName} matching your requirement. Could you confirm the delivery terms?`)
    setOpen(true)
  }

  async function sendEnquiry() {
    if (!target) return
    if (!message.trim()) {
      toast.error('Please enter a message')
      return
    }
    setSending(true)
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'BUYER_REQ',
          listingId: target.id,
          recipientId: target.owner.id,
          message: message.trim(),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to send')
      }
      toast.success('Enquiry sent')
      setOpen(false)
      setTarget(null)
      setMessage('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send enquiry')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Button variant="ghost" size="sm" onClick={() => setView('home')} className="mb-4 text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Home
      </Button>

      <SectionHeader
        eyebrow="Buyer Requirements"
        title="Active crop demands from buyers"
        description="Buyers are looking for specific crops. If you’re a farmer with matching produce, send them an enquiry."
      />

      {/* Search */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <div className="relative max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by crop name…"
            className="pl-9"
          />
        </div>
        <div className="ml-auto flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-sm">
          <Sprout className="h-4 w-4 text-primary" />
          <span className="text-muted-foreground">Are you a farmer with matching crops?</span>
          <Button size="sm" variant="ghost" className="h-7 px-2 text-primary" onClick={() => setView(user ? 'dashboard' : 'register')}>
            {user ? 'List your crop' : 'Register'}
          </Button>
        </div>
      </div>

      {/* List */}
      <div className="mt-6">
        {loading ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <Card key={i}>
                <CardContent className="space-y-3 p-5">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ShoppingBasket className="h-6 w-6" />}
            title="No active requirements"
            description="Buyers haven’t posted any active crop requirements yet. Check back soon."
          />
        ) : (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {items.map((r) => {
              const isOwner = user?.id === r.owner.id
              return (
                <Card key={r.id} className="flex flex-col transition-shadow hover:shadow-md">
                  <CardContent className="flex flex-1 flex-col space-y-3 p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold leading-tight">{r.cropName}</h3>
                        <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <User className="h-3 w-3" /> {r.owner.name}
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-1.5">
                        <Scale className="h-3.5 w-3.5 text-primary" />
                        <span className="text-muted-foreground">Qty:</span>
                        <span className="font-medium">{r.quantity ?? '—'} {r.unit || ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-primary" />
                        <span className="text-muted-foreground">Pref:</span>
                        <span className="font-medium truncate">{r.preferredDistrict || 'Any'}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-primary font-bold">{money(r.targetPrice)}</span>
                        {r.unit && <span className="text-xs text-muted-foreground">/ {r.unit}</span>}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-primary" />
                        <span className="font-medium">{formatDate(r.closingDate)}</span>
                      </div>
                    </div>

                    {r.deliveryReq && (
                      <div className="flex items-start gap-1.5 rounded-md bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground">
                        <Truck className="mt-0.5 h-3.5 w-3.5 text-primary" /> {r.deliveryReq}
                      </div>
                    )}

                    <div className="mt-auto border-t border-border pt-3">
                      {isOwner ? (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">Your requirement</Badge>
                      ) : (
                        <Button size="sm" variant="outline" className="w-full hover:border-primary hover:text-primary" onClick={() => openEnquiry(r)}>
                          <Send className="mr-2 h-3.5 w-3.5" /> Send enquiry
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Enquiry Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col gap-4 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Respond to buyer requirement</SheetTitle>
            <SheetDescription>
              Send a message to <span className="font-medium text-foreground">{target?.owner.name}</span> about their {target?.cropName} requirement.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
            />
          </div>
          <SheetFooter className="mt-auto gap-2">
            <SheetClose asChild>
              <Button variant="outline">Cancel</Button>
            </SheetClose>
            <Button onClick={sendEnquiry} disabled={sending} className="bg-primary hover:bg-primary/90">
              {sending ? 'Sending…' : 'Send enquiry'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}
