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
  const district = searchParams.get('district')
  const crop = searchParams.get('crop')

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return Response.json({ crops: [] })
    let query = admin.from('crop_listings').select('*, owner:profiles!crop_listings_owner_id_fkey(id, name)')
    query = query.or(`available.eq.true,owner_id.eq.${session.id}`)
    if (q) query = query.ilike('crop_name', `%${q}%`)
    if (district) query = query.eq('district', district)
    if (crop) query = query.ilike('crop_name', `%${crop}%`)
    query = query.order('created_at', { ascending: false }).limit(80)
    const { data, error } = await query
    if (error) return Response.json({ crops: [] })
    return Response.json({ crops: (data || []).map(snakeToCamel) })
  }

  const crops = await db.cropListing.findMany({
    where: { AND: [{ available: true }, q ? { cropName: { contains: q } } : {}, district ? { district } : {}, crop ? { cropName: { contains: crop } } : {}] },
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' }, take: 80,
  })
  return Response.json({ crops })
}

const schema = z.object({
  cropName: z.string().min(1), variety: z.string().optional(), quantity: z.number().min(0), unit: z.string().min(1),
  expectedHarvestDate: z.string().optional(), district: z.string().optional(), askingPrice: z.number().optional(),
  grade: z.string().optional(), imageUrl: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'FARMER') return unauthorized()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid')

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: crop, error } = await admin.from('crop_listings').insert({
      owner_id: session.id, crop_name: parsed.data.cropName, variety: parsed.data.variety || null,
      quantity: parsed.data.quantity, unit: parsed.data.unit,
      expected_harvest_date: parsed.data.expectedHarvestDate ? new Date(parsed.data.expectedHarvestDate).toISOString().split('T')[0] : null,
      district: parsed.data.district || null, asking_price: parsed.data.askingPrice ?? null,
      grade: parsed.data.grade || null, image_url: parsed.data.imageUrl || null, available: true,
    }).select().single()
    if (error) return apiError(error.message, 500)
    await audit(session.id, 'CROP_CREATE', crop.id, parsed.data.cropName)
    return Response.json({ crop: snakeToCamel(crop) })
  }

  const { expectedHarvestDate, ...rest } = parsed.data
  const crop = await db.cropListing.create({ data: { ownerId: session.id, ...rest, ...(expectedHarvestDate ? { expectedHarvestDate: new Date(expectedHarvestDate) } : {}), available: true } })
  await audit(session.id, 'CROP_CREATE', crop.id, crop.cropName)
  return Response.json({ crop })
}
