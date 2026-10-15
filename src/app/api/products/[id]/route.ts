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
    const { data: product, error } = await admin.from('product_listings').select(`
      *, owner:profiles!product_listings_owner_id_fkey(id, name, email, phone)
    `).eq('id', id).single()
    if (error || !product) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ product: snakeToCamel(product) })
  }

  const product = await db.productListing.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, email: true, phone: true } } },
  })
  if (!product) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ product })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: existing } = await admin.from('product_listings').select('owner_id').eq('id', id).single()
    if (!existing) return apiError('Not found', 404)
    if (existing.owner_id !== session.id) return forbidden()
    let body
    try { body = await req.json() } catch { return apiError('Invalid body') }
    // Convert camelCase keys to snake_case for Supabase
    const update: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(body)) {
      update[k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase())] = v
    }
    const { data: updated, error } = await admin.from('product_listings').update(update).eq('id', id).select().single()
    if (error) return apiError(error.message, 500)
    return Response.json({ product: snakeToCamel(updated) })
  }

  const existing = await db.productListing.findUnique({ where: { id } })
  if (!existing) return apiError('Not found', 404)
  if (existing.ownerId !== session.id) return forbidden()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const updated = await db.productListing.update({ where: { id }, data: body })
  return Response.json({ product: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: existing } = await admin.from('product_listings').select('owner_id').eq('id', id).single()
    if (!existing) return apiError('Not found', 404)
    if (existing.owner_id !== session.id && session.role !== 'ADMIN') return forbidden()
    await admin.from('product_listings').delete().eq('id', id)
    return Response.json({ ok: true })
  }

  const existing = await db.productListing.findUnique({ where: { id } })
  if (!existing) return apiError('Not found', 404)
  if (existing.ownerId !== session.id && session.role !== 'ADMIN') return forbidden()
  await db.productListing.delete({ where: { id } })
  return Response.json({ ok: true })
}
