import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized, apiError, notify, audit } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

const schema = z.object({
  type: z.enum(['PRODUCT', 'CROP', 'SERVICE', 'BUYER_REQ']),
  listingId: z.string(),
  recipientId: z.string(),
  message: z.string().min(1, 'Message is required'),
})

export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data, error } = await admin.from('enquiries')
      .select('*')
      .or(`sender_id.eq.${session.id},recipient_id.eq.${session.id}`)
      .order('created_at', { ascending: false })
      .limit(60)
    if (error) return apiError(error.message, 500)
    return Response.json({ enquiries: (data || []).map(snakeToCamel) })
  }

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

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { data: enquiry, error } = await admin.from('enquiries').insert({
      type: parsed.data.type, listing_id: parsed.data.listingId,
      sender_id: session.id, recipient_id: parsed.data.recipientId,
      message: parsed.data.message, status: 'OPEN',
    }).select().single()
    if (error) return apiError(error.message, 500)
    await notify(parsed.data.recipientId, 'ENQUIRY', 'New enquiry', parsed.data.message.slice(0, 80))
    await audit(session.id, 'ENQUIRY_SEND', enquiry.id, parsed.data.type)
    return Response.json({ enquiry: snakeToCamel(enquiry) })
  }

  const enquiry = await db.enquiry.create({
    data: { ...parsed.data, senderId: session.id, status: 'OPEN' },
  })
  await notify(parsed.data.recipientId, 'ENQUIRY', 'New enquiry', parsed.data.message.slice(0, 80))
  await audit(session.id, 'ENQUIRY_SEND', enquiry.id, parsed.data.type)
  return Response.json({ enquiry })
}
