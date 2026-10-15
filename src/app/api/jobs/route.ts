import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized, apiError, audit } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const district = searchParams.get('district')
  const mine = searchParams.get('mine') === 'true'
  const session = await getSession()
  if (!session) return unauthorized()

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    let query = admin.from('job_listings').select(`
      *,
      owner:profiles!job_listings_owner_id_fkey(id, name),
      applications:job_applications(id)
    `)
    if (mine) {
      query = query.eq('owner_id', session.id)
    } else {
      query = query.eq('status', 'OPEN')
    }
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    if (district) query = query.ilike('location', `%${district}%`)
    query = query.order('created_at', { ascending: false }).limit(80)
    const { data, error } = await query
    if (error) return apiError(error.message, 500)
    // Shape each row to mirror the Prisma `_count: { applications }` field
    const jobs = (data || []).map((row: Record<string, unknown>) => {
      const camel = snakeToCamel(row) as Record<string, unknown>
      const apps = (camel.applications as Array<unknown> | undefined) || []
      const { applications, ...rest } = camel
      return { ...rest, _count: { applications: apps.length } }
    })
    return Response.json({ jobs })
  }

  const where = {
    AND: [
      mine && session ? { ownerId: session.id } : { status: 'OPEN' },
      q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] } : {},
      district ? { location: { contains: district } } : {},
    ],
  }
  const jobs = await db.jobListing.findMany({
    where,
    include: { owner: { select: { id: true, name: true } }, _count: { select: { applications: true } } },
    orderBy: { createdAt: 'desc' },
    take: 80,
  })
  return Response.json({ jobs })
}

const schema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  requiredSkills: z.string().optional(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  paymentTerms: z.string().optional(),
  wage: z.number().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || !['FARMER', 'ENTERPRISE'].includes(session.role)) return unauthorized()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid')
  const { startDate, endDate, ...rest } = parsed.data

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: job, error } = await admin.from('job_listings').insert({
      owner_id: session.id, title: rest.title, description: rest.description || null,
      required_skills: rest.requiredSkills || null, location: rest.location || null,
      start_date: startDate ? new Date(startDate).toISOString().split('T')[0] : null,
      end_date: endDate ? new Date(endDate).toISOString().split('T')[0] : null,
      payment_terms: rest.paymentTerms || null, wage: rest.wage ?? null, status: 'OPEN',
    }).select().single()
    if (error) return apiError(error.message, 500)
    await audit(session.id, 'JOB_CREATE', job.id, rest.title)
    return Response.json({ job: snakeToCamel(job) })
  }

  const job = await db.jobListing.create({
    data: {
      ownerId: session.id, ...rest,
      ...(startDate ? { startDate: new Date(startDate) } : {}),
      ...(endDate ? { endDate: new Date(endDate) } : {}),
      status: 'OPEN',
    },
  })
  await audit(session.id, 'JOB_CREATE', job.id, job.title)
  return Response.json({ job })
}
