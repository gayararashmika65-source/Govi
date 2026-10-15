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
  const category = searchParams.get('category')
  const products = await db.productListing.findMany({
    where: {
      AND: [
        { available: true },
        q ? { OR: [{ title: { contains: q } }, { description: { contains: q } }] } : {},
        category ? { category } : {},
      ],
    },
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 80,
  })
  return Response.json({ products })
}

const schema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.string().optional(),
  price: z.number().optional(),
  unit: z.string().optional(),
  imageUrl: z.string().optional(),
  district: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ENTERPRISE') return unauthorized()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid')
  const product = await db.productListing.create({ data: { ownerId: session.id, ...parsed.data, available: true } })
  await audit(session.id, 'PRODUCT_CREATE', product.id, product.title)
  return Response.json({ product })
}
