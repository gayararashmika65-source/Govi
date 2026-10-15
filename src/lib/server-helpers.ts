// Server-side helpers for audit logs and notifications
import { db } from '@/lib/db'

export async function notify(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
) {
  return db.notification.create({
    data: { userId, type, title, body, link },
  })
}

export async function audit(
  actorId: string | null,
  action: string,
  target?: string,
  detail?: string,
) {
  return db.auditLog.create({
    data: { actorId, action, target, detail },
  })
}

export function apiError(message: string, status = 400) {
  return Response.json({ error: message }, { status })
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}

export function forbidden() {
  return Response.json({ error: 'Forbidden' }, { status: 403 })
}
