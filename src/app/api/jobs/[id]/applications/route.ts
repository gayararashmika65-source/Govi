import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized, apiError, forbidden, notify, audit } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

// GET applications for a job (owner only)
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: job } = await admin.from('job_listings').select('owner_id').eq('id', id).single()
    if (!job) return apiError('Not found', 404)
    if (job.owner_id !== session.id && session.role !== 'ADMIN') return forbidden()
    const { data, error } = await admin.from('job_applications').select(`
      *,
      worker:profiles!job_applications_worker_id_fkey(id, name, phone, worker_profile:worker_profiles!worker_profiles_user_id_fkey(*))
    `).eq('job_id', id).order('created_at', { ascending: false })
    if (error) return apiError(error.message, 500)
    // PostgREST returns worker_profile as either a single object (FK is unique) or an array — normalise to a single object.
    const applications = (data || []).map((row: Record<string, unknown>) => {
      const camel = snakeToCamel(row) as Record<string, unknown>
      const worker = (camel.worker as Record<string, unknown> | undefined) || {}
      const wpRaw = worker.workerProfile
      const wp = Array.isArray(wpRaw) ? (wpRaw[0] ?? null) : (wpRaw ?? null)
      return { ...camel, worker: { ...worker, workerProfile: wp } }
    })
    return Response.json({ applications })
  }

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

  let body: { coverNote?: string } = {}
  try { body = await req.json() } catch { /* ignore */ }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid')

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: job } = await admin.from('job_listings')
      .select('id, owner_id, title, status')
      .eq('id', id).single()
    if (!job) return apiError('Not found', 404)
    if (job.status !== 'OPEN') return apiError('This job is no longer open')

    const { data: application, error } = await admin.from('job_applications').insert({
      job_id: id, worker_id: session.id, cover_note: parsed.data.coverNote || null, status: 'PENDING',
    }).select().single()
    if (error) {
      // 23505 = unique_violation (already applied)
      if (error.code === '23505') return apiError('You have already applied for this job', 409)
      return apiError(error.message, 500)
    }
    await notify(job.owner_id, 'JOB', 'New job application', `A worker applied for "${job.title}".`)
    await audit(session.id, 'JOB_APPLY', application.id, `Applied to job ${id}`)
    return Response.json({ application: snakeToCamel(application) })
  }

  const job = await db.jobListing.findUnique({ where: { id }, select: { id: true, ownerId: true, title: true, status: true } })
  if (!job) return apiError('Not found', 404)
  if (job.status !== 'OPEN') return apiError('This job is no longer open')

  const existing = await db.jobApplication.findUnique({ where: { jobId_workerId: { jobId: id, workerId: session.id } } })
  if (existing) return apiError('You have already applied for this job', 409)

  const application = await db.jobApplication.create({
    data: { jobId: id, workerId: session.id, coverNote: parsed.data.coverNote, status: 'PENDING' },
  })
  await notify(job.ownerId, 'JOB', 'New job application', `A worker applied for "${job.title}".`)
  await audit(session.id, 'JOB_APPLY', application.id, `Applied to job ${id}`)
  return Response.json({ application })
}
