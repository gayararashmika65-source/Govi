import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized, apiError, audit, notify } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data, error } = await admin.from('agricultural_cases').select(`
      *,
      farmer:profiles!agricultural_cases_farmer_id_fkey(id, name, phone, avatar_url),
      expert:profiles!agricultural_cases_expert_id_fkey(id, name),
      case_attachments(*),
      consultations(*, messages:messages(*, sender:profiles!messages_sender_id_fkey(id, name, avatar_url)), recommendations:expert_recommendations(*, expert:profiles!expert_recommendations_expert_id_fkey(id, name))),
      recommendations:expert_recommendations(*, expert:profiles!expert_recommendations_expert_id_fkey(id, name))
    `).eq('id', id).single()
    if (error) return Response.json({ error: 'Not found' }, { status: 404 })
    const c = data as any
    // Authorization: farmer owner, assigned expert, open/under-review cases for experts, or admin
    const allowed =
      c.farmer_id === session.id ||
      c.expert_id === session.id ||
      session.role === 'ADMIN' ||
      (session.role === 'EXPERT' && (!c.expert_id || ['OPEN', 'UNDER_REVIEW'].includes(c.status)))
    if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })
    return Response.json({ case: snakeToCamel(c) })
  }

  // Prisma path
  const agriCase = await db.agriculturalCase.findUnique({
    where: { id },
    include: {
      farmer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      expert: { select: { id: true, name: true } },
      attachments: true,
      consultations: {
        include: {
          messages: { include: { sender: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
          recommendations: { include: { expert: { select: { id: true, name: true } } } },
        },
      },
      recommendations: { include: { expert: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!agriCase) return Response.json({ error: 'Not found' }, { status: 404 })
  const allowed =
    agriCase.farmerId === session.id ||
    agriCase.expertId === session.id ||
    session.role === 'ADMIN' ||
    (session.role === 'EXPERT' && (!agriCase.expertId || ['OPEN', 'UNDER_REVIEW'].includes(agriCase.status)))
  if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })
  return Response.json({ case: agriCase })
}

// PATCH: update case status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const { status, expertId } = body as { status?: string; expertId?: string | null }

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: existing, error: e1 } = await admin.from('agricultural_cases').select('farmer_id, expert_id, title').eq('id', id).single()
    if (e1 || !existing) return apiError('Case not found', 404)
    const allowed = existing.farmer_id === session.id || existing.expert_id === session.id || session.role === 'ADMIN'
    if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })

    const update: Record<string, unknown> = {}
    if (status) update.status = status
    if (expertId !== undefined) update.expert_id = expertId
    const { data: updated, error } = await admin.from('agricultural_cases').update(update).eq('id', id).select().single()
    if (error) return apiError(error.message, 500)

    if (status === 'RESOLVED') {
      await notify(existing.farmer_id, 'CASE', 'Case resolved', `Your case “${existing.title}” has been marked resolved.`)
      if (existing.expert_id && existing.expert_id !== session.id) {
        await notify(existing.expert_id, 'CASE', 'Case resolved', `Case “${existing.title}” was marked resolved.`)
      }
    }
    await audit(session.id, 'CASE_UPDATE', id, `status=${status ?? 'unchanged'}`)
    return Response.json({ case: snakeToCamel(updated) })
  }

  // Prisma path
  const existing = await db.agriculturalCase.findUnique({ where: { id } })
  if (!existing) return apiError('Case not found', 404)
  const allowed = existing.farmerId === session.id || existing.expertId === session.id || session.role === 'ADMIN'
  if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })
  const updated = await db.agriculturalCase.update({
    where: { id },
    data: { ...(status ? { status } : {}), ...(expertId !== undefined ? { expertId } : {}) },
  })
  if (status === 'RESOLVED') {
    await notify(existing.farmerId, 'CASE', 'Case resolved', `Your case “${existing.title}” has been marked resolved.`)
    if (existing.expertId && existing.expertId !== session.id) await notify(existing.expertId, 'CASE', 'Case resolved', `Case “${existing.title}” was marked resolved.`)
  }
  await audit(session.id, 'CASE_UPDATE', id, `status=${status ?? 'unchanged'}`)
  return Response.json({ case: updated })
}
