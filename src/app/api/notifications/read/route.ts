import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError } from '@/lib/server-helpers'

// Mark a single notification (or all) as read
export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const { id, all } = body as { id?: string; all?: boolean }
  if (all) {
    await db.notification.updateMany({ where: { userId: session.id, read: false }, data: { read: true } })
  } else if (id) {
    await db.notification.updateMany({ where: { id, userId: session.id }, data: { read: true } })
  }
  return Response.json({ ok: true })
}
