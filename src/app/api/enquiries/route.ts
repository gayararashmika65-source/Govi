import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, notify, audit } from '@/lib/server-helpers'

const schema = z.object({
  type: z.enum(['PRODUCT', 'CROP', 'SERVICE', 'BUYER_REQ']),
  listingId: z.string(),
  recipientId: z.string(),
  message: z.string().min(1, 'Message is required'),
})

export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()
  const enquiries = await db.enquiry.findMany({
    where: { OR: [{ senderId: session.id }, { recipientId: session.id }] },
    orderBy: { createdAt: 'desc' },
    take: 60,
  })
  return Response.json({ enquiries })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid')
  const enquiry = await db.enquiry.create({
    data: { ...parsed.data, senderId: session.id, status: 'OPEN' },
  })
  await notify(parsed.data.recipientId, 'ENQUIRY', 'New enquiry', parsed.data.message.slice(0, 80))
  await audit(session.id, 'ENQUIRY_SEND', enquiry.id, parsed.data.type)
  return Response.json({ enquiry })
}
