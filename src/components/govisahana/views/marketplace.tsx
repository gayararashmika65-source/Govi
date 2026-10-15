'use client'
import { useEffect, useMemo, useState } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionHeader, EmptyState, money } from '@/components/govisahana/common'
import {
  Store, Search, MapPin, Package, Image as ImageIcon, ArrowLeft, Sprout,
} from 'lucide-react'

type Owner = { id: string; name: string }
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
  owner: Owner
}

const CATEGORIES = ['All', 'Fertilizer', 'Seeds', 'Equipment', 'Irrigation', 'Agrochemicals', 'Other']

export default function MarketplaceView() {
  const { openDetail, setView } = useApp()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('All')

  useEffect(() => {
    const ctrl = new AbortController()
    setLoading(true)
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (category && category !== 'All') params.set('category', category)
    fetch(`/api/products?${params.toString()}`, { signal: ctrl.signal, credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setProducts(d.products || []))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false))
    return () => ctrl.abort()
  }, [q, category])

  const counts = useMemo(() => {
    const m: Record<string, number> = {}
    for (const p of products) {
      const k = p.category || 'Other'
      m[k] = (m[k] || 0) + 1
    }
    return m
  }, [products])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Button variant="ghost" size="sm" onClick={() => setView('home')} className="mb-4 text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Home
      </Button>

      <SectionHeader
        eyebrow="Agri Marketplace"
        title="Seeds, fertilizer, equipment & more"
        description="Source quality agricultural inputs from verified enterprises across Sri Lanka."
      />

      {/* Filters */}
      <div className="mt-8 space-y-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products, suppliers…"
            className="pl-9"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCategory(c)}
              className={`rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors ${
                category === c
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
              }`}
            >
              {c}
              {c !== 'All' && counts[c] ? (
                <span className={`ml-1.5 text-xs ${category === c ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>
                  {counts[c]}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="mt-8">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                <CardContent className="space-y-2 p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-6 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Store className="h-6 w-6" />}
            title="No products found"
            description={q || category !== 'All' ? 'Try adjusting your filters or search keywords.' : 'Enterprises haven’t listed any products yet.'}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((p) => (
              <Card
                key={p.id}
                onClick={() => openDetail('product-detail', p.id)}
                className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted/40">
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={p.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                  {p.category && (
                    <Badge className="absolute left-2 top-2 border-transparent bg-primary/90 text-primary-foreground">
                      {p.category}
                    </Badge>
                  )}
                </div>
                <CardContent className="space-y-2 p-4">
                  <h3 className="line-clamp-1 font-semibold leading-tight">{p.title}</h3>
                  <p className="line-clamp-2 text-sm text-muted-foreground">
                    {p.description || 'Quality agricultural input.'}
                  </p>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-lg font-bold text-primary">{money(p.price)}{p.unit ? <span className="ml-1 text-xs font-medium text-muted-foreground">/ {p.unit}</span> : null}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3" /> {p.district || 'Sri Lanka'}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <Package className="h-3 w-3" /> {p.owner.name}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
