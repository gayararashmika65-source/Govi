import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword, setSessionCookie, ROLES, type Role } from '@/lib/auth'
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
  try {
    body = await req.json()
  } catch {
    return apiError('Invalid request body')
  }
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: parsed.error.issues[0]?.message ?? 'Invalid input' }, { status: 400 })
  }
  const { name, email, password, role, phone } = parsed.data

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) return apiError('An account with this email already exists', 409)

  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      name,
      passwordHash: hashPassword(password),
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
  await audit(user.id, 'USER_REGISTER', user.id, `Registered as ${role}`)

  return Response.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role, status: user.status, avatarUrl: user.avatarUrl },
  })
}

void ROLES
