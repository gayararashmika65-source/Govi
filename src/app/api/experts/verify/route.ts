import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { apiError, unauthorized, notify, audit } from '@/lib/server-helpers'

// Expert submits a verification document for admin review
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'EXPERT') return unauthorized()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const { documentPath, note } = body as { documentPath?: string; note?: string }
  if (!documentPath) return apiError('Document is required')

  const profile = await db.expertProfile.findUnique({ where: { userId: session.id } })
  if (!profile) return apiError('Profile not found')

  const verification = await db.expertVerification.create({
    data: { expertProfileId: profile.id, documentPath, note, status: 'PENDING' },
  })
  await notify(session.id, 'VERIFICATION', 'Verification submitted', 'Your verification document is under review by administrators.')
  await audit(session.id, 'VERIFICATION_SUBMIT', verification.id, 'Expert submitted verification document')
  return Response.json({ verification })
}
