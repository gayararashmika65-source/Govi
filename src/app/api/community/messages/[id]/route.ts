import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, forbidden, notify } from '@/lib/server-helpers'

const replySchema = z.object({
  body: z.string().min(1, 'Message cannot be empty'),
  mediaUrl: z.string().optional().nullable(),
})

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id: conversationId } = await params

  const conversation = await db.directConversation.findUnique({
    where: { id: conversationId },
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
    },
  })

  if (!conversation) return apiError('Conversation not found', 404)

  const isUser1 = conversation.user1Id === session.id
  const isUser2 = conversation.user2Id === session.id
  if (!isUser1 && !isUser2 && session.role !== 'ADMIN') return forbidden()

  const otherUser = isUser1 ? conversation.user2 : conversation.user1

  // Mark all unread messages from other user as read
  await db.directMessage.updateMany({
    where: {
      conversationId,
      senderId: otherUser.id,
      read: false,
    },
    data: { read: true },
  })

  // Fetch messages
  const messages = await db.directMessage.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })

  return Response.json({
    conversationId: conversation.id,
    otherUser: {
      id: otherUser.id,
      name: otherUser.name,
      email: otherUser.email,
      role: otherUser.role,
      avatarUrl: otherUser.avatarUrl,
      verified: otherUser.expertProfile?.verified || false,
      title: otherUser.expertProfile?.title || null,
    },
    messages: messages.map((m) => ({
      id: m.id,
      conversationId: m.conversationId,
      senderId: m.senderId,
      body: m.body,
      mediaUrl: m.mediaUrl,
      read: m.read,
      createdAt: m.createdAt.toISOString(),
      isMine: m.senderId === session.id,
    })),
  })
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id: conversationId } = await params

  const conversation = await db.directConversation.findUnique({
    where: { id: conversationId },
  })
  if (!conversation) return apiError('Conversation not found', 404)

  const isUser1 = conversation.user1Id === session.id
  const isUser2 = conversation.user2Id === session.id
  if (!isUser1 && !isUser2) return forbidden()

  const recipientId = isUser1 ? conversation.user2Id : conversation.user1Id

  // Check if blocked
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

  let body
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON')
  }

  const parsed = replySchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { body: messageBody, mediaUrl } = parsed.data

  const [message] = await Promise.all([
    db.directMessage.create({
      data: {
        conversationId,
        senderId: session.id,
        body: messageBody,
        mediaUrl: mediaUrl || null,
      },
    }),
    db.directConversation.update({
      where: { id: conversationId },
      data: { lastMessageAt: new Date() },
    }),
    notify(
      recipientId,
      'DIRECT_MESSAGE',
      'New Message',
      `${session.name}: ${messageBody.slice(0, 50)}`,
      'community-messages',
    ),
  ])

  return Response.json({
    message: {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      body: message.body,
      mediaUrl: message.mediaUrl,
      read: message.read,
      createdAt: message.createdAt.toISOString(),
      isMine: true,
    },
  })
}
