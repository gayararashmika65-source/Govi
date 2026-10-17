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
  const category = searchParams.get('category')
  const status = searchParams.get('status')
  const sort = searchParams.get('sort') || 'newest'

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return Response.json({ crops: [], categoryCounts: {} })
    let query = admin.from('crop_listings').select('*, owner:profiles!crop_listings_owner_id_fkey(id, name, avatar_url, role)')
    if (!status || status === 'AVAILABLE') {
      query = query.or(`available.eq.true,owner_id.eq.${session.id}`)
    } else if (status !== 'all') {
      query = query.eq('status', status)
    }
    if (category && category !== 'all') query = query.ilike('category', category)
    if (q) query = query.or(`crop_name.ilike.%${q}%,variety.ilike.%${q}%,description.ilike.%${q}%`)
    if (district && district !== 'all') query = query.eq('district', district)
    if (crop && crop !== 'all') query = query.ilike('crop_name', `%${crop}%`)

    if (sort === 'price_asc') query = query.order('asking_price', { ascending: true })
    else if (sort === 'price_desc') query = query.order('asking_price', { ascending: false })
    else if (sort === 'quantity_desc') query = query.order('quantity', { ascending: false })
    else query = query.order('created_at', { ascending: false })

    query = query.limit(100)
    const { data, error } = await query
    if (error) return Response.json({ crops: [], categoryCounts: {} })
    return Response.json({ crops: (data || []).map(snakeToCamel), categoryCounts: {} })
  }

  // Prisma SQLite fallback
  const whereConditions: Record<string, unknown>[] = []
  
  if (!status || status === 'AVAILABLE') {
    whereConditions.push({ OR: [{ available: true }, { ownerId: session.id }] })
  } else if (status !== 'all') {
    whereConditions.push({ status })
  }

  if (category && category !== 'all') {
    whereConditions.push({ category: { equals: category } })
  }

  if (district && district !== 'all') {
    whereConditions.push({ district })
  }

  if (crop && crop !== 'all') {
    whereConditions.push({ cropName: { contains: crop } })
  }

  if (q) {
    whereConditions.push({
      OR: [
        { cropName: { contains: q } },
        { variety: { contains: q } },
        { description: { contains: q } },
        { district: { contains: q } },
      ],
    })
  }

  let orderBy: Record<string, 'asc' | 'desc'> = { createdAt: 'desc' }
  if (sort === 'price_asc') orderBy = { askingPrice: 'asc' }
  else if (sort === 'price_desc') orderBy = { askingPrice: 'desc' }
  else if (sort === 'quantity_desc') orderBy = { quantity: 'desc' }

  const [crops, allAvailableForCounts] = await Promise.all([
    db.cropListing.findMany({
      where: whereConditions.length > 0 ? { AND: whereConditions } : {},
      include: { owner: { select: { id: true, name: true, avatarUrl: true, role: true } } },
      orderBy,
      take: 100,
    }),
    db.cropListing.findMany({
      where: { available: true },
      select: { category: true },
    }),
  ])

  const categoryCounts: Record<string, number> = {}
  for (const item of allAvailableForCounts) {
    if (item.category) {
      categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1
    }
  }

  return Response.json({ crops, categoryCounts })
}

const schema = z.object({
  category: z.string().optional(),
  cropName: z.string().min(1, 'Crop name is required'),
  variety: z.string().optional(),
  quantity: z.number().min(0, 'Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  priceUnit: z.string().optional(),
  askingPrice: z.number().optional(),
  grade: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  mediaUrls: z.union([z.string(), z.array(z.string())]).optional(),
  district: z.string().optional(),
  expectedHarvestDate: z.string().optional(),
  status: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || (session.role !== 'FARMER' && session.role !== 'ADMIN')) return unauthorized()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input')

  const mediaUrlsStr = Array.isArray(parsed.data.mediaUrls)
    ? JSON.stringify(parsed.data.mediaUrls)
    : parsed.data.mediaUrls || (parsed.data.imageUrl ? JSON.stringify([parsed.data.imageUrl]) : null)

  const status = parsed.data.status || 'AVAILABLE'
  const isAvailable = status === 'AVAILABLE'

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: crop, error } = await admin.from('crop_listings').insert({
      owner_id: session.id,
      category: parsed.data.category || null,
      crop_name: parsed.data.cropName,
      variety: parsed.data.variety || null,
      quantity: parsed.data.quantity,
      unit: parsed.data.unit,
      price_unit: parsed.data.priceUnit || `per ${parsed.data.unit}`,
      asking_price: parsed.data.askingPrice ?? null,
      grade: parsed.data.grade || null,
      description: parsed.data.description || null,
      image_url: parsed.data.imageUrl || null,
      media_urls: mediaUrlsStr,
      district: parsed.data.district || null,
      expected_harvest_date: parsed.data.expectedHarvestDate ? new Date(parsed.data.expectedHarvestDate).toISOString().split('T')[0] : null,
      status,
      available: isAvailable,
    }).select().single()
    if (error) return apiError(error.message, 500)
    await audit(session.id, 'CROP_CREATE', crop.id, parsed.data.cropName)
    return Response.json({ crop: snakeToCamel(crop) })
  }

  const { expectedHarvestDate, mediaUrls, ...rest } = parsed.data
  const crop = await db.cropListing.create({
    data: {
      ownerId: session.id,
      ...rest,
      mediaUrls: mediaUrlsStr,
      status,
      available: isAvailable,
      ...(expectedHarvestDate ? { expectedHarvestDate: new Date(expectedHarvestDate) } : {}),
    },
  })
  await audit(session.id, 'CROP_CREATE', crop.id, crop.cropName)
  return Response.json({ crop })
}
