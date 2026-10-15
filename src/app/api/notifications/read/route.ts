import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized, apiError } from '@/lib/server-helpers'

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const { id, all } = body as { id?: string; all?: boolean }

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    if (all) {
      await admin.from('notifications').update({ read: true }).eq('user_id', session.id).eq('read', false)
    } else if (id) {
      await admin.from('notifications').update({ read: true }).eq('id', id).eq('user_id', session.id)
    }
    return Response.json({ ok: true })
  }

  if (all) {
    await db.notification.updateMany({ where: { userId: session.id, read: false }, data: { read: true } })
  } else if (id) {
    await db.notification.updateMany({ where: { id, userId: session.id }, data: { read: true } })
  }
  return Response.json({ ok: true })
}
