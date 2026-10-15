'use client'
import { useEffect, useRef, useState } from 'react'
import { api, useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Send, ArrowLeft, Loader2, CheckCheck } from 'lucide-react'
import { timeAgo } from '@/components/govisahana/common'
import { toast } from 'sonner'

type Message = { id: string; body: string; read: boolean; createdAt: string; sender: { id: string; name: string; avatarUrl?: string | null } }
type Consultation = {
  id: string; status: string; type: string
  farmer: { id: string; name: string; avatarUrl?: string | null }
  expert: { id: string; name: string; avatarUrl?: string | null }
  agriCase: { id: string; title: string }
}

export function MessagingPanel({ consultationId, onBack }: { consultationId: string; onBack: () => void }) {
  const { user } = useApp()
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const load = async () => {
    try {
      const [c, m] = await Promise.all([
        api<{ consultation: Consultation }>(`/api/consultations/${consultationId}`),
        api<{ messages: Message[] }>(`/api/consultations/${consultationId}/messages`),
      ])
      setConsultation(c.consultation)
      setMessages(m.messages)
    } catch { /* ignore */ } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    const t = setInterval(load, 4000)
    return () => clearInterval(t)
     
  }, [consultationId])

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages.length])

  const send = async () => {
    if (!text.trim()) return
    setSending(true)
    const body = text
    setText('')
    try {
      const data = await api<{ message: Message }>(`/api/consultations/${consultationId}/messages`, {
        method: 'POST', body: JSON.stringify({ body }),
      })
      setMessages((m) => [...m, data.message])
    } catch (e) {
      setText(body)
      toast.error((e as Error).message)
    } finally {
      setSending(false)
    }
  }

  if (loading) return <div className="flex h-64 items-center justify-center text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin" /></div>
  if (!consultation) return <div className="p-6 text-center text-muted-foreground">Consultation not found.</div>

  const other = consultation.farmer.id === user?.id ? consultation.expert : consultation.farmer

  return (
    <div className="flex h-[calc(100vh-9rem)] flex-col rounded-xl border border-border bg-card">
      <div className="flex items-center gap-3 border-b border-border p-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8"><ArrowLeft className="h-4 w-4" /></Button>
        <Avatar className="h-9 w-9"><AvatarImage src={other.avatarUrl || undefined} /><AvatarFallback className="bg-primary/10 text-xs text-primary">{other.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}</AvatarFallback></Avatar>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">{other.name}</div>
          <div className="truncate text-xs text-muted-foreground">Re: {consultation.agriCase.title}</div>
        </div>
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium capitalize">{consultation.type.toLowerCase()} · {consultation.status.toLowerCase()}</span>
      </div>

      <div ref={scrollRef} className="gs-scroll flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Start the conversation.</p>}
        {messages.map((m) => {
          const mine = m.sender.id === user?.id
          return (
            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[78%] ${mine ? 'items-end' : 'items-start'} flex flex-col`}>
                {!mine && <span className="mb-0.5 text-xs text-muted-foreground">{m.sender.name}</span>}
                <div className={`rounded-2xl px-3.5 py-2 text-sm ${mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'}`}>
                  {m.body}
                </div>
                <span className={`mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground ${mine ? 'flex-row-reverse' : ''}`}>
                  {timeAgo(m.createdAt)} {mine && <CheckCheck className="h-3 w-3" />}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="border-t border-border p-3">
        <div className="flex items-center gap-2">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Type a message…"
            disabled={consultation.status === 'DECLINED' || consultation.status === 'CANCELLED'}
          />
          <Button size="icon" onClick={send} disabled={sending || !text.trim() || consultation.status === 'DECLINED' || consultation.status === 'CANCELLED'} className="bg-primary hover:bg-primary/90">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        {(consultation.status === 'DECLINED' || consultation.status === 'CANCELLED') && (
          <p className="mt-2 text-center text-xs text-muted-foreground">This consultation is closed.</p>
        )}
      </div>
    </div>
  )
}
