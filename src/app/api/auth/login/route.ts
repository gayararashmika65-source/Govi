import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { verifyPassword, setSessionCookie } from '@/lib/auth'
import { audit, apiError } from '@/lib/server-helpers'

const schema = z.object({
  email: z.string().email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
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
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { email, password } = parsed.data

  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return apiError('Invalid email or password', 401)
  }
  if (user.status === 'SUSPENDED') {
    return apiError('Your account has been suspended. Please contact support.', 403)
  }

  await setSessionCookie(user.id)
  await audit(user.id, 'USER_LOGIN', user.id)

  return Response.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, avatarUrl: user.avatarUrl },
  })
}
