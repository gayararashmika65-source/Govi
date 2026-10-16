import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, forbidden } from '@/lib/server-helpers'

const reportSchema = z.object({
  targetType: z.enum(['POST', 'COMMENT', 'USER']),
  targetId: z.string().min(1),
  reason: z.string().min(3, 'Please provide a valid reason (minimum 3 characters)'),
})

const adminActionSchema = z.object({
  reportId: z.string().min(1),
  action: z.enum(['RESOLVE', 'DISMISS', 'DELETE_CONTENT']),
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

  const parsed = reportSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { targetType, targetId, reason } = parsed.data

  const report = await db.report.create({
    data: {
      reporterId: session.id,
      targetType,
      targetId,
      reason,
      status: 'OPEN',
    },
  })

  return Response.json({
    success: true,
    message: 'Thank you. Your report has been submitted to the moderation team.',
    reportId: report.id,
  })
}

export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'ADMIN') return forbidden()

  const reports = await db.report.findMany({
    where: {
      targetType: { in: ['POST', 'COMMENT', 'USER'] },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      reporter: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
  })

  // Enrich with target item details
  const enriched = await Promise.all(
    reports.map(async (r) => {
      let targetDetails: any = null
      if (r.targetType === 'POST') {
        targetDetails = await db.communityPost.findUnique({
          where: { id: r.targetId },
          select: { id: true, content: true, authorId: true, author: { select: { name: true } } },
        })
      } else if (r.targetType === 'COMMENT') {
        targetDetails = await db.postComment.findUnique({
          where: { id: r.targetId },
          select: { id: true, content: true, authorId: true, author: { select: { name: true } } },
        })
      } else if (r.targetType === 'USER') {
        targetDetails = await db.user.findUnique({
          where: { id: r.targetId },
          select: { id: true, name: true, email: true, role: true, status: true },
        })
      }

      return {
        id: r.id,
        targetType: r.targetType,
        targetId: r.targetId,
        reason: r.reason,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        reporter: r.reporter,
        targetDetails,
      }
    }),
  )

  return Response.json({ reports: enriched })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  if (session.role !== 'ADMIN') return forbidden()

  let body
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid JSON')
  }

  const parsed = adminActionSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid input')

  const { reportId, action } = parsed.data

  const report = await db.report.findUnique({ where: { id: reportId } })
  if (!report) return apiError('Report not found', 404)

  if (action === 'DELETE_CONTENT') {
    if (report.targetType === 'POST') {
      await db.communityPost.delete({ where: { id: report.targetId } }).catch(() => {})
    } else if (report.targetType === 'COMMENT') {
      const comment = await db.postComment.findUnique({ where: { id: report.targetId } })
      if (comment) {
        await Promise.all([
          db.postComment.delete({ where: { id: comment.id } }),
          db.communityPost.update({
            where: { id: comment.postId },
            data: { commentsCount: { decrement: 1 } },
          }),
        ])
      }
    }
    await db.report.update({
      where: { id: reportId },
      data: { status: 'RESOLVED' },
    })
    return Response.json({ success: true, message: 'Content deleted and report marked resolved' })
  }

  if (action === 'RESOLVE' || action === 'DISMISS') {
    await db.report.update({
      where: { id: reportId },
      data: { status: action === 'RESOLVE' ? 'RESOLVED' : 'RESOLVED' },
    })
    return Response.json({ success: true, message: `Report marked as ${action}` })
  }

  return apiError('Unknown action')
}
