import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, forbidden, notify, audit } from '@/lib/server-helpers'

// Owner accepts/rejects an application
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; appId: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id, appId } = await params
  const job = await db.jobListing.findUnique({ where: { id }, select: { ownerId: true, title: true } })
  if (!job) return apiError('Not found', 404)
  if (job.ownerId !== session.id) return forbidden()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const { status } = body as { status: string }
  if (!['ACCEPTED', 'REJECTED', 'PENDING'].includes(status)) return apiError('Invalid status')

  const application = await db.jobApplication.update({ where: { id: appId }, data: { status } })
  await notify(application.workerId, 'JOB', `Application ${status.toLowerCase()}`, `Your application for “${job.title}” was ${status.toLowerCase()}.`)
  await audit(session.id, 'JOB_APPLICATION_UPDATE', appId, `status=${status}`)
  return Response.json({ application })
}
