import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, forbidden, notify, audit } from '@/lib/server-helpers'

// GET applications for a job (owner only)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params
  const job = await db.jobListing.findUnique({ where: { id }, select: { ownerId: true } })
  if (!job) return apiError('Not found', 404)
  if (job.ownerId !== session.id && session.role !== 'ADMIN') return forbidden()
  const applications = await db.jobApplication.findMany({
    where: { jobId: id },
    include: { worker: { select: { id: true, name: true, phone: true, workerProfile: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json({ applications })
}

const schema = z.object({ coverNote: z.string().optional() })

// Worker applies to a job
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'WORKER') return unauthorized()
  const { id } = await params
  const job = await db.jobListing.findUnique({ where: { id }, select: { id: true, ownerId: true, title: true, status: true } })
  if (!job) return apiError('Not found', 404)
  if (job.status !== 'OPEN') return apiError('This job is no longer open')

  let body: { coverNote?: string } = {}
  try { body = await req.json() } catch { /* ignore */ }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid')

  const existing = await db.jobApplication.findUnique({ where: { jobId_workerId: { jobId: id, workerId: session.id } } })
  if (existing) return apiError('You have already applied for this job', 409)

  const application = await db.jobApplication.create({
    data: { jobId: id, workerId: session.id, coverNote: parsed.data.coverNote, status: 'PENDING' },
  })
  await notify(job.ownerId, 'JOB', 'New job application', `A worker applied for “${job.title}”.`)
  await audit(session.id, 'JOB_APPLY', application.id, `Applied to job ${id}`)
  return Response.json({ application })
}
