import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized, forbidden, apiError, audit } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()
  // Admin sees all; others see their own filed reports

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return Response.json({ reports: [] })
    let q = admin.from('reports').select('*, reporter:profiles!reports_reporter_id_fkey(id, name)')
    if (session.role !== 'ADMIN') q = q.eq('reporter_id', session.id)
    q = q.order('created_at', { ascending: false }).limit(100)
    const { data, error } = await q
    if (error) return Response.json({ reports: [] })
    return Response.json({ reports: (data || []).map(snakeToCamel) })
  }

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

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: report, error } = await admin.from('reports').insert({
      reporter_id: session.id, target_type: parsed.data.targetType,
      target_id: parsed.data.targetId, reason: parsed.data.reason, status: 'OPEN',
    }).select().single()
    if (error) return apiError(error.message, 500)
    await audit(session.id, 'REPORT_FILE', report.id, parsed.data.targetType)
    return Response.json({ report: snakeToCamel(report) })
  }

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

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: report, error } = await admin.from('reports')
      .update({ status }).eq('id', id).select().single()
    if (error) return apiError(error.message, 500)
    if (!report) return apiError('Not found', 404)
    await audit(session.id, 'REPORT_UPDATE', id, `status=${status}`)
    return Response.json({ report: snakeToCamel(report) })
  }

  const report = await db.report.update({ where: { id }, data: { status } })
  await audit(session.id, 'REPORT_UPDATE', id, `status=${status}`)
  return Response.json({ report })
}
