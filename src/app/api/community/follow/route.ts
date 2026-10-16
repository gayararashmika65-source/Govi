import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, notify } from '@/lib/server-helpers'

const followSchema = z.object({
  targetUserId: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  let body
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON')
  }

  const parsed = followSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { targetUserId } = parsed.data
  if (targetUserId === session.id) {
    return apiError('You cannot follow yourself')
  }

  const existing = await db.userFollow.findUnique({
    where: {
      followerId_followingId: {
        followerId: session.id,
        followingId: targetUserId,
      },
    },
  })

  if (existing) {
    // Unfollow
    await db.userFollow.delete({ where: { id: existing.id } })
    const followersCount = await db.userFollow.count({ where: { followingId: targetUserId } })
    return Response.json({ following: false, followersCount })
  } else {
    // Follow
    await db.userFollow.create({
      data: {
        followerId: session.id,
        followingId: targetUserId,
      },
    })

    await notify(
      targetUserId,
      'FOLLOW',
      'New Follower',
      `${session.name} started following you on GoviSahana`,
      'user-profile',
    )

    const followersCount = await db.userFollow.count({ where: { followingId: targetUserId } })
    return Response.json({ following: true, followersCount })
  }
}
