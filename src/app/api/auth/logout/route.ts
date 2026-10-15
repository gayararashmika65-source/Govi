import { NextRequest } from 'next/server'
import { clearSessionCookie, getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase-server'
import { audit } from '@/lib/server-helpers'

export async function POST(_req: NextRequest) {
  const session = await getSession()
  if (useSupabaseAuth) {
    const sb = getSupabase()
    if (sb) await sb.auth.signOut()
  }
  if (session) await audit(session.id, 'USER_LOGOUT', session.id)
  await clearSessionCookie()
  return Response.json({ ok: true })
}
