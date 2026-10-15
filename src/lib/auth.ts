// GoviSahana auth — dependency-free, server-side, secure.
// Passwords hashed with scrypt. Sessions are HMAC-signed tokens in httpOnly cookies.
import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { db } from '@/lib/db'

export const SESSION_COOKIE = process.env.SESSION_COOKIE || 'gs_session'
const SECRET = process.env.AUTH_SECRET || 'dev-insecure-secret-change-me'

const ITERATIONS = 100000
const KEY_LEN = 64

export type Role = 'FARMER' | 'EXPERT' | 'ENTERPRISE' | 'WORKER' | 'BUYER' | 'ADMIN'

export const ROLES: Role[] = ['FARMER', 'EXPERT', 'ENTERPRISE', 'WORKER', 'BUYER', 'ADMIN']

export const ROLE_LABELS: Record<Role, string> = {
  FARMER: 'Farmer',
  EXPERT: 'Agricultural Expert',
  ENTERPRISE: 'Agricultural Enterprise',
  WORKER: 'Agricultural Worker',
  BUYER: 'Crop Buyer',
  ADMIN: 'Administrator',
}

// ----------------- Password hashing -----------------

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, KEY_LEN, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
  return `scrypt$${ITERATIONS}$${salt}$${hash.toString('hex')}`
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const parts = stored.split('$')
    if (parts.length !== 4 || parts[0] !== 'scrypt') return false
    const salt = parts[2]
    const expected = parts[3]
    const hash = crypto.scryptSync(password, salt, KEY_LEN, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 })
    return crypto.timingSafeEqual(Buffer.from(hash.toString('hex'), 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}

// ----------------- Session token (HMAC-signed JSON) -----------------

function sign(payload: string): string {
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function createSessionToken(userId: string): string {
  const payload = JSON.stringify({ uid: userId, iat: Date.now() })
  return Buffer.from(sign(payload)).toString('base64url')
}

export function verifyToken(token: string): { uid: string; iat: number } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const lastDot = decoded.lastIndexOf('.')
    const payload = decoded.slice(0, lastDot)
    const sig = decoded.slice(lastDot + 1)
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
    if (sig.length !== expected.length) return null
    if (!crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))) return null
    const data = JSON.parse(payload)
    return { uid: data.uid, iat: data.iat }
  } catch {
    return null
  }
}

// ----------------- Session helpers (server-side, for API routes / server components) -----------------

export type SessionUser = {
  id: string
  email: string
  name: string
  role: Role
  status: string
  avatarUrl: string | null
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  if (!token) return null
  const verified = verifyToken(token)
  if (!verified) return null
  const user = await db.user.findUnique({
    where: { id: verified.uid },
    select: { id: true, email: true, name: true, role: true, status: true, avatarUrl: true },
  })
  if (!user || user.status === 'SUSPENDED') return null
  return user as SessionUser
}

export async function requireUser(): Promise<SessionUser> {
  const s = await getSession()
  if (!s) throw new Error('UNAUTHORIZED')
  return s
}

export async function requireRole(...roles: Role[]): Promise<SessionUser> {
  const s = await requireUser()
  if (!roles.includes(s.role)) throw new Error('FORBIDDEN')
  return s
}

export async function requireAdmin(): Promise<SessionUser> {
  return requireRole('ADMIN')
}

export async function setSessionCookie(userId: string) {
  const store = await cookies()
  const token = createSessionToken(userId)
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(SESSION_COOKIE)
}
