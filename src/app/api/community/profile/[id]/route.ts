import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, forbidden } from '@/lib/server-helpers'

const profileUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().optional(),
  coverUrl: z.string().optional().nullable(),
  bio: z.string().optional().nullable(),
  district: z.string().optional().nullable(),
  languages: z.string().optional().nullable(),
  interests: z.string().optional().nullable(),
  crops: z.string().optional().nullable(),
  profession: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  const { id: userId } = await params

  const user = await db.user.findUnique({
    where: { id: userId },
    include: {
      communityProfile: true,
      expertProfile: {
        select: {
          verified: true,
          title: true,
          expertise: true,
          crops: true,
          languages: true,
          rating: true,
          hourlyRate: true,
          bio: true,
        },
      },
      farmerProfile: {
        select: {
          district: true,
          crops: true,
          farmSizeAcres: true,
          bio: true,
        },
      },
      enterpriseProfile: {
        select: {
          businessName: true,
          businessType: true,
          verified: true,
          district: true,
        },
      },
      workerProfile: {
        select: {
          skills: true,
          experience: true,
          district: true,
          available: true,
        },
      },
      buyerProfile: {
        select: {
          buyerType: true,
          company: true,
          district: true,
        },
      },
    },
  })

  if (!user || user.status === 'SUSPENDED') {
    return apiError('User not found or suspended', 404)
  }

  // Count social stats
  const [postsCount, followersCount, followingCount, friendsAsSender, friendsAsReceiver] = await Promise.all([
    db.communityPost.count({ where: { authorId: userId } }),
    db.userFollow.count({ where: { followingId: userId } }),
    db.userFollow.count({ where: { followerId: userId } }),
    db.friendRequest.count({ where: { senderId: userId, status: 'ACCEPTED' } }),
    db.friendRequest.count({ where: { receiverId: userId, status: 'ACCEPTED' } }),
  ])

  const friendsCount = friendsAsSender + friendsAsReceiver

  // Relationship to viewing session
  let isSelf = false
  let isFollowing = false
  let isBlocked = false
  let friendshipStatus: 'NONE' | 'PENDING_SENT' | 'PENDING_RECEIVED' | 'CONNECTED' = 'NONE'

  if (session) {
    isSelf = session.id === userId

    if (!isSelf) {
      const [followRecord, blockRecord, friendReq] = await Promise.all([
        db.userFollow.findUnique({
          where: {
            followerId_followingId: {
              followerId: session.id,
              followingId: userId,
            },
          },
        }),
        db.userBlock.findFirst({
          where: {
            OR: [
              { blockerId: session.id, blockedId: userId },
              { blockerId: userId, blockedId: session.id },
            ],
          },
        }),
        db.friendRequest.findFirst({
          where: {
            OR: [
              { senderId: session.id, receiverId: userId },
              { senderId: userId, receiverId: session.id },
            ],
          },
        }),
      ])

      isFollowing = !!followRecord
      isBlocked = !!blockRecord

      if (friendReq) {
        if (friendReq.status === 'ACCEPTED') {
          friendshipStatus = 'CONNECTED'
        } else if (friendReq.status === 'PENDING') {
          friendshipStatus = friendReq.senderId === session.id ? 'PENDING_SENT' : 'PENDING_RECEIVED'
        }
      }
    }
  }

  return Response.json({
    user: {
      id: user.id,
      name: user.name,
      email: isSelf ? user.email : undefined,
      role: user.role,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt.toISOString(),
      communityProfile: user.communityProfile,
      expertProfile: user.expertProfile,
      farmerProfile: user.farmerProfile,
      enterpriseProfile: user.enterpriseProfile,
      workerProfile: user.workerProfile,
      buyerProfile: user.buyerProfile,
    },
    counts: {
      postsCount,
      friendsCount,
      followersCount,
      followingCount,
    },
    relationship: {
      isSelf,
      isFollowing,
      isBlocked,
      friendshipStatus,
    },
  })
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id: userId } = await params

  if (session.id !== userId && session.role !== 'ADMIN') {
    return forbidden()
  }

  let body
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON')
  }

  const parsed = profileUpdateSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { name, avatarUrl, coverUrl, bio, district, languages, interests, crops, profession, website } = parsed.data

  // Update User table name & avatarUrl if provided
  const userUpdate: any = {}
  if (name) userUpdate.name = name
  if (avatarUrl !== undefined) userUpdate.avatarUrl = avatarUrl

  if (Object.keys(userUpdate).length > 0) {
    await db.user.update({
      where: { id: userId },
      data: userUpdate,
    })
  }

  // Upsert community profile
  const communityProfile = await db.communityProfile.upsert({
    where: { userId },
    create: {
      userId,
      coverUrl: coverUrl || null,
      bio: bio || null,
      district: district || null,
      languages: languages || null,
      interests: interests || null,
      crops: crops || null,
      profession: profession || null,
      website: website || null,
    },
    update: {
      coverUrl: coverUrl !== undefined ? coverUrl : undefined,
      bio: bio !== undefined ? bio : undefined,
      district: district !== undefined ? district : undefined,
      languages: languages !== undefined ? languages : undefined,
      interests: interests !== undefined ? interests : undefined,
      crops: crops !== undefined ? crops : undefined,
      profession: profession !== undefined ? profession : undefined,
      website: website !== undefined ? website : undefined,
    },
  })

  return Response.json({
    success: true,
    communityProfile,
    name: name || session.name,
    avatarUrl: avatarUrl !== undefined ? avatarUrl : session.avatarUrl,
  })
}
