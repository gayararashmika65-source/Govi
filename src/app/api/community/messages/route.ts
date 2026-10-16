import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, notify } from '@/lib/server-helpers'

const startMessageSchema = z.object({
  recipientId: z.string().min(1),
  body: z.string().min(1, 'Message cannot be empty'),
  mediaUrl: z.string().optional().nullable(),
})

export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()

  // Find all conversations where user is user1 or user2
  const conversations = await db.directConversation.findMany({
    where: {
      OR: [{ user1Id: session.id }, { user2Id: session.id }],
    },
    orderBy: { lastMessageAt: 'desc' },
    include: {
      user1: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          expertProfile: { select: { verified: true, title: true } },
        },
      },
      user2: {
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          expertProfile: { select: { verified: true, title: true } },
        },
      },
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
      },
    },
  })

  // Get unread counts per conversation
  const unreadCounts = await db.directMessage.groupBy({
    by: ['conversationId'],
    where: {
      senderId: { not: session.id },
      read: false,
      conversation: {
        OR: [{ user1Id: session.id }, { user2Id: session.id }],
      },
    },
    _count: { id: true },
  })

  const unreadMap = new Map(unreadCounts.map((u) => [u.conversationId, u._count.id]))

  const formatted = conversations.map((c) => {
    const isUser1 = c.user1Id === session.id
    const otherUser = isUser1 ? c.user2 : c.user1
    const lastMsg = c.messages[0] || null

    return {
      id: c.id,
      otherUser: {
        id: otherUser.id,
        name: otherUser.name,
        email: otherUser.email,
        role: otherUser.role,
        avatarUrl: otherUser.avatarUrl,
        verified: otherUser.expertProfile?.verified || false,
        title: otherUser.expertProfile?.title || null,
      },
      lastMessage: lastMsg
        ? {
            id: lastMsg.id,
            senderId: lastMsg.senderId,
            body: lastMsg.body,
            mediaUrl: lastMsg.mediaUrl,
            read: lastMsg.read,
            createdAt: lastMsg.createdAt.toISOString(),
          }
        : null,
      unreadCount: unreadMap.get(c.id) || 0,
      lastMessageAt: c.lastMessageAt.toISOString(),
    }
  })

  return Response.json({ conversations: formatted })
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

  const parsed = startMessageSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { recipientId, body: messageBody, mediaUrl } = parsed.data

  if (recipientId === session.id) {
    return apiError('You cannot message yourself')
  }

  // Check blocks
  const isBlocked = await db.userBlock.findFirst({
    where: {
      OR: [
        { blockerId: session.id, blockedId: recipientId },
        { blockerId: recipientId, blockedId: session.id },
      ],
    },
  })
  if (isBlocked) {
    return apiError('Unable to send message to this user')
  }

  // Standardize pair order: user1Id < user2Id
  const [user1Id, user2Id] = session.id < recipientId ? [session.id, recipientId] : [recipientId, session.id]

  // Upsert conversation
  const conversation = await db.directConversation.upsert({
    where: {
      user1Id_user2Id: { user1Id, user2Id },
    },
    create: {
      user1Id,
      user2Id,
      lastMessageAt: new Date(),
    },
    update: {
      lastMessageAt: new Date(),
    },
  })

  // Create message
  const message = await db.directMessage.create({
    data: {
      conversationId: conversation.id,
      senderId: session.id,
      body: messageBody,
      mediaUrl: mediaUrl || null,
    },
  })

  // Notify recipient
  await notify(
    recipientId,
    'DIRECT_MESSAGE',
    'New Message',
    `${session.name}: ${messageBody.slice(0, 50)}`,
    'community-messages',
  )

  return Response.json({
    conversationId: conversation.id,
    message: {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      body: message.body,
      mediaUrl: message.mediaUrl,
      read: message.read,
      createdAt: message.createdAt.toISOString(),
    },
  })
}
