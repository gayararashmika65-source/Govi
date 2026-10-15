import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, notify, audit } from '@/lib/server-helpers'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const caseId = searchParams.get('caseId')
  const where = {
    OR: [{ farmerId: session.id }, { expertId: session.id }],
    ...(caseId ? { caseId } : {}),
  }
  const consultations = await db.consultation.findMany({
    where,
    include: {
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

  const agriCase = await db.agriculturalCase.findUnique({ where: { id: parsed.data.caseId } })
  if (!agriCase) return apiError('Case not found', 404)

  const farmerId = session.role === 'FARMER' ? session.id : agriCase.farmerId
  const expertId = parsed.data.expertId

  const consultation = await db.consultation.create({
    data: {
      caseId: parsed.data.caseId,
      farmerId, expertId,
      type: parsed.data.type,
      status: 'REQUESTED',
    },
  })
  // notify expert
  await notify(expertId, 'CONSULTATION', 'New consultation request', `A farmer requested a consultation for “${agriCase.title}”.`)
  // optional opening message from farmer
  if (parsed.data.message) {
    await db.message.create({ data: { consultationId: consultation.id, senderId: farmerId, body: parsed.data.message } })
  }
  await audit(session.id, 'CONSULTATION_REQUEST', consultation.id, `Requested ${parsed.data.type} consultation`)
  return Response.json({ consultation })
}
