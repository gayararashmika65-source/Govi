import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, notify } from '@/lib/server-helpers'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params
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
  const consultation = await db.consultation.findUnique({ where: { id }, select: { farmerId: true, expertId: true, status: true } })
  if (!consultation) return apiError('Consultation not found', 404)
  const allowed = consultation.farmerId === session.id || consultation.expertId === session.id
  if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })
  if (consultation.status === 'DECLINED' || consultation.status === 'CANCELLED') {
    return apiError('This consultation is closed')
  }

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
