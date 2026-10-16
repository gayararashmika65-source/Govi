 
'use client'
import { useEffect, useState, type ReactNode } from 'react'
import { useApp, api } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { EmptyState, money, formatDate } from '@/components/govisahana/common'
import { VerifiedBadge } from '@/components/govisahana/badges'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Star,
  MapPin,
  Mail,
  Phone,
  Sprout,
  Languages,
  Wallet,
  MessageSquare,
  Calendar,
  Stethoscope,
  GraduationCap,
  BookOpen,
  Loader2,
  Plus,
} from 'lucide-react'

type Recommendation = {
  id: string
  diagnosis: string
  advice: string
  createdAt: string
  agriCase?: {
    id: string
    title?: string
    crop?: string
    category?: string
  } | null
}

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
  user: {
    id: string
    name: string
    email?: string | null
    phone?: string | null
    avatarUrl?: string | null
  }
  recommendations?: Recommendation[]
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

function Chip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{children}</span>
  )
}

function SectionLabel({ icon: Icon, children }: { icon: typeof Sprout; children: ReactNode }) {
  return (
    <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      <Icon className="h-3.5 w-3.5" /> {children}
    </h3>
  )
}

export default function ExpertDetailView() {
  const id = useApp((s) => s.viewParam)
  const { setView, user } = useApp()
  const [expert, setExpert] = useState<Expert | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setNotFound(false)
    setExpert(null)
    fetch(`/api/experts/${id}`, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Not found')
        const d = await r.json()
        if (!active) return
        if (!d.expert) {
          setNotFound(true)
        } else {
          setExpert(d.expert)
        }
      })
      .catch(() => {
        if (active) setNotFound(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  const [showConsultModal, setShowConsultModal] = useState(false)
  const [cases, setCases] = useState<any[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string>('')
  const [consultMessage, setConsultMessage] = useState('')
  const [submittingConsult, setSubmittingConsult] = useState(false)
  const [loadingCases, setLoadingCases] = useState(false)

  const handleConsult = async () => {
    if (!user) {
      setView('login')
      return
    }
    if (user.role !== 'FARMER') {
      toast.error('Only registered farmers can request consultations.')
      return
    }
    setShowConsultModal(true)
    setLoadingCases(true)
    try {
      const res = await fetch('/api/cases', { credentials: 'include' })
      const data = await res.json()
      const farmerCases = (data.cases || []).filter((c: any) => c.status !== 'CLOSED' && c.status !== 'CANCELLED')
      setCases(farmerCases)
      if (farmerCases.length > 0) {
        setSelectedCaseId(farmerCases[0].id)
      }
    } catch {
      /* ignore */
    } finally {
      setLoadingCases(false)
    }
  }

  const submitConsultationRequest = async () => {
    if (!expert || !selectedCaseId) {
      toast.error('Please select an agricultural case.')
      return
    }
    setSubmittingConsult(true)
    try {
      await api('/api/consultations', {
        method: 'POST',
        body: JSON.stringify({
          caseId: selectedCaseId,
          expertId: expert.user.id,
          type: 'CHAT',
          message: consultMessage.trim() || undefined,
        }),
      })
      toast.success(`Consultation request sent to ${expert.user.name}! Opening dashboard...`)
      setShowConsultModal(false)
      setView('dashboard')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSubmittingConsult(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-6 h-9 w-28 animate-pulse rounded bg-muted/40" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="h-44 animate-pulse rounded-xl border border-border bg-muted/40" />
            <div className="h-48 animate-pulse rounded-xl border border-border bg-muted/40" />
          </div>
          <div className="space-y-4">
            <div className="h-56 animate-pulse rounded-xl border border-border bg-muted/40" />
            <div className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !expert) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <Button variant="ghost" onClick={() => setView('experts')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to experts
        </Button>
        <EmptyState
          icon={<Stethoscope className="h-6 w-6" />}
          title="Expert not found"
          description="This profile may have been removed or the link is incorrect."
          action={
            <Button onClick={() => setView('experts')} className="bg-primary hover:bg-primary/90">
              Browse experts
            </Button>
          }
        />
      </div>
    )
  }

  const expertiseChips = splitList(expert.expertise)
  const cropChips = splitList(expert.crops)
  const langChips = splitList(expert.languages)
  const areaChips = splitList(expert.serviceAreas)
  const recs = expert.recommendations || []

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
      <Button variant="ghost" onClick={() => setView('experts')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to experts
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          {/* Profile header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={expert.user.avatarUrl || undefined} alt={expert.user.name} />
                  <AvatarFallback className="bg-primary/10 text-xl font-bold text-primary">
                    {initials(expert.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">{expert.user.name}</h1>
                    <VerifiedBadge verified={expert.verified} />
                  </div>
                  <p className="mt-1 flex items-center gap-1.5 text-muted-foreground">
                    <GraduationCap className="h-4 w-4 text-primary" />
                    {expert.title || 'Agricultural Expert'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                    {expert.rating ? (
                      <span className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        <span className="font-semibold">{Number(expert.rating).toFixed(1)}</span>
                        <span className="text-muted-foreground">rating</span>
                      </span>
                    ) : null}
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-4 w-4 text-primary" />
                      {areaChips[0] || 'Sri Lanka'}
                    </span>
                    <span
                      className={`flex items-center gap-1.5 ${
                        expert.available ? 'text-emerald-600' : 'text-muted-foreground'
                      }`}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          expert.available ? 'bg-emerald-500' : 'bg-muted-foreground/40'
                        }`}
                      />
                      {expert.available ? 'Available for consultations' : 'Currently busy'}
                    </span>
                  </div>
                </div>
              </div>

              <Separator className="my-5" />

              <section>
                <SectionLabel icon={BookOpen}>About</SectionLabel>
                <p className="mt-2 text-sm leading-7 text-foreground/90">
                  {expert.bio || 'No bio provided.'}
                </p>
              </section>

              {expertiseChips.length > 0 && (
                <section className="mt-5">
                  <SectionLabel icon={GraduationCap}>Expertise</SectionLabel>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {expertiseChips.map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </div>
                </section>
              )}

              {cropChips.length > 0 && (
                <section className="mt-4">
                  <SectionLabel icon={Sprout}>Crops</SectionLabel>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {cropChips.map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </div>
                </section>
              )}

              {langChips.length > 0 && (
                <section className="mt-4">
                  <SectionLabel icon={Languages}>Languages</SectionLabel>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {langChips.map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </div>
                </section>
              )}

              {areaChips.length > 0 && (
                <section className="mt-4">
                  <SectionLabel icon={MapPin}>Service Areas</SectionLabel>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {areaChips.map((t) => (
                      <Chip key={t}>{t}</Chip>
                    ))}
                  </div>
                </section>
              )}
            </CardContent>
          </Card>

          {/* Recent recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageSquare className="h-4 w-4 text-primary" /> Recent recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {recs.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No public recommendations yet. Once this expert resolves cases, their structured advice
                  will appear here.
                </p>
              ) : (
                <ul className="max-h-96 space-y-3 overflow-y-auto gs-scroll">
                  {recs.map((r) => (
                    <li key={r.id} className="rounded-lg border border-border bg-muted/30 p-4">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {r.agriCase?.crop && (
                          <Badge variant="outline" className="border-primary/20 text-primary">
                            {r.agriCase.crop}
                          </Badge>
                        )}
                        {r.agriCase?.category && (
                          <Badge variant="outline" className="border-border capitalize text-muted-foreground">
                            {r.agriCase.category.replace(/_/g, ' ').toLowerCase()}
                          </Badge>
                        )}
                        <span className="ml-auto flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {formatDate(r.createdAt)}
                        </span>
                      </div>
                      {r.agriCase?.title && (
                        <p className="mt-2 text-sm font-medium">{r.agriCase.title}</p>
                      )}
                      <p className="mt-1.5 text-sm text-foreground/90">
                        <span className="font-semibold text-primary">Diagnosis: </span>
                        {r.diagnosis}
                      </p>
                      <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                        <span className="font-semibold text-foreground/80">Advice: </span>
                        {r.advice}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Consultation
              </h3>

              <div className="mt-3 flex items-center justify-between rounded-lg bg-muted/40 px-4 py-3">
                <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Wallet className="h-4 w-4 text-primary" /> Hourly rate
                </span>
                <span className="font-bold text-primary">{money(expert.hourlyRate)}</span>
              </div>

              <div className="mt-4 space-y-2">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Contact
                </h4>
                {expert.user.email && (
                  <p className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-primary" />
                    <a
                      href={`mailto:${expert.user.email}`}
                      className="truncate hover:text-primary hover:underline"
                    >
                      {expert.user.email}
                    </a>
                  </p>
                )}
                {expert.user.phone && (
                  <p className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-primary" />
                    <a href={`tel:${expert.user.phone}`} className="hover:text-primary hover:underline">
                      {expert.user.phone}
                    </a>
                  </p>
                )}
                {!expert.user.email && !expert.user.phone && (
                  <p className="text-xs text-muted-foreground">
                    Contact details are shared once a consultation request is accepted.
                  </p>
                )}
              </div>

              <Separator className="my-4" />

              {/* Primary CTA */}
              {user?.role === 'FARMER' ? (
                <Button onClick={handleConsult} className="w-full bg-primary hover:bg-primary/90">
                  <Stethoscope className="mr-2 h-4 w-4" /> Request a consultation
                </Button>
              ) : !user ? (
                <Button
                  onClick={() => setView('login')}
                  className="w-full bg-primary hover:bg-primary/90"
                >
                  Sign in as a farmer to consult
                </Button>
              ) : (
                <div className="rounded-lg bg-muted/40 px-3 py-2 text-center text-xs text-muted-foreground">
                  Consultation requests are limited to farmer accounts.
                </div>
              )}

              <p className="mt-2 text-center text-xs text-muted-foreground">
                You'll be able to upload photos and chat once a consultation is accepted.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <BookOpen className="h-4 w-4 text-primary" /> Knowledge Hub
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Browse practical articles written by agricultural experts across Sri Lanka.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => setView('knowledge')}
              >
                Read articles
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* Consultation Request Dialog */}
      <Dialog open={showConsultModal} onOpenChange={setShowConsultModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" /> Request Consultation
            </DialogTitle>
            <DialogDescription>
              Connect directly with {expert?.user.name} for agricultural advice.
            </DialogDescription>
          </DialogHeader>

          {loadingCases ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : cases.length === 0 ? (
            <div className="space-y-4 py-3 text-center">
              <p className="text-sm text-muted-foreground">
                You haven't reported any agricultural cases yet. Report your problem first so the expert can review your crops and symptoms.
              </p>
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={() => {
                  setShowConsultModal(false)
                  setView('dashboard')
                }}
              >
                <Plus className="mr-2 h-4 w-4" /> Report a problem in dashboard
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Select Case *</Label>
                <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose one of your open cases" />
                  </SelectTrigger>
                  <SelectContent>
                    {cases.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.title} ({c.crop})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Initial Message / Problem Details (optional)</Label>
                <Textarea
                  value={consultMessage}
                  onChange={(e) => setConsultMessage(e.target.value)}
                  placeholder="Describe what help you need or ask your initial question..."
                  rows={3}
                />
              </div>

              <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground flex justify-between items-center">
                <span>Standard hourly consultation rate:</span>
                <span className="font-semibold text-primary">{money(expert?.hourlyRate)}</span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowConsultModal(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={submitConsultationRequest}
                  disabled={submittingConsult || !selectedCaseId}
                  className="bg-primary hover:bg-primary/90"
                >
                  {submittingConsult ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <MessageSquare className="mr-2 h-4 w-4" />
                  )}
                  Send Request
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
