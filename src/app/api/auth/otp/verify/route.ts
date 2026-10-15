import { NextRequest } from 'next/server'
import { z } from 'zod'
import { verifyOtp } from '@/lib/otp'
import { apiError, audit } from '@/lib/server-helpers'
import { db } from '@/lib/db'
import { setSessionCookie, useSupabaseAuth, type Role } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
  purpose: z.enum(['login', 'register']).default('login'),
  name: z.string().min(2, 'Name must be at least 2 characters').optional(),
  role: z.enum(['FARMER', 'EXPERT', 'ENTERPRISE', 'WORKER', 'BUYER'] as [Role, ...Role[]]).optional(),
  phone: z.string().optional(),
})

export async function POST(req: NextRequest) {
  let body
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid request body')
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return apiError(parsed.error.issues[0]?.message || 'Invalid input')
  }

  const { email, code, purpose, name, role, phone } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()

  // 1. Verify the OTP code
  const result = verifyOtp(normalizedEmail, code, purpose)
  if (!result.valid) {
    return apiError(result.error || 'Invalid verification code', 400)
  }

  // 2. Handle LOGIN
  if (purpose === 'login') {
    if (useSupabaseAuth) {
      const admin = getSupabaseAdmin()
      if (!admin) return apiError('Supabase not configured', 500)

      const { data: profile } = await admin
        .from('profiles')
        .select('*')
        .eq('email', normalizedEmail)
        .maybeSingle()

      if (!profile) {
        return apiError('No account found for this email. Please register first.', 404)
      }
      if (profile.status === 'SUSPENDED') {
        return apiError('Your account has been suspended. Please contact support.', 403)
      }

      await setSessionCookie(profile.id)
      await audit(profile.id, 'USER_LOGIN_OTP', profile.id, 'Logged in via email OTP')

      return Response.json({
        user: {
          id: profile.id,
          email: profile.email,
          name: profile.name,
          role: profile.role,
          status: profile.status,
          avatarUrl: profile.avatar_url,
        },
      })
    } else {
      const user = await db.user.findUnique({ where: { email: normalizedEmail } })
      if (!user) {
        return apiError('No account found for this email. Please register first.', 404)
      }
      if (user.status === 'SUSPENDED') {
        return apiError('Your account has been suspended. Please contact support.', 403)
      }

      await setSessionCookie(user.id)
      await audit(user.id, 'USER_LOGIN_OTP', user.id, 'Logged in via email OTP')

      return Response.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          avatarUrl: user.avatarUrl,
        },
      })
    }
  }

  // 3. Handle REGISTER
  if (purpose === 'register') {
    if (!name || !role) {
      return apiError('Name and role are required to complete registration.', 400)
    }

    if (useSupabaseAuth) {
      const admin = getSupabaseAdmin()
      if (!admin) return apiError('Supabase not configured', 500)

      // Check if user already exists
      const { data: existing } = await admin.from('profiles').select('id').eq('email', normalizedEmail).maybeSingle()
      if (existing) {
        return apiError('An account with this email already exists. Please sign in.', 409)
      }

      // Create user via admin API with email confirmed
      const randomPassword = 'Otp_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email: normalizedEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { role, name, phone },
      })

      if (authErr || !authData.user) {
        return apiError(authErr?.message || 'Failed to create user account', 400)
      }

      await setSessionCookie(authData.user.id)
      await audit(authData.user.id, 'USER_REGISTER_OTP', authData.user.id, `Registered as ${role} via email OTP`)

      // Fetch the created profile
      const { data: profile } = await admin.from('profiles').select('*').eq('id', authData.user.id).single()

      return Response.json({
        user: {
          id: profile?.id || authData.user.id,
          email: profile?.email || normalizedEmail,
          name: profile?.name || name,
          role: profile?.role || role,
          status: profile?.status || 'ACTIVE',
          avatarUrl: profile?.avatar_url || null,
        },
      })
    } else {
      const existing = await db.user.findUnique({ where: { email: normalizedEmail } })
      if (existing) {
        return apiError('An account with this email already exists. Please sign in.', 409)
      }

      const randomPasswordHash = 'otp_verified_' + Date.now()
      const user = await db.user.create({
        data: {
          email: normalizedEmail,
          name,
          passwordHash: randomPasswordHash,
          role,
          phone,
          status: 'ACTIVE',
        },
      })

      if (role === 'FARMER') await db.farmerProfile.create({ data: { userId: user.id } })
      if (role === 'EXPERT') await db.expertProfile.create({ data: { userId: user.id } })
      if (role === 'ENTERPRISE') await db.enterpriseProfile.create({ data: { userId: user.id, businessName: name } })
      if (role === 'WORKER') await db.workerProfile.create({ data: { userId: user.id } })
      if (role === 'BUYER') await db.buyerProfile.create({ data: { userId: user.id } })

      await setSessionCookie(user.id)
      await audit(user.id, 'USER_REGISTER_OTP', user.id, `Registered as ${role} via email OTP`)

      return Response.json({
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
          avatarUrl: user.avatarUrl,
        },
      })
    }
  }

  return apiError('Invalid purpose', 400)
}
