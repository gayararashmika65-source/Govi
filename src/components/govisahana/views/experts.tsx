 
'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SectionHeader, EmptyState } from '@/components/govisahana/common'
import { VerifiedBadge } from '@/components/govisahana/badges'
import { SRI_LANKAN_DISTRICTS, COMMON_CROPS } from '@/lib/types'
import {
  Search,
  Star,
  MapPin,
  Users,
  ShieldCheck,
  ArrowRight,
  Stethoscope,
  Sparkles,
} from 'lucide-react'

type Expert = {
  id: string
  title?: string
  expertise?: string
  crops?: string
  languages?: string
  serviceAreas?: string
  bio?: string
  hourlyRate?: number | null
  verified: boolean
  available?: boolean
  rating?: number | null
  user: { id: string; name: string; avatarUrl?: string | null }
}

function initials(name: string) {
  return name
    .split(' ')
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

function splitList(value?: string | null) {
  return (value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export default function ExpertsView() {
  const { openDetail, setView, user } = useApp()
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [district, setDistrict] = useState<string>('all')
  const [crop, setCrop] = useState<string>('all')
  const [verifiedOnly, setVerifiedOnly] = useState(true)
  const [experts, setExperts] = useState<Expert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    let active = true
    setLoading(true)
    const params = new URLSearchParams()
    if (debouncedQ) params.set('q', debouncedQ)
    if (district !== 'all') params.set('district', district)
    if (crop !== 'all') params.set('crop', crop)
    params.set('verified', verifiedOnly ? 'true' : 'false')
    fetch(`/api/experts?${params.toString()}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (active) setExperts(Array.isArray(d.experts) ? d.experts : [])
      })
      .catch(() => {
        if (active) setExperts([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [debouncedQ, district, crop, verifiedOnly])

  const avgRating =
    experts.length === 0
      ? null
      : experts.reduce((s, e) => s + (e.rating || 0), 0) / experts.length

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
      <SectionHeader
        eyebrow="Find Experts"
        title="Verified agricultural experts across Sri Lanka"
        description="Connect with agricultural officers, researchers and consultants. Search by name, expertise, district or crop to find the right specialist for your farm."
      />

      {/* Quick stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-primary" /> Experts shown
          </div>
          <div className="mt-1 text-xl font-bold">{experts.length}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-primary" /> Verified
          </div>
          <div className="mt-1 text-xl font-bold">{experts.filter((e) => e.verified).length}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Star className="h-3.5 w-3.5 text-primary" /> Avg. rating
          </div>
          <div className="mt-1 text-xl font-bold">{avgRating ? avgRating.toFixed(1) : '—'}</div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 text-primary" /> Available now
          </div>
          <div className="mt-1 text-xl font-bold">{experts.filter((e) => e.available).length}</div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="mt-8 rounded-xl border border-border bg-card p-4 sm:p-5">
        <div className="grid gap-3 lg:grid-cols-12">
          <div className="relative lg:col-span-5">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name, expertise, or bio…"
              className="pl-9"
              aria-label="Search experts"
            />
          </div>
          <div className="lg:col-span-3">
            <Select value={district} onValueChange={setDistrict}>
              <SelectTrigger className="w-full" aria-label="Filter by district">
                <SelectValue placeholder="District" />
              </SelectTrigger>
              <SelectContent className="gs-scroll max-h-72 overflow-y-auto">
                <SelectItem value="all">All districts</SelectItem>
                {SRI_LANKAN_DISTRICTS.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-3">
            <Select value={crop} onValueChange={setCrop}>
              <SelectTrigger className="w-full" aria-label="Filter by crop">
                <SelectValue placeholder="Crop" />
              </SelectTrigger>
              <SelectContent className="gs-scroll max-h-72 overflow-y-auto">
                <SelectItem value="all">All crops</SelectItem>
                {COMMON_CROPS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-2 lg:col-span-1 lg:justify-end">
            <Switch
              id="verified-only"
              checked={verifiedOnly}
              onCheckedChange={setVerifiedOnly}
              aria-label="Show verified experts only"
            />
            <Label htmlFor="verified-only" className="text-xs text-muted-foreground">
              Verified
            </Label>
          </div>
        </div>
      </div>

      {/* Farmer banner */}
      {user?.role === 'FARMER' && (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="h-4 w-4" />
            </span>
            <div>
              <p className="text-sm font-medium text-foreground">Found an expert you'd like to consult?</p>
              <p className="text-xs text-muted-foreground">
                Open your dashboard to request a consultation and start a secure chat.
              </p>
            </div>
          </div>
          <Button onClick={() => setView('dashboard')} className="bg-primary hover:bg-primary/90">
            Go to dashboard <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Result count */}
      <div className="mt-6 text-sm text-muted-foreground">
        {loading ? 'Loading experts…' : `${experts.length} expert${experts.length === 1 ? '' : 's'} found`}
      </div>

      {/* Results */}
      {loading ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-56 animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : experts.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={<Stethoscope className="h-6 w-6" />}
          title="No experts match your filters"
          description="Try widening your search — toggle off 'Verified only' or choose a different district/crop."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQ('')
                setDistrict('all')
                setCrop('all')
                setVerifiedOnly(false)
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {experts.map((e) => {
            const expertiseChips = splitList(e.expertise).slice(0, 3)
            const area = splitList(e.serviceAreas)[0] || 'Sri Lanka'
            return (
              <Card
                key={e.id}
                className="group cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => openDetail('expert-detail', e.id)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={e.user.avatarUrl || undefined} alt={e.user.name} />
                      <AvatarFallback className="bg-primary/10 font-semibold text-primary">
                        {initials(e.user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-semibold">{e.user.name}</h3>
                      <p className="truncate text-sm text-muted-foreground">{e.title || 'Agricultural Expert'}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <VerifiedBadge verified={e.verified} />
                        {e.rating ? (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            {Number(e.rating).toFixed(1)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  {e.bio && (
                    <p className="mt-3 line-clamp-2 text-sm text-muted-foreground leading-relaxed">{e.bio}</p>
                  )}

                  {expertiseChips.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {expertiseChips.map((t) => (
                        <span
                          key={t}
                          className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                    <span className="flex min-w-0 items-center gap-1">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                      <span className="truncate">{area}</span>
                    </span>
                    {e.available ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Available
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" /> Busy
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
