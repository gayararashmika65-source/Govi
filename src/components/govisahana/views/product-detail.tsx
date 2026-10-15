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
import { EmptyState, money } from '@/components/govisahana/common'
import {
  ArrowLeft, MapPin, Package, Image as ImageIcon, Mail, Phone, Send, Store,
} from 'lucide-react'
import { toast } from 'sonner'

type Product = {
  id: string
  title: string
  description?: string | null
  category?: string | null
  price?: number | null
  unit?: string | null
  imageUrl?: string | null
  available?: boolean
  district?: string | null
  owner: { id: string; name: string; email?: string | null; phone?: string | null }
}

export default function ProductDetailView() {
  const id = useApp((s) => s.viewParam)
  const { setView, user } = useApp()
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    fetch(`/api/products/${id}`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((d) => setProduct(d.product))
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
    if (!product) return
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
          type: 'PRODUCT',
          listingId: product.id,
          recipientId: product.owner.id,
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

  if (notFound || !product) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Button variant="ghost" size="sm" onClick={() => setView('marketplace')} className="mb-4 text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to marketplace
        </Button>
        <EmptyState
          icon={<Package className="h-6 w-6" />}
          title="Product not found"
          description="This product may have been removed or is no longer available."
          action={<Button onClick={() => setView('marketplace')} className="bg-primary hover:bg-primary/90">Browse marketplace</Button>}
        />
      </div>
    )
  }

  const isOwner = user?.id === product.owner.id

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Button variant="ghost" size="sm" onClick={() => setView('marketplace')} className="mb-4 text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to marketplace
      </Button>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <Card className="overflow-hidden">
          <div className="relative aspect-square w-full bg-muted/40">
            {product.imageUrl ? (
              <img src={product.imageUrl} alt={product.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                <ImageIcon className="h-16 w-16" />
              </div>
            )}
            {product.category && (
              <Badge className="absolute left-3 top-3 border-transparent bg-primary/90 text-primary-foreground">
                {product.category}
              </Badge>
            )}
          </div>
        </Card>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{product.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {product.district || 'Sri Lanka'}</span>
              {product.available === false && (
                <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">Out of stock</Badge>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Price</span>
            <div className="mt-1 flex items-baseline gap-1">
              <span className="text-3xl font-bold text-primary">{money(product.price)}</span>
              {product.unit && <span className="text-sm font-medium text-muted-foreground">/ {product.unit}</span>}
            </div>
          </div>

          {product.description && (
            <div>
              <h2 className="text-sm font-semibold text-foreground">Description</h2>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* Supplier info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <Store className="h-3.5 w-3.5 text-primary" /> Supplier
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="font-semibold">{product.owner.name}</div>
                {product.owner.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {product.owner.email}
                  </div>
                )}
                {product.owner.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {product.owner.phone}
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
              <Send className="mr-2 h-4 w-4" /> Send enquiry
            </Button>
          )}
        </div>
      </div>

      {/* Enquiry Sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent className="flex flex-col gap-4 sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Send an enquiry</SheetTitle>
            <SheetDescription>
              Your message will be sent to <span className="font-medium text-foreground">{product.owner.name}</span> about “{product.title}”.
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              placeholder="Hi, I’m interested in this product. Is it available in larger quantities? What are delivery options to my area?"
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
