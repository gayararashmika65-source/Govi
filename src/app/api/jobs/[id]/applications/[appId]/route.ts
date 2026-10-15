import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized, apiError, forbidden, notify, audit } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

// Owner accepts/rejects an application
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; appId: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id, appId } = await params
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const { status } = body as { status: string }
  if (!['ACCEPTED', 'REJECTED', 'PENDING'].includes(status)) return apiError('Invalid status')

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: job } = await admin.from('job_listings').select('owner_id, title').eq('id', id).single()
    if (!job) return apiError('Not found', 404)
    if (job.owner_id !== session.id) return forbidden()
    const { data: application, error } = await admin.from('job_applications')
      .update({ status }).eq('id', appId).select().single()
    if (error) return apiError(error.message, 500)
    if (!application) return apiError('Not found', 404)
    await notify(application.worker_id, 'JOB', `Application ${status.toLowerCase()}`, `Your application for "${job.title}" was ${status.toLowerCase()}.`)
    await audit(session.id, 'JOB_APPLICATION_UPDATE', appId, `status=${status}`)
    return Response.json({ application: snakeToCamel(application) })
  }

  const job = await db.jobListing.findUnique({ where: { id }, select: { ownerId: true, title: true } })
  if (!job) return apiError('Not found', 404)
  if (job.ownerId !== session.id) return forbidden()

  const application = await db.jobApplication.update({ where: { id: appId }, data: { status } })
  await notify(application.workerId, 'JOB', `Application ${status.toLowerCase()}`, `Your application for "${job.title}" was ${status.toLowerCase()}.`)
  await audit(session.id, 'JOB_APPLICATION_UPDATE', appId, `status=${status}`)
  return Response.json({ application })
}
