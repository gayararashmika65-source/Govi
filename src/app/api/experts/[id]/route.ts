import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return Response.json({ error: 'Supabase not configured' }, { status: 500 })
    const { data: expert, error } = await admin.from('expert_profiles').select(`
      *, user:profiles!expert_profiles_user_id_fkey(id, name, email, phone, avatar_url),
      recommendations:expert_recommendations(*, agri_case:agricultural_cases(*))
    `).or(`id.eq.${id},user_id.eq.${id}`).order('created_at', { foreignTable: 'recommendations', ascending: false }).limit(10, { foreignTable: 'recommendations' }).maybeSingle()
    if (error || !expert) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ expert: snakeToCamel(expert) })
  }

  let expert = await db.expertProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
      recommendations: { include: { agriCase: true }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })
  if (!expert) {
    expert = await db.expertProfile.findUnique({
      where: { userId: id },
      include: {
        user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
        recommendations: { include: { agriCase: true }, orderBy: { createdAt: 'desc' }, take: 10 },
      },
    })
  }
  if (!expert) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ expert })
}
