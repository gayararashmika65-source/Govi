import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, forbidden, apiError, audit } from '@/lib/server-helpers'

export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()
  // Admin sees all; others see their own filed reports
  const where = session.role === 'ADMIN' ? {} : { reporterId: session.id }
  const reports = await db.report.findMany({
    where,
    include: { reporter: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return Response.json({ reports })
}

const schema = z.object({
  targetType: z.string(),
  targetId: z.string(),
  reason: z.string().min(3),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid')
  const report = await db.report.create({ data: { ...parsed.data, reporterId: session.id, status: 'OPEN' } })
  await audit(session.id, 'REPORT_FILE', report.id, parsed.data.targetType)
  return Response.json({ report })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return forbidden()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const { id, status } = body as { id: string; status: string }
  if (!['OPEN', 'REVIEWING', 'RESOLVED'].includes(status)) return apiError('Invalid status')
  const report = await db.report.update({ where: { id }, data: { status } })
  await audit(session.id, 'REPORT_UPDATE', id, `status=${status}`)
  return Response.json({ report })
}
