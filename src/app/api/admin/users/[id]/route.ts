import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { forbidden, apiError, notify, audit } from '@/lib/server-helpers'

// PATCH: suspend / activate a user
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return forbidden()
  const { id } = await params
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const { status } = body as { status: string }
  if (!['ACTIVE', 'SUSPENDED'].includes(status)) return apiError('Invalid status')
  if (id === session.id) return apiError('You cannot change your own status', 400)

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { error } = await admin.rpc('suspend_user', {
      p_user_id: id,
      p_suspend: status === 'SUSPENDED',
    })
    if (error) return apiError(error.message, 500)
    await audit(session.id, 'USER_STATUS_UPDATE', id, `status=${status}`)
    return Response.json({ user: { id, status } })
  }

  const user = await db.user.update({ where: { id }, data: { status } })
  await notify(id, 'SYSTEM', `Account ${status === 'SUSPENDED' ? 'suspended' : 'reactivated'}`, `Your account was ${status === 'SUSPENDED' ? 'suspended' : 'reactivated'} by an administrator.`)
  await audit(session.id, 'USER_STATUS_UPDATE', id, `status=${status}`)
  return Response.json({ user: { id: user.id, status: user.status } })
}
