import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, notify } from '@/lib/server-helpers'

const actionSchema = z.object({
  action: z.enum(['send_request', 'accept_request', 'reject_request', 'cancel_request', 'remove_friend']),
  targetUserId: z.string().min(1),
})

export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()

  // 1. Get all friend requests involving this user
  const [requests, userBlocks, userProfile] = await Promise.all([
    db.friendRequest.findMany({
      where: {
        OR: [{ senderId: session.id }, { receiverId: session.id }],
      },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            expertProfile: { select: { verified: true, title: true, crops: true } },
            farmerProfile: { select: { district: true, crops: true } },
          },
        },
        receiver: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            avatarUrl: true,
            expertProfile: { select: { verified: true, title: true, crops: true } },
            farmerProfile: { select: { district: true, crops: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    }),
    db.userBlock.findMany({
      where: {
        OR: [{ blockerId: session.id }, { blockedId: session.id }],
      },
      select: { blockerId: true, blockedId: true },
    }),
    db.user.findUnique({
      where: { id: session.id },
      include: {
        farmerProfile: { select: { district: true, crops: true } },
        expertProfile: { select: { crops: true, serviceAreas: true } },
      },
    }),
  ])

  const blockedUserIds = new Set([
    ...userBlocks.map((b) => (b.blockerId === session.id ? b.blockedId : b.blockerId)),
  ])

  const friends: any[] = []
  const incoming: any[] = []
  const outgoing: any[] = []
  const connectedUserIds = new Set<string>([session.id])

  for (const r of requests) {
    const isSender = r.senderId === session.id
    const otherUser = isSender ? r.receiver : r.sender

    if (blockedUserIds.has(otherUser.id)) continue

    const formattedOther = {
      id: otherUser.id,
      name: otherUser.name,
      email: otherUser.email,
      role: otherUser.role,
      avatarUrl: otherUser.avatarUrl,
      verified: otherUser.expertProfile?.verified || false,
      title: otherUser.expertProfile?.title || null,
      district: otherUser.farmerProfile?.district || null,
      crops: otherUser.farmerProfile?.crops || otherUser.expertProfile?.crops || null,
    }

    if (r.status === 'ACCEPTED') {
      connectedUserIds.add(otherUser.id)
      friends.push({
        requestId: r.id,
        user: formattedOther,
        connectedAt: r.updatedAt.toISOString(),
      })
    } else if (r.status === 'PENDING') {
      connectedUserIds.add(otherUser.id)
      if (isSender) {
        outgoing.push({
          requestId: r.id,
          user: formattedOther,
          sentAt: r.createdAt.toISOString(),
        })
      } else {
        incoming.push({
          requestId: r.id,
          user: formattedOther,
          receivedAt: r.createdAt.toISOString(),
        })
      }
    }
  }

  // 2. Discover suggested connections
  // Look for other users that are not in connectedUserIds and not blocked
  const userDistrict = userProfile?.farmerProfile?.district || null
  const userCrops = (userProfile?.farmerProfile?.crops || userProfile?.expertProfile?.crops || '')
    .split(',')
    .map((c) => c.trim().toLowerCase())
    .filter(Boolean)

  const potentialUsers = await db.user.findMany({
    where: {
      id: { notIn: Array.from(new Set([...connectedUserIds, ...blockedUserIds])) },
      status: 'ACTIVE',
    },
    take: 30,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      farmerProfile: { select: { district: true, crops: true } },
      expertProfile: { select: { verified: true, title: true, crops: true, serviceAreas: true } },
    },
  })

  // Rank suggestions
  const suggestions = potentialUsers
    .map((u) => {
      let score = 0
      const uDistrict = u.farmerProfile?.district || null
      const uCropsStr = (u.farmerProfile?.crops || u.expertProfile?.crops || '').toLowerCase()

      // Bonus for same district
      if (userDistrict && uDistrict && userDistrict.toLowerCase() === uDistrict.toLowerCase()) {
        score += 3
      }
      // Bonus for verified agricultural expert
      if (u.expertProfile?.verified) {
        score += 2
      }
      // Bonus for shared crops
      for (const c of userCrops) {
        if (uCropsStr.includes(c)) {
          score += 2
          break
        }
      }

      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatarUrl: u.avatarUrl,
        verified: u.expertProfile?.verified || false,
        title: u.expertProfile?.title || null,
        district: uDistrict,
        crops: u.farmerProfile?.crops || u.expertProfile?.crops || null,
        score,
      }
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)

  return Response.json({
    friends,
    incoming,
    outgoing,
    suggestions,
    counts: {
      friendsCount: friends.length,
      incomingCount: incoming.length,
      outgoingCount: outgoing.length,
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
    return apiError('Invalid JSON')
  }

  const parsed = actionSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { action, targetUserId } = parsed.data

  if (targetUserId === session.id) {
    return apiError('You cannot connect with yourself')
  }

  // Check if target user exists
  const targetUser = await db.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, status: true },
  })
  if (!targetUser || targetUser.status === 'SUSPENDED') {
    return apiError('Target user not found or unavailable', 404)
  }

  // Check block
  const isBlocked = await db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: session.id, blockedId: targetUserId },
        { blockerId: targetUserId, blockedId: session.id },
      ],
    },
  })
  if (isBlocked) {
    return apiError('Unable to connect with this user')
  }

  // Existing friend request between the two
  const existing = await db.friendRequest.findFirst({
    where: {
      OR: [
        { senderId: session.id, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: session.id },
      ],
    },
  })

  switch (action) {
    case 'send_request': {
      if (existing) {
        if (existing.status === 'ACCEPTED') {
          return apiError('You are already connected with this user')
        }
        if (existing.status === 'PENDING') {
          if (existing.senderId === session.id) {
            return apiError('Connection request already sent')
          } else {
            // Target had already sent a request to session user! Auto-accept.
            await db.friendRequest.update({
              where: { id: existing.id },
              data: { status: 'ACCEPTED' },
            })
            await notify(
              targetUserId,
              'FRIEND_ACCEPT',
              'Connection Request Accepted',
              `${session.name} accepted your connection request`,
              'community',
            )
            return Response.json({ success: true, status: 'ACCEPTED', message: 'Connected successfully' })
          }
        }
        // If previously REJECTED or CANCELLED, re-open as PENDING
        const updated = await db.friendRequest.update({
          where: { id: existing.id },
          data: {
            senderId: session.id,
            receiverId: targetUserId,
            status: 'PENDING',
          },
        })
        await notify(
          targetUserId,
          'FRIEND_REQUEST',
          'New Connection Request',
          `${session.name} sent you a connection request on GoviSahana`,
          'community',
        )
        return Response.json({ success: true, status: 'PENDING', request: updated })
      }

      // Create new request
      const created = await db.friendRequest.create({
        data: {
          senderId: session.id,
          receiverId: targetUserId,
          status: 'PENDING',
        },
      })

      await notify(
        targetUserId,
        'FRIEND_REQUEST',
        'New Connection Request',
        `${session.name} sent you a connection request on GoviSahana`,
        'community',
      )

      return Response.json({ success: true, status: 'PENDING', request: created })
    }

    case 'accept_request': {
      if (!existing || existing.status !== 'PENDING') {
        return apiError('No pending connection request to accept')
      }
      if (existing.receiverId !== session.id) {
        return apiError('Only the recipient can accept this connection request')
      }

      const updated = await db.friendRequest.update({
        where: { id: existing.id },
        data: { status: 'ACCEPTED' },
      })

      await notify(
        existing.senderId,
        'FRIEND_ACCEPT',
        'Connection Request Accepted',
        `${session.name} accepted your connection request`,
        'community',
      )

      return Response.json({ success: true, status: 'ACCEPTED', request: updated })
    }

    case 'reject_request': {
      if (!existing || existing.status !== 'PENDING') {
        return apiError('No pending connection request to reject')
      }
      if (existing.receiverId !== session.id) {
        return apiError('Only the recipient can decline this connection request')
      }

      await db.friendRequest.update({
        where: { id: existing.id },
        data: { status: 'REJECTED' },
      })

      return Response.json({ success: true, status: 'REJECTED' })
    }

    case 'cancel_request': {
      if (!existing || existing.status !== 'PENDING') {
        return apiError('No pending connection request to cancel')
      }
      if (existing.senderId !== session.id) {
        return apiError('Only the sender can cancel this connection request')
      }

      await db.friendRequest.update({
        where: { id: existing.id },
        data: { status: 'CANCELLED' },
      })

      return Response.json({ success: true, status: 'CANCELLED' })
    }

    case 'remove_friend': {
      if (!existing || existing.status !== 'ACCEPTED') {
        return apiError('You are not currently connected with this user')
      }

      await db.friendRequest.delete({
        where: { id: existing.id },
      })

      return Response.json({ success: true, status: 'NONE', message: 'Connection removed' })
    }

    default:
      return apiError('Invalid action')
  }
}
