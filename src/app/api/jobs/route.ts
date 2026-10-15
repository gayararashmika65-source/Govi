import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, audit } from '@/lib/server-helpers'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const district = searchParams.get('district')
  const mine = searchParams.get('mine') === 'true'
  const session = await getSession()

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
