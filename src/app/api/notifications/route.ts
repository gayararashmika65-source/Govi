import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('unread') === 'true'

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return Response.json({ notifications: [], unreadCount: 0 })
    let query = admin.from('notifications').select('*').eq('user_id', session.id)
    if (unreadOnly) query = query.eq('read', false)
    query = query.order('created_at', { ascending: false }).limit(50)
    const { data, error } = await query
    if (error) return Response.json({ notifications: [], unreadCount: 0 })
    const { count } = await admin.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', session.id).eq('read', false)
    return Response.json({ notifications: (data || []).map(snakeToCamel), unreadCount: count || 0 })
  }

  const notifications = await db.notification.findMany({
    where: { userId: session.id, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const unreadCount = await db.notification.count({ where: { userId: session.id, read: false } })
  return Response.json({ notifications, unreadCount })
}
