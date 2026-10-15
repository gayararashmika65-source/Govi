import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, forbidden } from '@/lib/server-helpers'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const crop = await db.cropListing.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, email: true, phone: true } } },
  })
  if (!crop) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ crop })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params
  const existing = await db.cropListing.findUnique({ where: { id } })
  if (!existing) return apiError('Not found', 404)
  if (existing.ownerId !== session.id) return forbidden()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const { expectedHarvestDate, ...rest } = body
  const updated = await db.cropListing.update({
    where: { id },
    data: { ...rest, ...(expectedHarvestDate ? { expectedHarvestDate: new Date(expectedHarvestDate) } : {}) },
  })
  return Response.json({ crop: updated })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params
  const existing = await db.cropListing.findUnique({ where: { id } })
  if (!existing) return apiError('Not found', 404)
  if (existing.ownerId !== session.id && session.role !== 'ADMIN') return forbidden()
  await db.cropListing.delete({ where: { id } })
  return Response.json({ ok: true })
}
