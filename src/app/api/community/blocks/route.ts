import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError } from '@/lib/server-helpers'

const blockSchema = z.object({
  targetUserId: z.string().min(1),
  action: z.enum(['block', 'unblock']).default('block'),
})

export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()

  const blocks = await db.userBlock.findMany({
    where: { blockerId: session.id },
    include: {
      blocked: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  return Response.json({
    blocks: blocks.map((b) => ({
      id: b.id,
      blockedUser: b.blocked,
      blockedAt: b.createdAt.toISOString(),
    })),
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()

  let body
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON')
  }

  const parsed = blockSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { targetUserId, action } = parsed.data
  if (targetUserId === session.id) {
    return apiError('You cannot block yourself')
  }

  const existing = await db.userBlock.findUnique({
    where: {
      blockerId_blockedId: {
        blockerId: session.id,
        blockedId: targetUserId,
      },
    },
  })

  if (action === 'unblock') {
    if (existing) {
      await db.userBlock.delete({ where: { id: existing.id } })
    }
    return Response.json({ blocked: false, message: 'User unblocked' })
  }

  // Block
  if (!existing) {
    await Promise.all([
      db.userBlock.create({
        data: {
          blockerId: session.id,
          blockedId: targetUserId,
        },
      }),
      // Remove any friendship between them
      db.friendRequest.deleteMany({
        where: {
          OR: [
            { senderId: session.id, receiverId: targetUserId },
            { senderId: targetUserId, receiverId: session.id },
          ],
        },
      }),
      // Unfollow both ways
      db.userFollow.deleteMany({
        where: {
          OR: [
            { followerId: session.id, followingId: targetUserId },
            { followerId: targetUserId, followingId: session.id },
          ],
        },
      }),
    ])
  }

  return Response.json({ blocked: true, message: 'User blocked' })
}
