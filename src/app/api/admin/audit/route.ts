import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { forbidden } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return forbidden()

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return Response.json({ logs: [] })
    const { data, error } = await admin.from('audit_logs').select(`
      *, actor:profiles!audit_logs_actor_id_fkey(id, name, role)
    `).order('created_at', { ascending: false }).limit(100)
    if (error) return Response.json({ logs: [] })
    return Response.json({ logs: (data || []).map(snakeToCamel) })
  }

  const logs = await db.auditLog.findMany({
    include: { actor: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return Response.json({ logs })
}
