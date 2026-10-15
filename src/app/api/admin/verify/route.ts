import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { forbidden, apiError, notify, audit } from '@/lib/server-helpers'

// Approve / reject an expert or enterprise verification
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return forbidden()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const { type, id, action, note } = body as { type: 'EXPERT' | 'ENTERPRISE'; id: string; action: 'APPROVE' | 'REJECT'; note?: string }
  if (!['APPROVE', 'REJECT'].includes(action)) return apiError('Invalid action')

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    if (type === 'EXPERT') {
      const { error } = await admin.rpc('verify_expert', { p_verification_id: id, p_action: action })
      if (error) return apiError(error.message, 500)
      // Fetch the affected expert's user_id so we can pass the admin note (the RPC notifies with a stock message).
      const { data: verif } = await admin.from('expert_verifications')
        .select('expert_profile_id, expert:expert_profiles(user_id)')
        .eq('id', id).single()
      const expertUser = (verif?.expert as unknown as { user_id?: string } | undefined)?.user_id
      if (note && expertUser) {
        await notify(expertUser, 'VERIFICATION', `Verification ${action === 'APPROVE' ? 'approved' : 'rejected'}`, note)
      }
      await audit(session.id, 'VERIFICATION_REVIEW', id, `EXPERT ${action}`)
    } else {
      // Enterprise: id is the enterprise profile id
      const { data: enterprise } = await admin.from('enterprise_profiles').select('user_id').eq('id', id).single()
      if (!enterprise) return apiError('Enterprise not found', 404)
      const { error } = await admin.rpc('verify_enterprise', { p_enterprise_profile_id: id, p_action: action })
      if (error) return apiError(error.message, 500)
      if (note) {
        await notify(enterprise.user_id, 'VERIFICATION', `Business ${action === 'APPROVE' ? 'verified' : 'rejected'}`, note)
      }
      await audit(session.id, 'VERIFICATION_REVIEW', id, `ENTERPRISE ${action}`)
    }
    return Response.json({ ok: true })
  }

  if (type === 'EXPERT') {
    const verification = await db.expertVerification.findUnique({ where: { id }, include: { expert: true } })
    if (!verification) return apiError('Verification not found', 404)
    const status = action === 'APPROVE' ? 'APPROVED' : 'REJECTED'
    await db.expertVerification.update({ where: { id }, data: { status, reviewedBy: session.id } })
    await db.expertProfile.update({ where: { id: verification.expertProfileId }, data: { verified: action === 'APPROVE' } })
    await notify(verification.expert.userId, 'VERIFICATION', `Verification ${status.toLowerCase()}`, note || `Your verification was ${status.toLowerCase()}.`)
    await audit(session.id, 'VERIFICATION_REVIEW', id, `${type} ${status}`)
  } else {
    // Enterprise: id is the enterprise profile id
    const enterprise = await db.enterpriseProfile.findUnique({ where: { id } })
    if (!enterprise) return apiError('Enterprise not found', 404)
    await db.enterpriseProfile.update({ where: { id }, data: { verified: action === 'APPROVE' } })
    await notify(enterprise.userId, 'VERIFICATION', `Business ${action === 'APPROVE' ? 'verified' : 'rejected'}`, note || `Your business verification was ${action === 'APPROVE' ? 'approved' : 'rejected'}.`)
    await audit(session.id, 'VERIFICATION_REVIEW', id, `ENTERPRISE ${action}`)
  }
  return Response.json({ ok: true })
}
