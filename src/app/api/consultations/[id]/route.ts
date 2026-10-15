import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, notify, audit } from '@/lib/server-helpers'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params
  const consultation = await db.consultation.findUnique({
    where: { id },
    include: {
      agriCase: true,
      farmer: { select: { id: true, name: true, avatarUrl: true } },
      expert: { select: { id: true, name: true, avatarUrl: true } },
      messages: { include: { sender: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
    },
  })
  if (!consultation) return Response.json({ error: 'Not found' }, { status: 404 })
  const allowed = consultation.farmerId === session.id || consultation.expertId === session.id || session.role === 'ADMIN'
  if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })
  return Response.json({ consultation })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const { status, scheduledAt } = body as { status?: string; scheduledAt?: string }

  const existing = await db.consultation.findUnique({ where: { id } })
  if (!existing) return apiError('Not found', 404)
  const allowed = existing.farmerId === session.id || existing.expertId === session.id
  if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const updated = await db.consultation.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}),
    },
  })

  // Notify the other party
  const otherId = session.id === existing.farmerId ? existing.expertId : existing.farmerId
  const verb = status === 'ACCEPTED' ? 'accepted' : status === 'DECLINED' ? 'declined' : status === 'COMPLETED' ? 'completed' : 'updated'
  await notify(otherId, 'CONSULTATION', `Consultation ${verb}`, `A consultation request was ${verb}.`)
  await audit(session.id, 'CONSULTATION_UPDATE', id, `status=${status ?? 'updated'}`)

  // Update the underlying case status to match consultation progress
  if (status === 'ACCEPTED' || status === 'SCHEDULED') {
    await db.agriculturalCase.updateMany({
      where: { id: existing.caseId },
      data: { status: 'IN_PROGRESS', expertId: existing.expertId },
    })
  }
  if (status === 'COMPLETED') {
    await db.agriculturalCase.updateMany({ where: { id: existing.caseId }, data: { status: 'RESOLVED' } })
  }

  return Response.json({ consultation: updated })
}
