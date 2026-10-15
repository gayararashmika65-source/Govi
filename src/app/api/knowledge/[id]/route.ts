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
    const { data: article, error } = await admin.from('knowledge_articles').select('*').eq('id', id).single()
    if (error || !article) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ article: snakeToCamel(article) })
  }

  const article = await db.knowledgeArticle.findUnique({ where: { id } })
  if (!article) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ article })
}
