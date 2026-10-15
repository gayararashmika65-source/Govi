import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { apiError, audit } from '@/lib/server-helpers'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  subject: z.string().min(3, 'Subject must be at least 3 characters'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
})

export async function POST(req: NextRequest) {
  let body
  try { body = await req.json() } catch { return apiError('Invalid request body') }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { name, email, subject, message } = parsed.data

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const { error } = await admin.from('contact_messages').insert({
      name, email: email.toLowerCase(), subject, message, status: 'NEW',
    })
    if (error) return apiError(error.message, 500)
    return Response.json({ ok: true })
  }

  await db.contactMessage.create({
    data: { name, email: email.toLowerCase(), subject, message, status: 'NEW' },
  })
  await audit(null, 'CONTACT_MESSAGE', undefined, `From ${email}: ${subject}`)
  return Response.json({ ok: true })
}
