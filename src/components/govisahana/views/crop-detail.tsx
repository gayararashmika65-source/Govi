'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter, SheetClose,
} from '@/components/ui/sheet'
import { EmptyState, money, formatDate } from '@/components/govisahana/common'
import {
  ArrowLeft, MapPin, Sprout, Image as ImageIcon, Mail, Phone, Send, User, Calendar, Scale, BadgeCheck,
} from 'lucide-react'
import { toast } from 'sonner'

type Crop = {
  id: string
  cropName: string
  variety?: string | null
  quantity?: number | null
  unit?: string | null
  expectedHarvestDate?: string | null
  district?: string | null
  askingPrice?: number | null
  grade?: string | null
  imageUrl?: string | null
  available?: boolean
  owner: { id: string; name: string; email?: string | null; phone?: string | null }
}

export default function CropDetailView() {
  const id = useApp((s) => s.viewParam)
  const { setView, user } = useApp()
  const [crop, setCrop] = useState<Crop | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    fetch(`/api/crops/${id}`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((d) => setCrop(d.crop))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  function startEnquiry() {
    if (!user) {
      toast.info('Please sign in to send an enquiry')
      setView('login')
      return
    }
    setOpen(true)
  }

  async function sendEnquiry() {
    if (!crop) return
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
          type: 'CROP',
          listingId: crop.id,
          recipientId: crop.owner.id,
          message: message.trim(),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to send')
      }
      toast.success('Enquiry sent')
      setOpen(false)
      setMessage('')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to send enquiry')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Skeleton className="mb-4 h-8 w-32" />
        <div className="grid gap-8 lg:grid-cols-2">
          <Skeleton className="aspect-square w-full rounded-xl" />
          <div className="space-y-4">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-5 w-1/3" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !crop) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Button variant="ghost" size="sm" onClick={() => setView('crops')} className="mb-4 text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to crop listings
        </Button>
        <EmptyState
          icon={<Sprout className="h-6 w-6" />}
          title="Crop listing not found"
          description="This listing may have been removed or sold out."
          action={<Button onClick={() => setView('crops')} className="bg-primary hover:bg-primary/90">Browse crops</Button>}
        />
      </div>
    )
  }

  const isOwner = user?.id === crop.owner.id

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Button variant="ghost" size="sm" onClick={() => setView('crops')} className="mb-4 text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to crop listings
      </Button>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <Card className="overflow-hidden">
          <div className="relative aspect-square w-full bg-muted/40">
            {crop.imageUrl ? (
              <img src={crop.imageUrl} alt={crop.cropName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary/30">
                <Sprout className="h-16 w-16" />
              </div>
            )}
            {crop.grade && (
              <Badge className="absolute left-3 top-3 border-transparent bg-emerald-100 text-emerald-700">
                Grade {crop.grade}
              </Badge>
            )}
          </div>
        </Card>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{crop.cropName}</h1>
            {crop.variety && <p className="mt-1 text-sm text-muted-foreground">Variety: {crop.variety}</p>}
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {crop.district || 'Sri Lanka'}</span>
              {crop.available === false && (
                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">No longer available</Badge>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Asking price</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-primary">{money(crop.askingPrice)}</span>
              {crop.unit && <span className="text-sm font-medium text-muted-foreground">/ {crop.unit}</span>}
            </div>
          </div>

          {/* Specs */}
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-4 text-sm">
              <div className="flex items-center gap-2">
                <Scale className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Quantity</div>
                  <div className="font-medium">{crop.quantity ?? '—'} {crop.unit || ''}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <BadgeCheck className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Grade</div>
                  <div className="font-medium">{crop.grade || '—'}</div>
                </div>
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Expected harvest</div>
                  <div className="font-medium">{formatDate(crop.expectedHarvestDate)}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Farmer info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <User className="h-3.5 w-3.5 text-primary" /> Farmer
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="font-semibold">{crop.owner.name}</div>
                {crop.owner.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {crop.owner.email}
                  </div>
                )}
                {crop.owner.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {crop.owner.phone}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {isOwner ? (
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
              This is your listing. Manage it from your dashboard.
            </div>
          ) : (
            <Button size="lg" onClick={startEnquiry} className="bg-primary hover:bg-primary/90">
              <Send className="mr-2 h-4 w-4" /> Contact farmer
            </Button>
          )}
        </div>
      </div>

      {/* Enquiry Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col gap-4 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Contact farmer</SheetTitle>
            <SheetDescription>
              Send an enquiry to <span className="font-medium text-foreground">{crop.owner.name}</span> about their {crop.cropName} harvest.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder={`Hi, I'm interested in your ${crop.cropName}. Could you share more details about availability and delivery?`}
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
