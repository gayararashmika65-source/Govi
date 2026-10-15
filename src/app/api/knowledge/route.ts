import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const category = searchParams.get('category')

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return Response.json({ articles: [] })
    let query = admin.from('knowledge_articles').select('*')
    if (q) query = query.or(`title.ilike.%${q}%,summary.ilike.%${q}%,tags.ilike.%${q}%,content.ilike.%${q}%`)
    if (category) query = query.eq('category', category)
    query = query.order('created_at', { ascending: false })
    const { data, error } = await query
    if (error) return Response.json({ articles: [] })
    return Response.json({ articles: (data || []).map(snakeToCamel) })
  }

  const articles = await db.knowledgeArticle.findMany({
    where: {
      AND: [
        q ? { OR: [{ title: { contains: q } }, { summary: { contains: q } }, { tags: { contains: q } }, { content: { contains: q } }] } : {},
        category ? { category } : {},
      ],
    },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json({ articles })
}
