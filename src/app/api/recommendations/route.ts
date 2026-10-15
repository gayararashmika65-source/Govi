import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, notify, audit } from '@/lib/server-helpers'

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
  const agriCase = await db.agriculturalCase.findUnique({ where: { id: caseId } })
  if (!agriCase) return apiError('Case not found', 404)

  const profile = await db.expertProfile.findUnique({ where: { userId: session.id } })

  const rec = await db.expertRecommendation.create({
    data: {
      caseId, consultationId: consultationId || null,
      expertId: session.id, expertProfileId: profile?.id,
      diagnosis, advice, followUpNeeded,
    },
  })

  // Case moves toward resolved
  await db.agriculturalCase.update({ where: { id: caseId }, data: { status: 'RESOLVED' } })
  await notify(agriCase.farmerId, 'CASE', 'Expert recommendation ready', `Dr. recommendations added to your case “${agriCase.title}”.`)
  await audit(session.id, 'RECOMMENDATION_CREATE', rec.id, `Diagnosis for case ${caseId}`)
  return Response.json({ recommendation: rec })
}
