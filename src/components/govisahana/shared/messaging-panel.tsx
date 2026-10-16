'use client'
import { useEffect, useRef, useState } from 'react'
import { api, useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Send,
  ArrowLeft,
  Loader2,
  CheckCheck,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react'
import { timeAgo } from '@/components/govisahana/common'
import { toast } from 'sonner'

type Message = {
  id: string
  body: string
  read: boolean
  createdAt: string
  sender?: { id: string; name: string; avatarUrl?: string | null } | null
}

type Consultation = {
  id: string
  status: string
  type: string
  caseId?: string
  farmer?: { id: string; name: string; avatarUrl?: string | null } | null
  expert?: { id: string; name: string; avatarUrl?: string | null } | null
  agriCase?: { id: string; title: string } | null
}

function getInitials(name?: string | null) {
  if (!name) return 'U'
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((s) => s[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'U'
  )
}

function parseMessageBody(body: string) {
  const photoMatch = body.match(/\[PHOTO:([^\]]+)\]/)
  if (photoMatch) {
    const photoUrl = photoMatch[1].trim()
    const textCaption = body.replace(photoMatch[0], '').trim()
    return { photoUrl, textCaption: textCaption || null }
  }
  const isDirectImageUrl =
    body.startsWith('http') &&
    /\.(jpg|jpeg|png|webp|gif)($|\?)/i.test(body)
  if (isDirectImageUrl) {
    return { photoUrl: body.trim(), textCaption: null }
  }
  return { photoUrl: null, textCaption: body }
}

export function MessagingPanel({ consultationId, onBack }: { consultationId: string; onBack: () => void }) {
  const { user } = useApp()
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    try {
      const [c, m] = await Promise.all([
        api<{ consultation: Consultation }>(`/api/consultations/${consultationId}`),
        api<{ messages: Message[] }>(`/api/consultations/${consultationId}/messages`),
      ])
      if (c?.consultation) setConsultation(c.consultation)
      if (m?.messages) setMessages(m.messages)
    } catch {
      /* ignore transient poll error */
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 3000)
    return () => clearInterval(t)
  }, [consultationId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const send = async (customBody?: string) => {
    const messageToSend = (customBody || text).trim()
    if (!messageToSend) return
    setSending(true)
    if (!customBody) setText('')
    try {
      const data = await api<{ message: Message }>(`/api/consultations/${consultationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body: messageToSend }),
      })
      if (data?.message) {
        setMessages((m) => [...m, data.message])
      }
    } catch (e) {
      if (!customBody) setText(messageToSend)
      toast.error((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Photo too large (max 5MB)')
      return
    }
    setUploadingPhoto(true)
    const caption = text.trim()
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      const body = caption ? `[PHOTO:${data.url}] ${caption}` : `[PHOTO:${data.url}]`
      setText('')
      const msgRes = await api<{ message: Message }>(`/api/consultations/${consultationId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      })
      if (msgRes?.message) {
        setMessages((m) => [...m, msgRes.message])
      }
      toast.success('Photo shared in chat')
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setUploadingPhoto(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleUpdateStatus = async (status: string) => {
    setUpdatingStatus(true)
    try {
      await api(`/api/consultations/${consultationId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      })
      setConsultation((prev) => (prev ? { ...prev, status } : null))
      toast.success(`Consultation ${status.toLowerCase()}`)
      load()
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setUpdatingStatus(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!consultation) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-muted-foreground">Consultation room not found or unavailable.</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Go back
          </Button>
          <Button size="sm" onClick={load}>
            <RefreshCw className="mr-2 h-4 w-4" /> Retry
          </Button>
        </div>
      </div>
    )
  }

  const isFarmer = consultation.farmer?.id === user?.id
  const isExpert = consultation.expert?.id === user?.id || user?.role === 'EXPERT'
  const other = isFarmer ? consultation.expert : consultation.farmer
  const otherName =
    other?.name || (isFarmer ? 'Agricultural Expert' : 'Farmer')
  const otherAvatar = other?.avatarUrl
  const caseTitle = consultation.agriCase?.title || 'Agricultural Case Consultation'
  const isClosed = consultation.status === 'DECLINED' || consultation.status === 'CANCELLED'

  const quickReplies = isExpert
    ? [
        'Please send a close-up photo of the affected leaves.',
        'Drain excess standing water from the field.',
        'What fertilizer have you applied recently?',
      ]
    : [
        'Symptoms started 3 days ago.',
        'Can you review the attached photo?',
        'Which treatment do you recommend?',
      ]

  return (
    <div className="flex h-[calc(100vh-8.5rem)] flex-col rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8 shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <Avatar className="h-9 w-9 border border-border">
          <AvatarImage src={otherAvatar || undefined} />
          <AvatarFallback className="bg-primary/10 text-xs text-primary font-bold">
            {getInitials(otherName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold">{otherName}</span>
            <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-700 dark:text-emerald-400">
              ● Active
            </span>
          </div>
          <div className="truncate text-xs text-muted-foreground">Re: {caseTitle}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium capitalize text-muted-foreground">
            {consultation.type?.toLowerCase() || 'chat'} · {consultation.status?.toLowerCase() || 'open'}
          </span>
        </div>
      </div>

      {/* Action banner for Expert if REQUESTED */}
      {consultation.status === 'REQUESTED' && isExpert && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-200">
          <span>This consultation is requested by the farmer. Accept to start real-time advisory.</span>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={updatingStatus}
              onClick={() => handleUpdateStatus('ACCEPTED')}
              className="h-7 bg-white text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Accept
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={updatingStatus}
              onClick={() => handleUpdateStatus('DECLINED')}
              className="h-7 text-rose-600 hover:bg-rose-50"
            >
              <XCircle className="mr-1 h-3.5 w-3.5" /> Decline
            </Button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div ref={scrollRef} className="gs-scroll flex-1 space-y-3.5 overflow-y-auto p-4 bg-muted/10">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <Sparkles className="mb-2 h-8 w-8 text-primary/40" />
            <p className="text-sm font-medium">No messages yet</p>
            <p className="text-xs">Send a message or photograph to start the consultation.</p>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender?.id === user?.id
            const senderName = m.sender?.name || (mine ? 'You' : otherName)
            const { photoUrl, textCaption } = parseMessageBody(m.body)

            return (
              <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[82%] sm:max-w-[70%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                  {!mine && (
                    <span className="mb-1 text-[11px] font-medium text-muted-foreground">
                      {senderName}
                    </span>
                  )}
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                      mine
                        ? 'bg-primary text-primary-foreground rounded-br-xs'
                        : 'bg-card text-card-foreground border border-border rounded-bl-xs'
                    }`}
                  >
                    {photoUrl ? (
                      <div className="space-y-2">
                        <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10 bg-black/5">
                          <img
                            src={photoUrl}
                            alt="Photo attachment"
                            className="max-h-72 w-auto max-w-full rounded-xl object-contain cursor-pointer transition-transform hover:scale-[1.01]"
                            onClick={() => window.open(photoUrl, '_blank')}
                            loading="lazy"
                          />
                        </div>
                        {textCaption && (
                          <p className="whitespace-pre-wrap leading-relaxed">{textCaption}</p>
                        )}
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap leading-relaxed">{m.body}</p>
                    )}
                  </div>
                  <span
                    className={`mt-1 flex items-center gap-1 text-[10px] text-muted-foreground ${
                      mine ? 'flex-row-reverse' : ''
                    }`}
                  >
                    {timeAgo(m.createdAt)} {mine && <CheckCheck className="h-3 w-3 text-primary" />}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>

      {/* Quick suggestions & Input area */}
      <div className="border-t border-border bg-card p-3 space-y-2">
        {!isClosed && messages.length <= 8 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
            <span className="text-[11px] font-medium text-muted-foreground shrink-0">Quick:</span>
            {quickReplies.map((qr, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setText(qr)}
                className="shrink-0 rounded-full border border-border bg-muted/40 px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {qr}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoUpload}
            accept="image/*"
            className="hidden"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingPhoto || isClosed}
            className="h-10 w-10 shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
            title="Attach a crop photo"
          >
            {uploadingPhoto ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImageIcon className="h-5 w-5" />}
          </Button>

          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
            placeholder={isClosed ? 'This consultation is closed' : 'Type a message… (Press Enter to send)'}
            disabled={isClosed}
            className="flex-1 h-10"
          />
          <Button
            size="icon"
            onClick={() => send()}
            disabled={sending || !text.trim() || isClosed}
            className="h-10 w-10 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xs"
          >
            {sending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>

        {isClosed && (
          <p className="text-center text-xs text-muted-foreground pt-1">
            This consultation is closed. Messages cannot be sent.
          </p>
        )}
      </div>
    </div>
  )
}

