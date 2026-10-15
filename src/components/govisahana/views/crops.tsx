'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SectionHeader, EmptyState, money, formatDate } from '@/components/govisahana/common'
import { SRI_LANKAN_DISTRICTS, COMMON_CROPS } from '@/lib/types'
import {
  ShoppingBasket, Search, MapPin, Sprout, Image as ImageIcon, ArrowLeft, Calendar, User,
} from 'lucide-react'

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
  owner: { id: string; name: string }
}

const GRADE_TONES: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-slate-100 text-slate-700',
  Premium: 'bg-emerald-100 text-emerald-700',
}

export default function CropsView() {
  const { openDetail, setView } = useApp()
  const [crops, setCrops] = useState<Crop[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [district, setDistrict] = useState('all')
  const [crop, setCrop] = useState('all')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (district !== 'all') params.set('district', district)
    if (crop !== 'all') params.set('crop', crop)
    fetch(`/api/crops?${params.toString()}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setCrops(d.crops || []))
      .catch(() => setCrops([]))
      .finally(() => setLoading(false))
  }, [q, district, crop])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Button variant="ghost" size="sm" onClick={() => setView('home')} className="mb-4 text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Home
      </Button>

      <SectionHeader
        eyebrow="Crop Trading"
        title="Harvests direct from Sri Lankan farmers"
        description="Browse available crops by district, grade and harvest date. Connect directly with the grower."
      />

      {/* Filters */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search crop name…"
            className="pl-9"
          />
        </div>
        <Select value={district} onValueChange={setDistrict}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All districts" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="all">All districts</SelectItem>
            {SRI_LANKAN_DISTRICTS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={crop} onValueChange={setCrop}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="All crops" />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="all">All crops</SelectItem>
            {COMMON_CROPS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
        ) : crops.length === 0 ? (
          <EmptyState
            icon={<ShoppingBasket className="h-6 w-6" />}
            title="No crops listed"
            description="Try adjusting your search or filters. Farmers can list their harvests from the dashboard."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {crops.map((c) => (
              <Card
                key={c.id}
                onClick={() => openDetail('crop-detail', c.id)}
                className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted/40">
                  {c.imageUrl ? (
                    <img
                      src={c.imageUrl}
                      alt={c.cropName}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-primary/30">
                      <Sprout className="h-10 w-10" />
                    </div>
                  )}
                  {c.grade && (
                    <Badge className={`absolute left-2 top-2 border-transparent ${GRADE_TONES[c.grade] || 'bg-primary/90 text-primary-foreground'}`}>
                      Grade {c.grade}
                    </Badge>
                  )}
                </div>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-baseline justify-between gap-2">
                    <h3 className="truncate font-semibold">{c.cropName}</h3>
                    {c.variety && <span className="truncate text-xs text-muted-foreground">{c.variety}</span>}
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-lg font-bold text-primary">{money(c.askingPrice)}</span>
                    {(c.quantity != null || c.unit) && (
                      <span className="text-xs font-medium text-muted-foreground">
                        {c.quantity ?? '—'} {c.unit || ''}
                      </span>
                    )}
                  </div>
                  <div className="space-y-1 border-t border-border pt-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3" /> {c.district || 'Sri Lanka'}
                    </div>
                    {c.expectedHarvestDate && (
                      <div className="flex items-center gap-1 truncate">
                        <Calendar className="h-3 w-3" /> Harvest {formatDate(c.expectedHarvestDate)}
                      </div>
                    )}
                    <div className="flex items-center gap-1 truncate">
                      <User className="h-3 w-3" /> {c.owner.name}
                    </div>
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
