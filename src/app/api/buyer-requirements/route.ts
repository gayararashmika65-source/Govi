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
  const mine = searchParams.get('mine') === 'true'
  const session = await getSession()
  if (!session) return unauthorized()

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    let query = admin.from('buyer_requirements').select('*, owner:profiles!buyer_requirements_owner_id_fkey(id, name)')
    if (mine) {
      query = query.eq('owner_id', session.id)
    } else {
      query = query.eq('status', 'OPEN')
    }
    if (q) query = query.ilike('crop_name', `%${q}%`)
    query = query.order('created_at', { ascending: false }).limit(80)
    const { data, error } = await query
    if (error) return apiError(error.message, 500)
    return Response.json({ requirements: (data || []).map(snakeToCamel) })
  }

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

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: requirement, error } = await admin.from('buyer_requirements').insert({
      owner_id: session.id, crop_name: rest.cropName,
      quantity: rest.quantity ?? null, unit: rest.unit || null,
      preferred_district: rest.preferredDistrict || null, target_price: rest.targetPrice ?? null,
      delivery_req: rest.deliveryReq || null,
      closing_date: closingDate ? new Date(closingDate).toISOString().split('T')[0] : null,
      status: 'OPEN',
    }).select().single()
    if (error) return apiError(error.message, 500)
    await audit(session.id, 'BUYER_REQ_CREATE', requirement.id, rest.cropName)
    return Response.json({ requirement: snakeToCamel(requirement) })
  }

  const requirement = await db.buyerRequirement.create({
    data: { ownerId: session.id, ...rest, ...(closingDate ? { closingDate: new Date(closingDate) } : {}), status: 'OPEN' },
  })
  await audit(session.id, 'BUYER_REQ_CREATE', requirement.id, requirement.cropName)
  return Response.json({ requirement })
}
