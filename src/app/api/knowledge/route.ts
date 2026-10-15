import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized } from '@/lib/server-helpers'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const category = searchParams.get('category')
  const articles = await db.knowledgeArticle.findMany({
    where: {
      AND: [
        q ? {
          OR: [
            { title: { contains: q } },
            { summary: { contains: q } },
            { tags: { contains: q } },
            { content: { contains: q } },
          ],
        } : {},
        category ? { category } : {},
      ],
    },
    orderBy: { createdAt: 'desc' },
  })
  return Response.json({ articles })
}
