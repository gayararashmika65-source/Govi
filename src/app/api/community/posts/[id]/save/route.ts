import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError } from '@/lib/server-helpers'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id: postId } = await params

  const post = await db.communityPost.findUnique({
    where: { id: postId },
    select: { id: true },
  })
  if (!post) return apiError('Post not found', 404)

  const existing = await db.postSave.findUnique({
    where: {
      postId_userId: {
        postId,
        userId: session.id,
      },
    },
  })

  if (existing) {
    await Promise.all([
      db.postSave.delete({ where: { id: existing.id } }),
      db.communityPost.update({
        where: { id: postId },
        data: { savesCount: { decrement: 1 } },
      }),
    ])
    return Response.json({ saved: false })
  } else {
    await Promise.all([
      db.postSave.create({
        data: {
          postId,
          userId: session.id,
        },
      }),
      db.communityPost.update({
        where: { id: postId },
        data: { savesCount: { increment: 1 } },
      }),
    ])
    return Response.json({ saved: true })
  }
}
