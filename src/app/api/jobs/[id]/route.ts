import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized, apiError } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: job, error } = await admin.from('job_listings').select(`
      *, owner:profiles!job_listings_owner_id_fkey(id, name, email, phone)
    `).eq('id', id).single()
    if (error || !job) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ job: snakeToCamel(job) })
  }

  const job = await db.jobListing.findUnique({
    where: { id },
    include: { owner: { select: { id: true, name: true, email: true, phone: true } } },
  })
  if (!job) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ job })
}
