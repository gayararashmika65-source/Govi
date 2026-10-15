import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized, apiError, notify, audit } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

const schema = z.object({
  caseId: z.string(),
  consultationId: z.string().optional(),
  diagnosis: z.string().min(5, 'Provide a diagnosis'),
  advice: z.string().min(10, 'Provide clear recommendations'),
  followUpNeeded: z.boolean().default(false),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'EXPERT') return unauthorized()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid')

  const { caseId, consultationId, diagnosis, advice, followUpNeeded } = parsed.data

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: agriCase } = await admin.from('agricultural_cases').select('id, farmer_id, title').eq('id', caseId).single()
    if (!agriCase) return apiError('Case not found', 404)
    const { data: profile } = await admin.from('expert_profiles').select('id').eq('user_id', session.id).maybeSingle()
    const { data: rec, error } = await admin.from('expert_recommendations').insert({
      case_id: caseId, consultation_id: consultationId || null,
      expert_id: session.id, expert_profile_id: profile?.id || null,
      diagnosis, advice, follow_up_needed: followUpNeeded,
    }).select().single()
    if (error) return apiError(error.message, 500)
    await admin.from('agricultural_cases').update({ status: 'RESOLVED' }).eq('id', caseId)
    await notify(agriCase.farmer_id, 'CASE', 'Expert recommendation ready', `Recommendations added to your case “${agriCase.title}”.`)
    await audit(session.id, 'RECOMMENDATION_CREATE', rec.id, `Diagnosis for case ${caseId}`)
    return Response.json({ recommendation: snakeToCamel(rec) })
  }

  // Prisma path
  const agriCase = await db.agriculturalCase.findUnique({ where: { id: caseId } })
  if (!agriCase) return apiError('Case not found', 404)
  const profile = await db.expertProfile.findUnique({ where: { userId: session.id } })
  const rec = await db.expertRecommendation.create({
    data: { caseId, consultationId: consultationId || null, expertId: session.id, expertProfileId: profile?.id, diagnosis, advice, followUpNeeded },
  })
  await db.agriculturalCase.update({ where: { id: caseId }, data: { status: 'RESOLVED' } })
  await notify(agriCase.farmerId, 'CASE', 'Expert recommendation ready', `Dr. recommendations added to your case “${agriCase.title}”.`)
  await audit(session.id, 'RECOMMENDATION_CREATE', rec.id, `Diagnosis for case ${caseId}`)
  return Response.json({ recommendation: rec })
}
