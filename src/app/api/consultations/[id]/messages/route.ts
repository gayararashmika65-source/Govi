import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized, apiError, notify } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: consultation } = await admin.from('consultations').select('farmer_id, expert_id, status').eq('id', id).single()
    if (!consultation) return Response.json({ error: 'Not found' }, { status: 404 })
    const allowed = consultation.farmer_id === session.id || consultation.expert_id === session.id || session.role === 'ADMIN'
    if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })
    const { data: messages, error } = await admin.from('messages').select(`
      *, sender:profiles!messages_sender_id_fkey(id, name, avatar_url)
    `).eq('consultation_id', id).order('created_at', { ascending: true })
    if (error) return apiError(error.message, 500)
    return Response.json({ messages: (messages || []).map(snakeToCamel) })
  }

  const consultation = await db.consultation.findUnique({ where: { id }, select: { farmerId: true, expertId: true } })
  if (!consultation) return Response.json({ error: 'Not found' }, { status: 404 })
  const allowed = consultation.farmerId === session.id || consultation.expertId === session.id
  if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const messages = await db.message.findMany({
    where: { consultationId: id },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { createdAt: 'asc' },
  })
  return Response.json({ messages })
}

const schema = z.object({ body: z.string().min(1) })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: consultation } = await admin.from('consultations').select('farmer_id, expert_id, status').eq('id', id).single()
    if (!consultation) return apiError('Consultation not found', 404)
    const allowed = consultation.farmer_id === session.id || consultation.expert_id === session.id
    if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })
    if (consultation.status === 'DECLINED' || consultation.status === 'CANCELLED') return apiError('This consultation is closed')
    let body
    try { body = await req.json() } catch { return apiError('Invalid body') }
    const parsed = schema.safeParse(body)
    if (!parsed.success) return apiError('Message cannot be empty')
    const { data: message, error } = await admin.from('messages').insert({
      consultation_id: id, sender_id: session.id, body: parsed.data.body,
    }).select('*, sender:profiles!messages_sender_id_fkey(id, name, avatar_url)').single()
    if (error) return apiError(error.message, 500)
    const otherId = session.id === consultation.farmer_id ? consultation.expert_id : consultation.farmer_id
    await notify(otherId, 'MESSAGE', 'New message', parsed.data.body.slice(0, 80))
    return Response.json({ message: snakeToCamel(message) })
  }

  // Prisma path
  const consultation = await db.consultation.findUnique({ where: { id }, select: { farmerId: true, expertId: true, status: true } })
  if (!consultation) return apiError('Consultation not found', 404)
  const allowed = consultation.farmerId === session.id || consultation.expertId === session.id
  if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (consultation.status === 'DECLINED' || consultation.status === 'CANCELLED') return apiError('This consultation is closed')
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError('Message cannot be empty')
  const message = await db.message.create({
    data: { consultationId: id, senderId: session.id, body: parsed.data.body },
    include: { sender: { select: { id: true, name: true, avatarUrl: true } } },
  })
  const otherId = session.id === consultation.farmerId ? consultation.expertId : consultation.farmerId
  await notify(otherId, 'MESSAGE', 'New message', parsed.data.body.slice(0, 80))
  return Response.json({ message })
}
