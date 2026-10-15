import { NextRequest } from 'next/server'
import { clearSessionCookie, getSession } from '@/lib/auth'
import { audit } from '@/lib/server-helpers'

export async function POST(_req: NextRequest) {
  const session = await getSession()
  if (session) await audit(session.id, 'USER_LOGOUT', session.id)
  await clearSessionCookie()
  return Response.json({ ok: true })
}
