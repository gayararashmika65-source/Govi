import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword, setSessionCookie, useSupabaseAuth, setSupabaseTokenCookie, type Role } from '@/lib/auth'
import { getSupabase } from '@/lib/supabase-server'
import { audit, apiError } from '@/lib/server-helpers'

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['FARMER', 'EXPERT', 'ENTERPRISE', 'WORKER', 'BUYER'] as [Role, ...Role[]]),
  phone: z.string().optional(),
})

export async function POST(req: NextRequest) {
  let body
  try { body = await req.json() } catch { return apiError('Invalid request body') }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { name, email, password, role, phone } = parsed.data

  // ----- SUPABASE PATH -----
  if (useSupabaseAuth) {
    const admin = (await import('@/lib/supabase-server')).getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)

    // Check if user already exists
    const { data: existing } = await admin.from('profiles').select('id').eq('email', email.toLowerCase()).maybeSingle()
    if (existing) {
      return apiError('An account with this email already exists', 409)
    }

    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: email.toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { role, name, phone },
    })

    if (authError || !authData.user) {
      return apiError(authError?.message || 'Failed to create user account', 400)
    }

    await setSessionCookie(authData.user.id)
    await audit(authData.user.id, 'USER_REGISTER', authData.user.id, `Registered as ${role} (Supabase)`)

    // Fetch the profile (created by the trigger)
    const { data: profile } = await admin.from('profiles').select('*').eq('id', authData.user.id).single()

    return Response.json({
      user: {
        id: profile?.id || authData.user.id,
        email: profile?.email || email.toLowerCase(),
        name: profile?.name || name,
        role: profile?.role || role,
        status: profile?.status || 'ACTIVE',
        avatarUrl: profile?.avatar_url || null,
      },
    })
  }

  // ----- PRISMA PATH (fallback) -----
  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) return apiError('An account with this email already exists', 409)

  const user = await db.user.create({
    data: { email: email.toLowerCase(), name, passwordHash: hashPassword(password), role, phone, status: 'ACTIVE' },
  })
  if (role === 'FARMER') await db.farmerProfile.create({ data: { userId: user.id } })
  if (role === 'EXPERT') await db.expertProfile.create({ data: { userId: user.id } })
  if (role === 'ENTERPRISE') await db.enterpriseProfile.create({ data: { userId: user.id, businessName: name } })
  if (role === 'WORKER') await db.workerProfile.create({ data: { userId: user.id } })
  if (role === 'BUYER') await db.buyerProfile.create({ data: { userId: user.id } })

  await setSessionCookie(user.id)
  await audit(user.id, 'USER_REGISTER', user.id, `Registered as ${role}`)
  return Response.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, avatarUrl: user.avatarUrl },
  })
}
