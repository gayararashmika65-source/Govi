import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, forbidden } from '@/lib/server-helpers'

const editSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty'),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params

  const comment = await db.postComment.findUnique({ where: { id } })
  if (!comment) return apiError('Comment not found', 404)

  if (comment.authorId !== session.id) return forbidden()

  let body
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON')
  }

  const parsed = editSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input')

  const updated = await db.postComment.update({
    where: { id },
    data: { content: parsed.data.content },
  })

  return Response.json({ comment: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params

  const comment = await db.postComment.findUnique({ where: { id } })
  if (!comment) return apiError('Comment not found', 404)

  const isAuthor = comment.authorId === session.id
  const isAdmin = session.role === 'ADMIN'
  if (!isAuthor && !isAdmin) return forbidden()

  await Promise.all([
    db.postComment.delete({ where: { id } }),
    db.communityPost.update({
      where: { id: comment.postId },
      data: { commentsCount: { decrement: 1 } },
    }),
  ])

  return Response.json({ success: true, message: 'Comment deleted' })
}
