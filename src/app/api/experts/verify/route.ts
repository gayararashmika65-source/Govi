import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { apiError, unauthorized, notify, audit } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

// Expert submits a verification document for admin review
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'EXPERT') return unauthorized()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const { documentPath, note } = body as { documentPath?: string; note?: string }
  if (!documentPath) return apiError('Document is required')

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: profile, error: pErr } = await admin.from('expert_profiles')
      .select('id').eq('user_id', session.id).single()
    if (pErr || !profile) return apiError('Profile not found')
    const { data: verification, error } = await admin.from('expert_verifications').insert({
      expert_profile_id: profile.id, document_path: documentPath, note: note || null, status: 'PENDING',
    }).select().single()
    if (error) return apiError(error.message, 500)
    await notify(session.id, 'VERIFICATION', 'Verification submitted', 'Your verification document is under review by administrators.')
    await audit(session.id, 'VERIFICATION_SUBMIT', verification.id, 'Expert submitted verification document')
    return Response.json({ verification: snakeToCamel(verification) })
  }

  const profile = await db.expertProfile.findUnique({ where: { userId: session.id } })
  if (!profile) return apiError('Profile not found')

  const verification = await db.expertVerification.create({
    data: { expertProfileId: profile.id, documentPath, note, status: 'PENDING' },
  })
  await notify(session.id, 'VERIFICATION', 'Verification submitted', 'Your verification document is under review by administrators.')
  await audit(session.id, 'VERIFICATION_SUBMIT', verification.id, 'Expert submitted verification document')
  return Response.json({ verification })
}
