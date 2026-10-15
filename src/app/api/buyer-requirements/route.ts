import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, audit } from '@/lib/server-helpers'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const mine = searchParams.get('mine') === 'true'
  const session = await getSession()
  const where = {
    AND: [
      mine && session ? { ownerId: session.id } : { status: 'OPEN' },
      q ? { cropName: { contains: q } } : {},
    ],
  }
  const requirements = await db.buyerRequirement.findMany({
    where,
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 80,
  })
  return Response.json({ requirements })
}

const schema = z.object({
  cropName: z.string().min(1),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  preferredDistrict: z.string().optional(),
  targetPrice: z.number().optional(),
  deliveryReq: z.string().optional(),
  closingDate: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'BUYER') return unauthorized()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid')
  const { closingDate, ...rest } = parsed.data
  const requirement = await db.buyerRequirement.create({
    data: { ownerId: session.id, ...rest, ...(closingDate ? { closingDate: new Date(closingDate) } : {}), status: 'OPEN' },
  })
  await audit(session.id, 'BUYER_REQ_CREATE', requirement.id, requirement.cropName)
  return Response.json({ requirement })
}
