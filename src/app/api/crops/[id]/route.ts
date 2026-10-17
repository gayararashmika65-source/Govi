import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized, apiError, forbidden } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params
  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: crop, error } = await admin.from('crop_listings').select('*, owner:profiles!crop_listings_owner_id_fkey(id, name, email, phone, avatar_url, role)').eq('id', id).single()
    if (error || !crop) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ crop: snakeToCamel(crop) })
  }
  const crop = await db.cropListing.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true, role: true } } },
  })
  if (!crop) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ crop })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: existing } = await admin.from('crop_listings').select('owner_id').eq('id', id).single()
    if (!existing) return apiError('Not found', 404)
    if (existing.owner_id !== session.id && session.role !== 'ADMIN') return forbidden()
    const update: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(body)) update[k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())] = v
    if (update.expected_harvest_date) update.expected_harvest_date = new Date(update.expected_harvest_date as string).toISOString().split('T')[0]
    if (update.media_urls && Array.isArray(update.media_urls)) update.media_urls = JSON.stringify(update.media_urls)
    if (typeof update.status === 'string') {
      update.available = update.status === 'AVAILABLE'
    } else if (typeof update.available === 'boolean') {
      update.status = update.available ? 'AVAILABLE' : 'RESERVED'
    }
    const { data: updated, error } = await admin.from('crop_listings').update(update).eq('id', id).select().single()
    if (error) return apiError(error.message, 500)
    return Response.json({ crop: snakeToCamel(updated) })
  }

  const existing = await db.cropListing.findUnique({ where: { id } })
  if (!existing) return apiError('Not found', 404)
  if (existing.ownerId !== session.id && session.role !== 'ADMIN') return forbidden()

  const { expectedHarvestDate, mediaUrls, status, available, ...rest } = body
  const updateData: Record<string, unknown> = { ...rest }
  if (expectedHarvestDate !== undefined) {
    updateData.expectedHarvestDate = expectedHarvestDate ? new Date(expectedHarvestDate) : null
  }
  if (mediaUrls !== undefined) {
    updateData.mediaUrls = Array.isArray(mediaUrls) ? JSON.stringify(mediaUrls) : mediaUrls
  }
  if (status !== undefined) {
    updateData.status = status
    updateData.available = status === 'AVAILABLE'
  } else if (available !== undefined) {
    updateData.available = Boolean(available)
    updateData.status = available ? 'AVAILABLE' : 'RESERVED'
  }

  const updated = await db.cropListing.update({
    where: { id },
    data: updateData,
    include: { owner: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true, role: true } } },
  })
  return Response.json({ crop: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params
  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: existing } = await admin.from('crop_listings').select('owner_id').eq('id', id).single()
    if (!existing) return apiError('Not found', 404)
    if (existing.owner_id !== session.id && session.role !== 'ADMIN') return forbidden()
    await admin.from('crop_listings').delete().eq('id', id)
    return Response.json({ ok: true })
  }
  const existing = await db.cropListing.findUnique({ where: { id } })
  if (!existing) return apiError('Not found', 404)
  if (existing.ownerId !== session.id && session.role !== 'ADMIN') return forbidden()
  await db.cropListing.delete({ where: { id } })
  return Response.json({ ok: true })
}
