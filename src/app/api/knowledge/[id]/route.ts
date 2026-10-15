import { db } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const article = await db.knowledgeArticle.findUnique({ where: { id } })
  if (!article) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ article })
}
