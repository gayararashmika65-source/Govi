// Server-side helpers for audit logs and notifications — backend-aware.
// When Supabase is configured, calls the SECURITY DEFINER RPC functions
// (notify_user, write_audit_log) which bypass RLS in a controlled way.
// Otherwise falls back to Prisma inserts.
import { db } from '@/lib/db'
import { useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function notify(
  userId: string,
  type: string,
  title: string,
  body: string,
  link?: string,
) {
  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return
    await admin.rpc('notify_user', {
      p_user_id: userId, p_type: type, p_title: title, p_body: body, p_link: link || null,
    })
    return
  }
  await db.notification.create({ data: { userId, type, title, body, link } })
}

export async function audit(
  actorId: string | null,
  action: string,
  target?: string,
  detail?: string,
) {
  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return
    await admin.rpc('write_audit_log', {
      p_actor_id: actorId, p_action: action, p_target: target || null, p_detail: detail || null,
    })
    return
  }
  await db.auditLog.create({ data: { actorId, action, target, detail } })
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

/** Helper to run an admin query with consistent error handling. */
export async function sbQuery<T>(
  fn: (admin: SupabaseClient) => Promise<{ data: T | null; error: { message: string } | null }>,
): Promise<T> {
  const admin = getSupabaseAdmin()
  if (!admin) throw new Error('Supabase not configured')
  const { data, error } = await fn(admin)
  if (error) throw new Error(error.message)
  return data as T
}
