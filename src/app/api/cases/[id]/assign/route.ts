import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized, apiError, audit, notify } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

// Expert takes / accepts an open case
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'EXPERT') return unauthorized()
  const { id } = await params

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: agriCase, error } = await admin.from('agricultural_cases').select('id, farmer_id, title').eq('id', id).single()
    if (error || !agriCase) return apiError('Case not found', 404)
    const { data: updated, error: uErr } = await admin.from('agricultural_cases')
      .update({ expert_id: session.id, status: 'UNDER_REVIEW' }).eq('id', id).select().single()
    if (uErr) return apiError(uErr.message, 500)
    await notify(agriCase.farmer_id, 'CASE', 'Expert reviewing your case', `An expert is now reviewing “${agriCase.title}”.`)
    await audit(session.id, 'CASE_ASSIGN', id, 'Expert accepted case')
    return Response.json({ case: snakeToCamel(updated) })
  }

  const agriCase = await db.agriculturalCase.findUnique({ where: { id } })
  if (!agriCase) return apiError('Case not found', 404)
  const updated = await db.agriculturalCase.update({
    where: { id }, data: { expertId: session.id, status: 'UNDER_REVIEW' },
  })
  await notify(agriCase.farmerId, 'CASE', 'Expert reviewing your case', `An expert is now reviewing “${agriCase.title}”.`)
  await audit(session.id, 'CASE_ASSIGN', id, 'Expert accepted case')
  return Response.json({ case: updated })
}
