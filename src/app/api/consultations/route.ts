import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized, apiError, notify, audit } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const caseId = searchParams.get('caseId')

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    let q = admin.from('consultations').select(`
      *, agri_case:agricultural_cases(id, title, crop, category, status),
      farmer:profiles!consultations_farmer_id_fkey(id, name, avatar_url),
      expert:profiles!consultations_expert_id_fkey(id, name, avatar_url)
    `)
    if (caseId) q = q.eq('case_id', caseId)
    else q = q.or(`farmer_id.eq.${session.id},expert_id.eq.${session.id}`)
    q = q.order('created_at', { ascending: false }).limit(100)
    const { data, error } = await q
    if (error) return apiError(error.message, 500)
    return Response.json({ consultations: (data || []).map(snakeToCamel) })
  }

  const where = {
    OR: [{ farmerId: session.id }, { expertId: session.id }],
    ...(caseId ? { caseId } : {}),
  }
  const consultations = await db.consultation.findMany({
    where, include: {
      agriCase: { select: { id: true, title: true, crop: true, category: true, status: true } },
      farmer: { select: { id: true, name: true, avatarUrl: true } },
      expert: { select: { id: true, name: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json({ consultations })
}

const schema = z.object({
  caseId: z.string(),
  expertId: z.string(),
  type: z.enum(['CHAT', 'VIDEO', 'IN_PERSON']).default('CHAT'),
  message: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid')

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: agriCase } = await admin.from('agricultural_cases').select('id, farmer_id, title').eq('id', parsed.data.caseId).single()
    if (!agriCase) return apiError('Case not found', 404)
    const farmerId = session.role === 'FARMER' ? session.id : agriCase.farmer_id
    const expertId = parsed.data.expertId
    const { data: consultation, error } = await admin.from('consultations').insert({
      case_id: parsed.data.caseId, farmer_id: farmerId, expert_id: expertId,
      type: parsed.data.type, status: 'REQUESTED',
    }).select().single()
    if (error) return apiError(error.message, 500)
    await notify(expertId, 'CONSULTATION', 'New consultation request', `A farmer requested a consultation for “${agriCase.title}”.`)
    if (parsed.data.message) {
      await admin.from('messages').insert({ consultation_id: consultation.id, sender_id: farmerId, body: parsed.data.message })
    }
    await audit(session.id, 'CONSULTATION_REQUEST', consultation.id, `Requested ${parsed.data.type} consultation`)
    return Response.json({ consultation: snakeToCamel(consultation) })
  }

  // Prisma path
  const agriCase = await db.agriculturalCase.findUnique({ where: { id: parsed.data.caseId } })
  if (!agriCase) return apiError('Case not found', 404)
  const farmerId = session.role === 'FARMER' ? session.id : agriCase.farmerId
  const expertId = parsed.data.expertId
  const consultation = await db.consultation.create({
    data: { caseId: parsed.data.caseId, farmerId, expertId, type: parsed.data.type, status: 'REQUESTED' },
  })
  await notify(expertId, 'CONSULTATION', 'New consultation request', `A farmer requested a consultation for “${agriCase.title}”.`)
  if (parsed.data.message) {
    await db.message.create({ data: { consultationId: consultation.id, senderId: farmerId, body: parsed.data.message } })
  }
  await audit(session.id, 'CONSULTATION_REQUEST', consultation.id, `Requested ${parsed.data.type} consultation`)
  return Response.json({ consultation })
}
