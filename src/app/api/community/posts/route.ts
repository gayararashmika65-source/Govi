import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, notify } from '@/lib/server-helpers'

const createSchema = z.object({
  content: z.string().min(1, 'Post content cannot be empty'),
  category: z.string().default('GENERAL'),
  mediaUrls: z.array(z.string()).optional().default([]),
  hashtags: z.array(z.string()).optional().default([]),
  visibility: z.enum(['PUBLIC', 'CONNECTIONS']).default('PUBLIC'),
  sharedPostId: z.string().optional().nullable(),
  sharedCaption: z.string().optional().nullable(),
})

export async function GET(req: NextRequest) {
  const session = await getSession()
  const { searchParams } = new URL(req.url)
  const tab = searchParams.get('tab') || 'all'
  const category = searchParams.get('category')
  const hashtag = searchParams.get('hashtag')
  const search = searchParams.get('search')?.trim()
  const authorId = searchParams.get('authorId')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
  const skip = (page - 1) * limit

  // 1. Gather blocked users if session exists
  let blockedUserIds: string[] = []
  let friendUserIds: string[] = []
  let followingUserIds: string[] = []

  if (session) {
    const [blocks1, blocks2, friends, follows] = await Promise.all([
      db.userBlock.findMany({ where: { blockerId: session.id }, select: { blockedId: true } }),
      db.userBlock.findMany({ where: { blockedId: session.id }, select: { blockerId: true } }),
      db.friendRequest.findMany({
        where: {
          status: 'ACCEPTED',
          OR: [{ senderId: session.id }, { receiverId: session.id }],
        },
        select: { senderId: true, receiverId: true },
      }),
      db.userFollow.findMany({ where: { followerId: session.id }, select: { followingId: true } }),
    ])

    blockedUserIds = Array.from(new Set([
      ...blocks1.map((b) => b.blockedId),
      ...blocks2.map((b) => b.blockerId),
    ]))

    friendUserIds = friends.map((f) => (f.senderId === session.id ? f.receiverId : f.senderId))
    followingUserIds = follows.map((f) => f.followingId)
  }

  // 2. Build where filter
  const where: any = {
    AND: [],
  }

  // Filter blocked authors
  if (blockedUserIds.length > 0) {
    where.AND.push({ authorId: { notIn: blockedUserIds } })
  }

  // Category filter
  if (category && category !== 'ALL') {
    where.AND.push({ category })
  }

  // Specific author
  if (authorId) {
    where.AND.push({ authorId })
  }

  // Search keyword or hashtag
  if (search) {
    where.AND.push({
      OR: [
        { content: { contains: search } },
        { hashtags: { contains: search } },
        { author: { name: { contains: search } } },
      ],
    })
  }

  if (hashtag) {
    const cleanTag = hashtag.startsWith('#') ? hashtag : `#${hashtag}`
    where.AND.push({
      OR: [
        { hashtags: { contains: cleanTag } },
        { content: { contains: cleanTag } },
      ],
    })
  }

  // Tab filtering
  if (tab === 'following') {
    if (!session) return unauthorized()
    where.AND.push({ authorId: { in: followingUserIds } })
  } else if (tab === 'my') {
    if (!session) return unauthorized()
    where.AND.push({ authorId: session.id })
  } else if (tab === 'saved') {
    if (!session) return unauthorized()
    const saved = await db.postSave.findMany({ where: { userId: session.id }, select: { postId: true } })
    const savedIds = saved.map((s) => s.postId)
    where.AND.push({ id: { in: savedIds } })
  }

  // Visibility: if CONNECTIONS, only visible if author is self or accepted connection
  if (session) {
    where.AND.push({
      OR: [
        { visibility: 'PUBLIC' },
        { authorId: session.id },
        { authorId: { in: friendUserIds } },
      ],
    })
  } else {
    where.AND.push({ visibility: 'PUBLIC' })
  }

  // Order By
  let orderBy: any = [{ pinned: 'desc' }, { createdAt: 'desc' }]
  if (tab === 'popular') {
    orderBy = [{ pinned: 'desc' }, { likesCount: 'desc' }, { commentsCount: 'desc' }, { createdAt: 'desc' }]
  }

  // Query posts
  const [totalCount, rawPosts] = await Promise.all([
    db.communityPost.count({ where }),
    db.communityPost.findMany({
      where,
      orderBy,
      skip,
      take: limit,
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
    }),
  ])

  // Format posts
  const posts = rawPosts.map((p) => {
    let mediaList: string[] = []
    try {
      if (p.mediaUrls) {
        mediaList = p.mediaUrls.startsWith('[') ? JSON.parse(p.mediaUrls) : p.mediaUrls.split(',').filter(Boolean)
      }
    } catch {
      mediaList = []
    }

    let tagList: string[] = []
    try {
      if (p.hashtags) {
        tagList = p.hashtags.startsWith('[') ? JSON.parse(p.hashtags) : p.hashtags.split(/[,\s]+/).filter(Boolean)
      }
    } catch {
      tagList = []
    }

    const likedByMe = session ? ((p as any).likes?.length ?? 0) > 0 : false
    const savedByMe = session ? ((p as any).saves?.length ?? 0) > 0 : false
    const isAuthor = session ? p.authorId === session.id : false

    let formattedSharedPost: any = null
    if (p.sharedPost) {
      let sharedMedia: string[] = []
      try {
        if (p.sharedPost.mediaUrls) {
          sharedMedia = p.sharedPost.mediaUrls.startsWith('[') ? JSON.parse(p.sharedPost.mediaUrls) : p.sharedPost.mediaUrls.split(',').filter(Boolean)
        }
      } catch {
        sharedMedia = []
      }

      formattedSharedPost = {
        id: p.sharedPost.id,
        authorId: p.sharedPost.authorId,
        author: {
          id: p.sharedPost.author.id,
          name: p.sharedPost.author.name,
          email: p.sharedPost.author.email,
          role: p.sharedPost.author.role,
          avatarUrl: p.sharedPost.author.avatarUrl,
          verified: p.sharedPost.author.expertProfile?.verified || false,
          title: p.sharedPost.author.expertProfile?.title || null,
        },
        content: p.sharedPost.content,
        category: p.sharedPost.category,
        mediaUrls: sharedMedia,
        createdAt: p.sharedPost.createdAt.toISOString(),
      }
    }

    return {
      id: p.id,
      authorId: p.authorId,
      author: {
        id: p.author.id,
        name: p.author.name,
        email: p.author.email,
        role: p.author.role,
        avatarUrl: p.author.avatarUrl,
        verified: p.author.expertProfile?.verified || false,
        district: p.author.farmerProfile?.district || null,
        title: p.author.expertProfile?.title || null,
      },
      content: p.content,
      category: p.category,
      mediaUrls: mediaList,
      hashtags: tagList,
      visibility: p.visibility as 'PUBLIC' | 'CONNECTIONS',
      pinned: p.pinned,
      sharedPostId: p.sharedPostId,
      sharedPost: formattedSharedPost,
      sharedCaption: p.sharedCaption,
      likesCount: p.likesCount,
      commentsCount: p.commentsCount,
      sharesCount: p.sharesCount,
      savesCount: p.savesCount,
      likedByMe,
      savedByMe,
      isAuthor,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }
  })

  return Response.json({
    posts,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasMore: skip + posts.length < totalCount,
    },
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  let body
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid request JSON')
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message ?? 'Invalid post data')
  }

  const { content, category, mediaUrls, visibility, sharedPostId, sharedCaption } = parsed.data
  let hashtags = parsed.data.hashtags

  // Auto-extract hashtags from text if not provided
  if (!hashtags || hashtags.length === 0) {
    const extracted = content.match(/#[a-zA-Z0-9_\u0D80-\u0DFF\u0B80-\u0BFF]+/g)
    if (extracted) {
      hashtags = Array.from(new Set(extracted))
    }
  }

  // Handle quote share
  let originalPost: any = null
  if (sharedPostId) {
    originalPost = await db.communityPost.findUnique({
      where: { id: sharedPostId },
      include: { author: { select: { id: true, name: true } } },
    })
    if (!originalPost) {
      return apiError('The original post to share does not exist')
    }
  }

  // Create the post
  const newPost = await db.communityPost.create({
    data: {
      authorId: session.id,
      content,
      category,
      mediaUrls: mediaUrls.length > 0 ? JSON.stringify(mediaUrls) : null,
      hashtags: hashtags.length > 0 ? JSON.stringify(hashtags) : null,
      visibility,
      sharedPostId: sharedPostId || null,
      sharedCaption: sharedCaption || null,
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

  // If this was a share, increment shares count on original post & record PostShare & notify
  if (originalPost) {
    await Promise.all([
      db.communityPost.update({
        where: { id: originalPost.id },
        data: { sharesCount: { increment: 1 } },
      }),
      db.postShare.create({
        data: {
          originalPostId: originalPost.id,
          userId: session.id,
          caption: sharedCaption || null,
        },
      }),
      session.id !== originalPost.authorId
        ? notify(
            originalPost.authorId,
            'POST_SHARE',
            'Post Shared',
            `${session.name} shared your post with the GoviSahana community`,
            'community',
          )
        : Promise.resolve(),
    ])
  }

  return Response.json({
    post: {
      id: newPost.id,
      authorId: newPost.authorId,
      author: {
        id: newPost.author.id,
        name: newPost.author.name,
        email: newPost.author.email,
        role: newPost.author.role,
        avatarUrl: newPost.author.avatarUrl,
        verified: newPost.author.expertProfile?.verified || false,
        district: newPost.author.farmerProfile?.district || null,
        title: newPost.author.expertProfile?.title || null,
      },
      content: newPost.content,
      category: newPost.category,
      mediaUrls,
      hashtags,
      visibility: newPost.visibility,
      pinned: newPost.pinned,
      sharedPostId: newPost.sharedPostId,
      sharedCaption: newPost.sharedCaption,
      likesCount: 0,
      commentsCount: 0,
      sharesCount: 0,
      savesCount: 0,
      likedByMe: false,
      savedByMe: false,
      isAuthor: true,
      createdAt: newPost.createdAt.toISOString(),
      updatedAt: newPost.updatedAt.toISOString(),
    },
  })
}
