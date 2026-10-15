import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized, apiError, notify, audit } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: consultation, error } = await admin.from('consultations').select(`
      *, agri_case:agricultural_cases(*), farmer:profiles!consultations_farmer_id_fkey(id, name, avatar_url),
      expert:profiles!consultations_expert_id_fkey(id, name, avatar_url),
      messages:messages(*, sender:profiles!messages_sender_id_fkey(id, name, avatar_url))
    `).eq('id', id).single()
    if (error || !consultation) return Response.json({ error: 'Not found' }, { status: 404 })
    const allowed = consultation.farmer_id === session.id || consultation.expert_id === session.id || session.role === 'ADMIN'
    if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })
    return Response.json({ consultation: snakeToCamel(consultation) })
  }

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
  const allowed = consultation.farmerId === session.id || consultation.expertId === session.id
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

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: existing } = await admin.from('consultations').select('farmer_id, expert_id, case_id').eq('id', id).single()
    if (!existing) return apiError('Not found', 404)
    const allowed = existing.farmer_id === session.id || existing.expert_id === session.id || session.role === 'ADMIN'
    if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })
    const update: Record<string, unknown> = {}
    if (status) update.status = status
    if (scheduledAt) update.scheduled_at = new Date(scheduledAt).toISOString()
    const { data: updated, error } = await admin.from('consultations').update(update).eq('id', id).select().single()
    if (error) return apiError(error.message, 500)
    const otherId = session.id === existing.farmer_id ? existing.expert_id : existing.farmer_id
    const verb = status === 'ACCEPTED' ? 'accepted' : status === 'DECLINED' ? 'declined' : status === 'COMPLETED' ? 'completed' : 'updated'
    if (status) await notify(otherId, 'CONSULTATION', `Consultation ${verb}`, `A consultation request was ${verb}.`)
    await audit(session.id, 'CONSULTATION_UPDATE', id, `status=${status ?? 'updated'}`)
    if (status === 'ACCEPTED' || status === 'SCHEDULED') {
      await admin.from('agricultural_cases').update({ status: 'IN_PROGRESS', expert_id: existing.expert_id }).eq('id', existing.case_id)
    }
    if (status === 'COMPLETED') {
      await admin.from('agricultural_cases').update({ status: 'RESOLVED' }).eq('id', existing.case_id)
    }
    return Response.json({ consultation: snakeToCamel(updated) })
  }

  // Prisma path
  const existing = await db.consultation.findUnique({ where: { id }, select: { farmerId: true, expertId: true, caseId: true } })
  if (!existing) return apiError('Not found', 404)
  const allowed = existing.farmerId === session.id || existing.expertId === session.id
  if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const updated = await db.consultation.update({
    where: { id },
    data: { ...(status ? { status } : {}), ...(scheduledAt ? { scheduledAt: new Date(scheduledAt) } : {}) },
  })
  const otherId = session.id === existing.farmerId ? existing.expertId : existing.farmerId
  const verb = status === 'ACCEPTED' ? 'accepted' : status === 'DECLINED' ? 'declined' : status === 'COMPLETED' ? 'completed' : 'updated'
  await notify(otherId, 'CONSULTATION', `Consultation ${verb}`, `A consultation request was ${verb}.`)
  await audit(session.id, 'CONSULTATION_UPDATE', id, `status=${status ?? 'updated'}`)
  if (status === 'ACCEPTED' || status === 'SCHEDULED') {
    await db.agriculturalCase.updateMany({ where: { id: existing.caseId }, data: { status: 'IN_PROGRESS', expertId: existing.expertId } })
  }
  if (status === 'COMPLETED') {
    await db.agriculturalCase.updateMany({ where: { id: existing.caseId }, data: { status: 'RESOLVED' } })
  }
  return Response.json({ consultation: updated })
}
