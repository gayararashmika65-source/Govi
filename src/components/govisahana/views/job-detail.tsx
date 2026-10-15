'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { SectionHeader, EmptyState, money, formatDate } from '@/components/govisahana/common'
import {
  ArrowLeft, MapPin, Briefcase, Mail, Phone, Calendar, Wallet, User, CheckCircle2, Info,
} from 'lucide-react'
import { toast } from 'sonner'

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
  owner: { id: string; name: string; email?: string | null; phone?: string | null }
}

export default function JobDetailView() {
  const id = useApp((s) => s.viewParam)
  const { setView, user } = useApp()
  const [job, setJob] = useState<Job | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [coverNote, setCoverNote] = useState('')
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)

  useEffect(() => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    fetch(`/api/jobs/${id}`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((d) => setJob(d.job))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [id])

  async function apply() {
    if (!id) return
    if (!user) {
      setView('login')
      return
    }
    setApplying(true)
    try {
      const res = await fetch(`/api/jobs/${id}/applications`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverNote: coverNote.trim() || undefined }),
      })
      if (res.status === 409) {
        toast.info('You already applied')
        setApplied(true)
        return
      }
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to apply')
      }
      toast.success('Application submitted')
      setApplied(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to apply')
    } finally {
      setApplying(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Skeleton className="mb-4 h-8 w-32" />
        <div className="space-y-4">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    )
  }

  if (notFound || !job) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <Button variant="ghost" size="sm" onClick={() => setView('jobs')} className="mb-4 text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to jobs
        </Button>
        <EmptyState
          icon={<Briefcase className="h-6 w-6" />}
          title="Job not found"
          description="This job may have been removed or filled."
          action={<Button onClick={() => setView('jobs')} className="bg-primary hover:bg-primary/90">Browse jobs</Button>}
        />
      </div>
    )
  }

  const isOwner = user?.id === job.owner.id
  const isWorker = user?.role === 'WORKER'
  const jobOpen = job.status === 'OPEN' || !job.status

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Button variant="ghost" size="sm" onClick={() => setView('jobs')} className="mb-4 text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to jobs
      </Button>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main */}
        <div className="space-y-6 lg:col-span-2">
          <div>
            <div className="flex items-center gap-2">
              {job.status && (
                <Badge variant="outline" className={jobOpen ? 'border-emerald-300 bg-emerald-50 text-emerald-700' : 'border-amber-300 bg-amber-50 text-amber-700'}>
                  {job.status.replace(/_/g, ' ')}
                </Badge>
              )}
            </div>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{job.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              <span className="flex items-center gap-1"><MapPin className="h-4 w-4" /> {job.location || 'Sri Lanka'}</span>
              <span className="flex items-center gap-1"><Wallet className="h-4 w-4" /> {money(job.wage)}{job.paymentTerms ? ` · ${job.paymentTerms}` : ''}</span>
            </div>
          </div>

          {job.description && (
            <div>
              <h2 className="text-sm font-semibold">Job description</h2>
              <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">{job.description}</p>
            </div>
          )}

          {job.requiredSkills && (
            <div>
              <h2 className="text-sm font-semibold">Required skills</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {job.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean).map((s) => (
                  <span key={s} className="rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">{s}</span>
                ))}
              </div>
            </div>
          )}

          <Card>
            <CardContent className="grid grid-cols-2 gap-4 p-4 text-sm sm:grid-cols-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Start date</div>
                  <div className="font-medium">{formatDate(job.startDate)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">End date</div>
                  <div className="font-medium">{formatDate(job.endDate)}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs text-muted-foreground">Payment terms</div>
                  <div className="font-medium">{job.paymentTerms || '—'}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Posted by */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <User className="h-3.5 w-3.5 text-primary" /> Posted by
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="font-semibold">{job.owner.name}</div>
                {job.owner.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5" /> {job.owner.email}
                  </div>
                )}
                {job.owner.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5" /> {job.owner.phone}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Apply section */}
          <Card>
            <CardContent className="p-4">
              <SectionHeader title="Apply for this job" className="[&_h2]:text-base" />
              {isOwner ? (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <Info className="mt-0.5 h-4 w-4 text-primary" /> This is your job posting.
                </div>
              ) : isWorker ? (
                applied ? (
                  <div className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                    <CheckCircle2 className="mt-0.5 h-4 w-4" /> You’ve applied for this job. The employer will reach out if shortlisted.
                  </div>
                ) : (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor="coverNote">Cover note (optional)</Label>
                    <Textarea
                      id="coverNote"
                      value={coverNote}
                      onChange={(e) => setCoverNote(e.target.value)}
                      rows={4}
                      placeholder="Briefly describe your experience and availability…"
                    />
                    <Button onClick={apply} disabled={applying || !jobOpen} className="w-full bg-primary hover:bg-primary/90">
                      {applying ? 'Submitting…' : 'Apply now'}
                    </Button>
                    {!jobOpen && <p className="text-xs text-amber-600">This job is no longer accepting applications.</p>}
                  </div>
                )
              ) : user ? (
                <div className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-muted/30 p-3 text-sm text-muted-foreground">
                  <Info className="mt-0.5 h-4 w-4 text-primary" /> Only agricultural workers can apply for jobs. You can still contact the employer using their details above.
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  <p className="text-sm text-muted-foreground">Sign in as a worker to apply for this job.</p>
                  <Button onClick={() => setView('login')} variant="outline" className="w-full">Sign in to apply</Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
