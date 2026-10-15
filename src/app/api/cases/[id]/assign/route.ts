import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, audit, notify } from '@/lib/server-helpers'

// Expert takes / accepts an open case
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'EXPERT') return unauthorized()
  const { id } = await params
  const agriCase = await db.agriculturalCase.findUnique({ where: { id } })
  if (!agriCase) return apiError('Case not found', 404)

  let body: { message?: string } = {}
  try { body = await req.json() } catch { /* ignore */ }

  const updated = await db.agriculturalCase.update({
    where: { id },
    data: { expertId: session.id, status: 'UNDER_REVIEW' },
  })
  await notify(agriCase.farmerId, 'CASE', 'Expert reviewing your case', `An expert is now reviewing “${agriCase.title}”.`)
  await audit(session.id, 'CASE_ASSIGN', id, 'Expert accepted case')
  return Response.json({ case: updated })
}
