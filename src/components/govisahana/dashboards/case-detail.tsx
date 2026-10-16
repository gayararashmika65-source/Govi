'use client'
import { useEffect, useState } from 'react'
import { api, useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Image as ImageIcon, MessageSquare, ClipboardList, Loader2, CheckCircle2, User, MapPin, Sprout, Tag } from 'lucide-react'
import { StatusBadge } from '@/components/govisahana/badges'
import { formatDate, timeAgo, EmptyState } from '@/components/govisahana/common'
import { MessagingPanel } from '@/components/govisahana/shared/messaging-panel'
import { toast } from 'sonner'
import { CASE_CATEGORIES, CASE_STATUS } from '@/lib/types'

type AgriCase = {
  id: string; title: string; description: string; crop: string; category: string; status: string; district?: string | null
  createdAt: string
  farmer: { id: string; name: string; phone?: string | null; avatarUrl?: string | null }
  expert?: { id: string; name: string } | null
  attachments: { id: string; filePath: string }[]
  consultations: { id: string; status: string; type: string; farmerId: string; expertId: string; messages: any[]; recommendations: any[] }[]
  recommendations: { id: string; diagnosis: string; advice: string; followUpNeeded: boolean; createdAt: string; expert: { id: string; name: string } }[]
}

export function CaseDetailPanel({ caseId, onBack, dash, isExpert }: { caseId: string; onBack: () => void; dash?: { openSubView: (t: 'messaging', id?: string) => void }; isExpert?: boolean }) {
  const { user } = useApp()
  const [agriCase, setCase] = useState<AgriCase | null>(null)
  const [loading, setLoading] = useState(true)
  const [messagingConsultationId, setMessagingConsultationId] = useState<string | null>(null)
  const [showRecForm, setShowRecForm] = useState(false)
  const [diagnosis, setDiagnosis] = useState('')
  const [advice, setAdvice] = useState('')
  const [followUp, setFollowUp] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const load = async () => {
    try {
      const data = await api<{ case: AgriCase }>(`/api/cases/${caseId}`)
      setCase(data.case)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [caseId])  

  const acceptCase = async () => {
    try {
      const res = await api<{ case: AgriCase; consultationId?: string }>(`/api/cases/${caseId}/assign`, { method: 'POST', body: JSON.stringify({}) })
      toast.success('Case accepted! You can now chat with the farmer.')
      if (res?.consultationId) {
        setMessagingConsultationId(res.consultationId)
      } else {
        load()
      }
    } catch (e) { toast.error((e as Error).message) }
  }

  const startConsultation = async () => {
    if (!agriCase) return
    try {
      const res = await api<{ consultation: { id: string } }>('/api/consultations', {
        method: 'POST',
        body: JSON.stringify({
          caseId,
          expertId: agriCase.expert?.id || user?.id,
          type: 'CHAT',
        }),
      })
      toast.success('Chat room opened')
      setMessagingConsultationId(res.consultation.id)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  const updateStatus = async (status: string) => {
    try {
      await api(`/api/cases/${caseId}`, { method: 'PATCH', body: JSON.stringify({ status }) })
      toast.success(`Case marked as ${status.toLowerCase().replace('_', ' ')}`)
      load()
    } catch (e) { toast.error((e as Error).message) }
  }

  const submitRec = async () => {
    if (!diagnosis || !advice) { toast.error('Please fill diagnosis and advice'); return }
    setSubmitting(true)
    try {
      await api('/api/recommendations', { method: 'POST', body: JSON.stringify({ caseId, diagnosis, advice, followUpNeeded: followUp }) })
      toast.success('Recommendation submitted and case resolved')
      setDiagnosis(''); setAdvice(''); setFollowUp(false); setShowRecForm(false)
      load()
    } catch (e) { toast.error((e as Error).message) } finally { setSubmitting(false) }
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
  if (!agriCase) return <EmptyState title="Case not found" action={<Button variant="outline" onClick={onBack}>Back</Button>} />

  if (messagingConsultationId) {
    return <MessagingPanel consultationId={messagingConsultationId} onBack={() => setMessagingConsultationId(null)} />
  }

  const activeConsultation = agriCase.consultations[0]
  const category = CASE_CATEGORIES.find((c) => c.value === agriCase.category)

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="mr-2 h-4 w-4" /> Back</Button>
        <StatusBadge status={agriCase.status} />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-5">
          {/* Case header */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sprout className="h-3.5 w-3.5 text-primary" /> {agriCase.crop}
                <span className="text-border">·</span>
                <Tag className="h-3.5 w-3.5 text-primary" /> {category?.label || agriCase.category}
                <span className="text-border">·</span>
                <span>{timeAgo(agriCase.createdAt)}</span>
              </div>
              <CardTitle className="text-xl">{agriCase.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground leading-relaxed">{agriCase.description}</p>
              {agriCase.district && <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="h-3.5 w-3.5" /> {agriCase.district}</p>}
            </CardContent>
          </Card>

          {/* Attachments */}
          {agriCase.attachments.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Photographs</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {agriCase.attachments.map((a) => (
                    <a key={a.id} href={a.filePath} target="_blank" rel="noreferrer" className="overflow-hidden rounded-lg border border-border">
                      <img src={a.filePath} alt="case attachment" className="h-28 w-full object-cover" />
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recommendations */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Expert recommendations</CardTitle>
              {isExpert && !showRecForm && agriCase.status !== 'RESOLVED' && agriCase.status !== 'CLOSED' && (
                <Button size="sm" onClick={() => setShowRecForm(true)}><ClipboardList className="mr-2 h-4 w-4" /> Add recommendation</Button>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              {showRecForm && (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                  <div className="space-y-2"><Label>Diagnosis</Label><Textarea value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="Identify the likely issue…" rows={2} /></div>
                  <div className="space-y-2"><Label>Recommended actions</Label><Textarea value={advice} onChange={(e) => setAdvice(e.target.value)} placeholder="Step-by-step recommendations for the farmer…" rows={4} /></div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={followUp} onChange={(e) => setFollowUp(e.target.checked)} className="rounded" /> Follow-up needed</label>
                  <div className="flex gap-2">
                    <Button onClick={submitRec} disabled={submitting}>{submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null} Submit & resolve</Button>
                    <Button variant="outline" onClick={() => setShowRecForm(false)}>Cancel</Button>
                  </div>
                </div>
              )}
              {agriCase.recommendations.length === 0 && !showRecForm ? (
                <EmptyState icon={<ClipboardList className="h-5 w-5" />} title="No recommendations yet" description={isExpert ? 'Submit your diagnosis and advice for this case.' : 'An expert will add recommendations here.'} />
              ) : (
                agriCase.recommendations.map((r) => (
                  <div key={r.id} className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-emerald-900">{r.expert.name}</span>
                      <span className="text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm"><span className="font-medium">Diagnosis: </span>{r.diagnosis}</p>
                    <p className="mt-1 text-sm"><span className="font-medium">Advice: </span>{r.advice}</p>
                    {r.followUpNeeded && <span className="mt-2 inline-block rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">Follow-up needed</span>}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          {/* Farmer info */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Reported by</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" /> {agriCase.farmer?.name || 'Farmer'}</div>
              {agriCase.farmer?.phone && <div className="flex items-center gap-2 text-muted-foreground"><span className="h-4 w-4" /> {agriCase.farmer.phone}</div>}
            </CardContent>
          </Card>

          {/* Assigned expert / actions */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Assigned expert</CardTitle></CardHeader>
            <CardContent className="space-y-3 text-sm">
              {agriCase.expert ? (
                <div className="flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {(agriCase.expert.name || 'Expert').split(' ').filter(Boolean).map((s) => s[0]).slice(0, 2).join('')}
                  </span>
                  <span className="font-medium">{agriCase.expert.name}</span>
                </div>
              ) : (
                <p className="text-muted-foreground">Not yet assigned</p>
              )}

              {/* Expert actions */}
              {isExpert && !agriCase.expert && (
                <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" onClick={acceptCase}>
                  <ClipboardList className="mr-2 h-4 w-4" /> Accept this case & chat
                </Button>
              )}
              {isExpert && agriCase.expert?.id === user?.id && agriCase.status !== 'RESOLVED' && agriCase.status !== 'CLOSED' && (
                <>
                  <Select onValueChange={(v) => updateStatus(v)}>
                    <SelectTrigger><SelectValue placeholder="Update status" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(CASE_STATUS).filter(([k]) => !['OPEN', 'CANCELLED'].includes(k)).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </>
              )}

              {/* Farmer actions */}
              {!isExpert && agriCase.farmer?.id === user?.id && agriCase.status !== 'CLOSED' && agriCase.status !== 'RESOLVED' && (
                <Select onValueChange={(v) => updateStatus(v)}>
                  <SelectTrigger><SelectValue placeholder="Update status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CLOSED">Close case</SelectItem>
                    <SelectItem value="CANCELLED">Cancel case</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </CardContent>
          </Card>

          {/* Consultation / messaging */}
          <Card>
            <CardHeader><CardTitle className="text-sm">Consultation & Chat</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {activeConsultation ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <StatusBadge status={activeConsultation.status} />
                  </div>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => setMessagingConsultationId(activeConsultation.id)}>
                    <MessageSquare className="mr-2 h-4 w-4" /> Open chat room
                  </Button>
                </>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {agriCase.expert ? 'Expert assigned. Start a real-time consultation.' : 'Waiting for an agricultural expert to review your case.'}
                  </p>
                  {(agriCase.expert || isExpert) && (
                    <Button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" onClick={startConsultation}>
                      <MessageSquare className="mr-2 h-4 w-4" /> Start chat consultation
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
