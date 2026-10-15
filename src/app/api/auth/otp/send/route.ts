import { NextRequest } from 'next/server'
import { z } from 'zod'
import { generateOtpCode, saveOtp } from '@/lib/otp'
import { sendOtpEmail } from '@/lib/email'
import { apiError } from '@/lib/server-helpers'
import { db } from '@/lib/db'
import { useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  purpose: z.enum(['login', 'register', 'reset']).default('login'),
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

  const { email, purpose } = parsed.data
  const normalizedEmail = email.toLowerCase().trim()

  // If purpose is login, ensure the account actually exists
  if (purpose === 'login') {
    if (useSupabaseAuth) {
      const admin = getSupabaseAdmin()
      if (admin) {
        const { data: profile } = await admin.from('profiles').select('id, status').eq('email', normalizedEmail).maybeSingle()
        if (!profile) {
          return apiError('No account found with this email. Please register first.', 404)
        }
        if (profile.status === 'SUSPENDED') {
          return apiError('Your account has been suspended. Please contact support.', 403)
        }
      }
    } else {
      const user = await db.user.findUnique({ where: { email: normalizedEmail } })
      if (!user) {
        return apiError('No account found with this email. Please register first.', 404)
      }
      if (user.status === 'SUSPENDED') {
        return apiError('Your account has been suspended. Please contact support.', 403)
      }
    }
  }

  // If purpose is reset, ensure the account exists
  if (purpose === 'reset') {
    if (useSupabaseAuth) {
      const admin = getSupabaseAdmin()
      if (admin) {
        const { data: profile } = await admin.from('profiles').select('id, status').eq('email', normalizedEmail).maybeSingle()
        if (!profile) {
          return apiError('No account found with this email address.', 404)
        }
        if (profile.status === 'SUSPENDED') {
          return apiError('Your account has been suspended. Please contact support.', 403)
        }
      }
    } else {
      const user = await db.user.findUnique({ where: { email: normalizedEmail } })
      if (!user) {
        return apiError('No account found with this email address.', 404)
      }
      if (user.status === 'SUSPENDED') {
        return apiError('Your account has been suspended. Please contact support.', 403)
      }
    }
  }

  // If purpose is register, ensure the account does not already exist
  if (purpose === 'register') {
    if (useSupabaseAuth) {
      const admin = getSupabaseAdmin()
      if (admin) {
        const { data: profile } = await admin.from('profiles').select('id').eq('email', normalizedEmail).maybeSingle()
        if (profile) {
          return apiError('An account with this email already exists. Please log in instead.', 409)
        }
      }
    } else {
      const user = await db.user.findUnique({ where: { email: normalizedEmail } })
      if (user) {
        return apiError('An account with this email already exists. Please log in instead.', 409)
      }
    }
  }

  // Generate 6-digit code and save
  const code = generateOtpCode()
  saveOtp(normalizedEmail, code, purpose)

  try {
    const res = await sendOtpEmail({
      to: normalizedEmail,
      code,
      purpose,
    })

    return Response.json({
      success: true,
      message: `Verification code sent to ${normalizedEmail}`,
      simulated: res.simulated,
      code: res.simulated ? code : undefined,
    })
  } catch (err) {
    return apiError('Failed to send verification email. Please try again: ' + (err as Error).message, 500)
  }
}
