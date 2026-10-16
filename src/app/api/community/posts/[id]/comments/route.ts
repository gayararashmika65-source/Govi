import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, notify } from '@/lib/server-helpers'

const commentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
  parentId: z.string().optional().nullable(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: postId } = await params

  const comments = await db.postComment.findMany({
    where: { postId },
    orderBy: { createdAt: 'asc' },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          expertProfile: { select: { verified: true, title: true } },
          farmerProfile: { select: { district: true } },
        },
      },
    },
  })

  // Format comments with hierarchical replies
  const commentMap = new Map<string, any>()
  const rootComments: any[] = []

  for (const c of comments) {
    const formatted = {
      id: c.id,
      postId: c.postId,
      authorId: c.authorId,
      author: {
        id: c.author.id,
        name: c.author.name,
        email: c.author.email,
        role: c.author.role,
        avatarUrl: c.author.avatarUrl,
        verified: c.author.expertProfile?.verified || false,
        district: c.author.farmerProfile?.district || null,
        title: c.author.expertProfile?.title || null,
      },
      parentId: c.parentId,
      content: c.content,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      replies: [],
    }
    commentMap.set(c.id, formatted)
  }

  for (const c of comments) {
    const formatted = commentMap.get(c.id)
    if (c.parentId && commentMap.has(c.parentId)) {
      commentMap.get(c.parentId).replies.push(formatted)
    } else {
      rootComments.push(formatted)
    }
  }

  return Response.json({ comments: rootComments })
}

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

  let body
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON')
  }

  const parsed = commentSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { content, parentId } = parsed.data

  let parentComment: any = null
  if (parentId) {
    parentComment = await db.postComment.findUnique({
      where: { id: parentId },
      include: { author: { select: { id: true, name: true } } },
    })
    if (!parentComment || parentComment.postId !== postId) {
      return apiError('Parent comment not found')
    }
  }

  const newComment = await db.postComment.create({
    data: {
      postId,
      authorId: session.id,
      content,
      parentId: parentId || null,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          expertProfile: { select: { verified: true, title: true } },
          farmerProfile: { select: { district: true } },
        },
      },
    },
  })

  // Increment commentsCount on the post
  await db.communityPost.update({
    where: { id: postId },
    data: { commentsCount: { increment: 1 } },
  })

  // Notifications:
  // 1. If replying to a comment, notify parent comment author
  if (parentComment && parentComment.authorId !== session.id) {
    await notify(
      parentComment.authorId,
      'COMMENT_REPLY',
      'New Reply to Your Comment',
      `${session.name} replied: "${content.slice(0, 50)}"`,
      'community',
    )
  }

  // 2. Notify post author (if not self and not already notified as parent author)
  if (post.authorId !== session.id && (!parentComment || parentComment.authorId !== post.authorId)) {
    await notify(
      post.authorId,
      'POST_COMMENT',
      'New Comment on Your Post',
      `${session.name} commented: "${content.slice(0, 50)}"`,
      'community',
    )
  }

  return Response.json({
    comment: {
      id: newComment.id,
      postId: newComment.postId,
      authorId: newComment.authorId,
      author: {
        id: newComment.author.id,
        name: newComment.author.name,
        email: newComment.author.email,
        role: newComment.author.role,
        avatarUrl: newComment.author.avatarUrl,
        verified: newComment.author.expertProfile?.verified || false,
        district: newComment.author.farmerProfile?.district || null,
        title: newComment.author.expertProfile?.title || null,
      },
      parentId: newComment.parentId,
      content: newComment.content,
      createdAt: newComment.createdAt.toISOString(),
      updatedAt: newComment.updatedAt.toISOString(),
      replies: [],
    },
  })
}
