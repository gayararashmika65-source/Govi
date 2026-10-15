import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, forbidden, notify, audit } from '@/lib/server-helpers'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params
  const job = await db.jobListing.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, email: true, phone: true } } },
  })
  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ job })
}
