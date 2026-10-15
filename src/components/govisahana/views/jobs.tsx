'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from '@/components/ui/tabs'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SectionHeader, EmptyState, money, formatDate } from '@/components/govisahana/common'
import { SRI_LANKAN_DISTRICTS } from '@/lib/types'
import {
  HardHat, Search, MapPin, Image as ImageIcon, ArrowLeft, Calendar, Wallet,
  Users, Wrench, Briefcase,
} from 'lucide-react'

type Job = {
  id: string
  title: string
  description?: string | null
  requiredSkills?: string | null
  location?: string | null
  startDate?: string | null
  endDate?: string | null
  paymentTerms?: string | null
  wage?: number | null
  status?: string | null
  owner: { id: string; name: string }
  _count?: { applications: number }
}

type Service = {
  id: string
  title: string
  description?: string | null
  category?: string | null
  price?: number | null
  district?: string | null
  imageUrl?: string | null
  available?: boolean
  owner: { id: string; name: string }
}

const SERVICE_CATEGORIES = ['All', 'Machinery Rental', 'Land Preparation', 'Harvesting', 'Transport', 'Spraying', 'Consulting', 'Other']

export default function JobsView() {
  const { openDetail, setView } = useApp()
  const [tab, setTab] = useState<'jobs' | 'services'>('jobs')

  // jobs
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState(true)
  const [jobQ, setJobQ] = useState('')
  const [jobDistrict, setJobDistrict] = useState('all')

  // services
  const [services, setServices] = useState<Service[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [svcQ, setSvcQ] = useState('')
  const [svcCategory, setSvcCategory] = useState('All')

  useEffect(() => {
    setJobsLoading(true)
    const params = new URLSearchParams()
    if (jobQ.trim()) params.set('q', jobQ.trim())
    if (jobDistrict !== 'all') params.set('district', jobDistrict)
    fetch(`/api/jobs?${params.toString()}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setJobs(d.jobs || []))
      .catch(() => setJobs([]))
      .finally(() => setJobsLoading(false))
  }, [jobQ, jobDistrict])

  useEffect(() => {
    setServicesLoading(true)
    const params = new URLSearchParams()
    if (svcQ.trim()) params.set('q', svcQ.trim())
    if (svcCategory !== 'All') params.set('category', svcCategory)
    fetch(`/api/services?${params.toString()}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setServices(d.services || []))
      .catch(() => setServices([]))
      .finally(() => setServicesLoading(false))
  }, [svcQ, svcCategory])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Button variant="ghost" size="sm" onClick={() => setView('home')} className="mb-4 text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Home
      </Button>

      <SectionHeader
        eyebrow="Jobs & Services"
        title="Agricultural work and machinery services"
        description="Find farm jobs, rent machinery, and book skilled agricultural services across Sri Lanka."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'jobs' | 'services')} className="mt-8">
        <TabsList>
          <TabsTrigger value="jobs"><Briefcase className="mr-1.5 h-4 w-4" /> Jobs</TabsTrigger>
          <TabsTrigger value="services"><Wrench className="mr-1.5 h-4 w-4" /> Services</TabsTrigger>
        </TabsList>

        {/* JOBS TAB */}
        <TabsContent value="jobs" className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={jobQ}
                onChange={(e) => setJobQ(e.target.value)}
                placeholder="Search jobs by title or description…"
                className="pl-9"
              />
            </div>
            <Select value={jobDistrict} onValueChange={setJobDistrict}>
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
            <div className="hidden lg:block" />
          </div>

          <div className="mt-6">
            {jobsLoading ? (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="space-y-3 p-5">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                      <Skeleton className="h-16 w-full" />
                      <Skeleton className="h-5 w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : jobs.length === 0 ? (
              <EmptyState
                icon={<HardHat className="h-6 w-6" />}
                title="No jobs posted yet"
                description="Try a different search or district. Farmers and enterprises can post agricultural jobs from their dashboard."
              />
            ) : (
              <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {jobs.map((j) => (
                  <Card
                    key={j.id}
                    onClick={() => openDetail('job-detail', j.id)}
                    className="group cursor-pointer transition-shadow hover:shadow-md"
                  >
                    <CardContent className="space-y-3 p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 font-semibold leading-tight">{j.title}</h3>
                        {j.status && j.status !== 'OPEN' && (
                          <Badge variant="outline" className="shrink-0 border-amber-300 bg-amber-50 text-amber-700">
                            {j.status.replace(/_/g, ' ')}
                          </Badge>
                        )}
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {j.description || 'Agricultural job opportunity.'}
                      </p>
                      {j.requiredSkills && (
                        <div className="flex flex-wrap gap-1.5">
                          {j.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 4).map((s) => (
                            <span key={s} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{s}</span>
                          ))}
                        </div>
                      )}
                      <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" /> {j.location || 'Sri Lanka'}</span>
                        {j._count && (
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {j._count.applications}</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-semibold text-primary">{money(j.wage)}</span>
                        {(j.startDate || j.endDate) && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" /> {formatDate(j.startDate)}{j.endDate ? ` – ${formatDate(j.endDate)}` : ''}
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>

        {/* SERVICES TAB */}
        <TabsContent value="services" className="mt-6">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={svcQ}
                onChange={(e) => setSvcQ(e.target.value)}
                placeholder="Search services…"
                className="pl-9"
              />
            </div>
            <Select value={svcCategory} onValueChange={setSvcCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                {SERVICE_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="hidden lg:block" />
          </div>

          <div className="mt-6">
            {servicesLoading ? (
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
            ) : services.length === 0 ? (
              <EmptyState
                icon={<Wrench className="h-6 w-6" />}
                title="No services listed"
                description="Workers and enterprises can list agricultural services from their dashboard."
              />
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {services.map((s) => (
                  <Card key={s.id} className="group overflow-hidden transition-shadow hover:shadow-md">
                    <div className="relative aspect-[4/3] overflow-hidden bg-muted/40">
                      {s.imageUrl ? (
                        <img
                          src={s.imageUrl}
                          alt={s.title}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-primary/30">
                          <Wrench className="h-10 w-10" />
                        </div>
                      )}
                      {s.category && (
                        <Badge className="absolute left-2 top-2 border-transparent bg-primary/90 text-primary-foreground">
                          {s.category}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="space-y-2 p-4">
                      <h3 className="line-clamp-1 font-semibold leading-tight">{s.title}</h3>
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {s.description || 'Agricultural service.'}
                      </p>
                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-lg font-bold text-primary">{money(s.price)}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1 truncate"><MapPin className="h-3 w-3" /> {s.district || 'Sri Lanka'}</span>
                        <span className="flex items-center gap-1 truncate"><Wallet className="h-3 w-3" /> {s.owner.name}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
