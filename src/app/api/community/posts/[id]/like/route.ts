import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, notify } from '@/lib/server-helpers'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id: postId } = await params

  const post = await db.communityPost.findUnique({
    where: { id: postId },
    select: { id: true, authorId: true, content: true },
  })
  if (!post) return apiError('Post not found', 404)

  const existing = await db.postLike.findUnique({
    where: {
      postId_userId: {
        postId,
        userId: session.id,
      },
    },
  })

  if (existing) {
    // Unlike
    await Promise.all([
      db.postLike.delete({ where: { id: existing.id } }),
      db.communityPost.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      }),
    ])

    const updated = await db.communityPost.findUnique({
      where: { id: postId },
      select: { likesCount: true },
    })

    return Response.json({
      liked: false,
      likesCount: Math.max(0, updated?.likesCount ?? 0),
    })
  } else {
    // Like
    await Promise.all([
      db.postLike.create({
        data: {
          postId,
          userId: session.id,
        },
      }),
      db.communityPost.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      }),
    ])

    // Notify author if not self
    if (session.id !== post.authorId) {
      const snippet = post.content.slice(0, 50) + (post.content.length > 50 ? '...' : '')
      await notify(
        post.authorId,
        'POST_LIKE',
        'New Post Like',
        `${session.name} liked your post: "${snippet}"`,
        'community',
      )
    }

    const updated = await db.communityPost.findUnique({
      where: { id: postId },
      select: { likesCount: true },
    })

    return Response.json({
      liked: true,
      likesCount: updated?.likesCount ?? 1,
    })
  }
}
