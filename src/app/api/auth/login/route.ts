import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { verifyPassword, setSessionCookie, useSupabaseAuth, setSupabaseTokenCookie } from '@/lib/auth'
import { getSupabase, getSupabaseAdmin } from '@/lib/supabase-server'
import { audit, apiError } from '@/lib/server-helpers'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
})

export async function POST(req: NextRequest) {
  let body
  try { body = await req.json() } catch { return apiError('Invalid request body') }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { email, password } = parsed.data

  // ----- SUPABASE PATH -----
  if (useSupabaseAuth) {
    const sb = getSupabase()
    if (!sb) return apiError('Supabase not configured', 500)
    const { data, error } = await sb.auth.signInWithPassword({ email: email.toLowerCase(), password })
    if (error || !data.session) return apiError('Invalid email or password', 401)
    await setSupabaseTokenCookie(data.session.access_token)

    // Fetch the profile row to check status (RLS reads role from profiles).
    const admin = getSupabaseAdmin()
    const { data: profile } = await admin!.from('profiles').select('*').eq('id', data.user.id).single()
    if (!profile || profile.status === 'SUSPENDED') {
      return apiError('Your account has been suspended. Please contact support.', 403)
    }
    await audit(profile.id, 'USER_LOGIN', profile.id, 'Supabase login')
    return Response.json({
      user: {
        id: profile.id, email: profile.email, name: profile.name,
        role: profile.role, status: profile.status, avatarUrl: profile.avatar_url,
      },
    })
  }

  // ----- PRISMA PATH (fallback) -----
  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user || !verifyPassword(password, user.passwordHash)) return apiError('Invalid email or password', 401)
  if (user.status === 'SUSPENDED') return apiError('Your account has been suspended. Please contact support.', 403)
  await setSessionCookie(user.id)
  await audit(user.id, 'USER_LOGIN', user.id)
  return Response.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, avatarUrl: user.avatarUrl },
  })
}
