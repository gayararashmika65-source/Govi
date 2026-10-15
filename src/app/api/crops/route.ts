import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, audit } from '@/lib/server-helpers'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const district = searchParams.get('district')
  const crop = searchParams.get('crop')
  const crops = await db.cropListing.findMany({
    where: {
      AND: [
        { available: true },
        q ? { cropName: { contains: q } } : {},
        district ? { district } : {},
        crop ? { cropName: { contains: crop } } : {},
      ],
    },
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 80,
  })
  return Response.json({ crops })
}

const schema = z.object({
  cropName: z.string().min(1),
  variety: z.string().optional(),
  quantity: z.number().min(0),
  unit: z.string().min(1),
  expectedHarvestDate: z.string().optional(),
  district: z.string().optional(),
  askingPrice: z.number().optional(),
  grade: z.string().optional(),
  imageUrl: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'FARMER') return unauthorized()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid')
  const { expectedHarvestDate, ...rest } = parsed.data
  const crop = await db.cropListing.create({
    data: {
      ownerId: session.id,
      ...rest,
      ...(expectedHarvestDate ? { expectedHarvestDate: new Date(expectedHarvestDate) } : {}),
      available: true,
    },
  })
  await audit(session.id, 'CROP_CREATE', crop.id, crop.cropName)
  return Response.json({ crop })
}
