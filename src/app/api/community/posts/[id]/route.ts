import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, forbidden } from '@/lib/server-helpers'

const updateSchema = z.object({
  content: z.string().min(1).optional(),
  category: z.string().optional(),
  mediaUrls: z.array(z.string()).optional(),
  hashtags: z.array(z.string()).optional(),
  visibility: z.enum(['PUBLIC', 'CONNECTIONS']).optional(),
  pinned: z.boolean().optional(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  const { id } = await params

  const post = await db.communityPost.findUnique({
    where: { id },
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
      sharedPost: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
              avatarUrl: true,
              expertProfile: { select: { verified: true, title: true } },
            },
          },
        },
      },
      likes: session ? { where: { userId: session.id }, select: { id: true } } : false,
      saves: session ? { where: { userId: session.id }, select: { id: true } } : false,
    },
  })

  if (!post) {
    return apiError('Post not found', 404)
  }

  let mediaList: string[] = []
  try {
    if (post.mediaUrls) {
      mediaList = post.mediaUrls.startsWith('[') ? JSON.parse(post.mediaUrls) : post.mediaUrls.split(',').filter(Boolean)
    }
  } catch {
    mediaList = []
  }

  let tagList: string[] = []
  try {
    if (post.hashtags) {
      tagList = post.hashtags.startsWith('[') ? JSON.parse(post.hashtags) : post.hashtags.split(/[,\s]+/).filter(Boolean)
    }
  } catch {
    tagList = []
  }

  const likedByMe = session ? ((post as any).likes?.length ?? 0) > 0 : false
  const savedByMe = session ? ((post as any).saves?.length ?? 0) > 0 : false

  return Response.json({
    post: {
      id: post.id,
      authorId: post.authorId,
      author: {
        id: post.author.id,
        name: post.author.name,
        email: post.author.email,
        role: post.author.role,
        avatarUrl: post.author.avatarUrl,
        verified: post.author.expertProfile?.verified || false,
        district: post.author.farmerProfile?.district || null,
        title: post.author.expertProfile?.title || null,
      },
      content: post.content,
      category: post.category,
      mediaUrls: mediaList,
      hashtags: tagList,
      visibility: post.visibility,
      pinned: post.pinned,
      sharedPostId: post.sharedPostId,
      sharedCaption: post.sharedCaption,
      likesCount: post.likesCount,
      commentsCount: post.commentsCount,
      sharesCount: post.sharesCount,
      savesCount: post.savesCount,
      likedByMe,
      savedByMe,
      isAuthor: session ? post.authorId === session.id : false,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
    },
  })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params

  const post = await db.communityPost.findUnique({ where: { id } })
  if (!post) return apiError('Post not found', 404)

  const isAuthor = post.authorId === session.id
  const isAdmin = session.role === 'ADMIN'
  if (!isAuthor && !isAdmin) return forbidden()

  let body
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON')
  }

  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input')

  const dataToUpdate: any = {}
  if (parsed.data.content !== undefined) dataToUpdate.content = parsed.data.content
  if (parsed.data.category !== undefined) dataToUpdate.category = parsed.data.category
  if (parsed.data.mediaUrls !== undefined) dataToUpdate.mediaUrls = JSON.stringify(parsed.data.mediaUrls)
  if (parsed.data.hashtags !== undefined) dataToUpdate.hashtags = JSON.stringify(parsed.data.hashtags)
  if (parsed.data.visibility !== undefined) dataToUpdate.visibility = parsed.data.visibility
  if (isAdmin && parsed.data.pinned !== undefined) dataToUpdate.pinned = parsed.data.pinned

  const updated = await db.communityPost.update({
    where: { id },
    data: dataToUpdate,
  })

  return Response.json({ post: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params

  const post = await db.communityPost.findUnique({ where: { id } })
  if (!post) return apiError('Post not found', 404)

  const isAuthor = post.authorId === session.id
  const isAdmin = session.role === 'ADMIN'
  if (!isAuthor && !isAdmin) return forbidden()

  await db.communityPost.delete({ where: { id } })
  return Response.json({ success: true, message: 'Post deleted successfully' })
}
