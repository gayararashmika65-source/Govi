import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, audit, notify } from '@/lib/server-helpers'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params
  const agriCase = await db.agriculturalCase.findUnique({
    where: { id },
    include: {
      farmer: { select: { id: true, name: true, phone: true, avatarUrl: true } },
      expert: { select: { id: true, name: true } },
      attachments: true,
      consultations: {
        include: {
          messages: { include: { sender: { select: { id: true, name: true } } }, orderBy: { createdAt: 'asc' } },
          recommendations: { include: { expert: { select: { id: true, name: true } } } },
        },
      },
      recommendations: { include: { expert: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
    },
  })
  if (!agriCase) return Response.json({ error: 'Not found' }, { status: 404 })
  // Authorization: farmer owner, assigned expert, or admin
  const allowed =
    agriCase.farmerId === session.id ||
    agriCase.expertId === session.id ||
    session.role === 'ADMIN'
  if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })
  return Response.json({ case: agriCase })
}

// PATCH: update case status
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const { status, expertId } = body as { status?: string; expertId?: string | null }

  const existing = await db.agriculturalCase.findUnique({ where: { id } })
  if (!existing) return apiError('Case not found', 404)

  const allowed =
    existing.farmerId === session.id ||
    existing.expertId === session.id ||
    session.role === 'ADMIN'
  if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 })

  const updated = await db.agriculturalCase.update({
    where: { id },
    data: {
      ...(status ? { status } : {}),
      ...(expertId !== undefined ? { expertId } : {}),
    },
  })

  if (status === 'RESOLVED') {
    await notify(existing.farmerId, 'CASE', 'Case resolved', `Your case “${existing.title}” has been marked resolved.`)
    if (existing.expertId && existing.expertId !== session.id) {
      await notify(existing.expertId, 'CASE', 'Case resolved', `Case “${existing.title}” was marked resolved.`)
    }
  }
  await audit(session.id, 'CASE_UPDATE', id, `status=${status ?? 'unchanged'}`)
  return Response.json({ case: updated })
}
