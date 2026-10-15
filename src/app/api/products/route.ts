import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized, apiError, audit } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const category = searchParams.get('category')

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    let query = admin.from('product_listings').select('*, owner:profiles!product_listings_owner_id_fkey(id, name)')
    // All authenticated users see available=true; owners also see their hidden ones; admins all
    query = query.or(`available.eq.true,owner_id.eq.${session.id}`)
    if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)
    if (category) query = query.eq('category', category)
    query = query.order('created_at', { ascending: false }).limit(80)
    const { data, error } = await query
    if (error) return apiError(error.message, 500)
    return Response.json({ products: (data || []).map(snakeToCamel) })
  }

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

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: product, error } = await admin.from('product_listings').insert({
      owner_id: session.id, title: parsed.data.title, description: parsed.data.description || null,
      category: parsed.data.category || null, price: parsed.data.price ?? null, unit: parsed.data.unit || null,
      image_url: parsed.data.imageUrl || null, district: parsed.data.district || null, available: true,
    }).select().single()
    if (error) return apiError(error.message, 500)
    await audit(session.id, 'PRODUCT_CREATE', product.id, parsed.data.title)
    return Response.json({ product: snakeToCamel(product) })
  }

  const product = await db.productListing.create({ data: { ownerId: session.id, ...parsed.data, available: true } })
  await audit(session.id, 'PRODUCT_CREATE', product.id, product.title)
  return Response.json({ product })
}
