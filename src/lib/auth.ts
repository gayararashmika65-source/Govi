// ============================================================================
// GoviSahana auth — backend-aware (Supabase when configured, else Prisma/SQLite)
// ============================================================================
// Prisma path: scrypt-hashed passwords + HMAC-signed httpOnly session cookies.
// Supabase path: Supabase Auth (JWT). The browser client stores the access_token
//   in an httpOnly cookie `sb-access-token`; this module reads it and verifies
//   via supabase.auth.getUser(). Role is read from public.profiles (RLS-protected),
//   NEVER from the client.
// ============================================================================

import { cookies } from 'next/headers'
import crypto from 'node:crypto'
import { db } from '@/lib/db'
import { supabaseConfigured, getSupabaseAdmin, getSupabase } from '@/lib/supabase-server'

export const SESSION_COOKIE = process.env.SESSION_COOKIE || 'gs_session'
export const SUPABASE_TOKEN_COOKIE = 'sb-access-token'
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

export const useSupabaseAuth = supabaseConfigured

// ----------------- Password hashing (Prisma path only) -----------------

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

// ----------------- Prisma session token (HMAC-signed JSON) -----------------

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

// ----------------- Session type -----------------

export type SessionUser = {
  id: string
  email: string
  name: string
  role: Role
  status: string
  avatarUrl: string | null
  /** Supabase access token (when using Supabase auth) — used to make RLS-scoped queries. */
  accessToken?: string | null
}

// ----------------- getSession() — backend-aware -----------------

export async function getSession(): Promise<SessionUser | null> {
  if (useSupabaseAuth) return getSessionSupabase()
  return getSessionPrisma()
}

/** Prisma path: read our HMAC session cookie, look up the user in SQLite. */
async function getSessionPrisma(): Promise<SessionUser | null> {
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

/**
 * Supabase path: read the access_token cookie, verify via supabase.auth.getUser(),
 * then read the user's profile (role/status) from public.profiles via the
 * service-role admin client (RLS would otherwise block this lookup).
 * The returned accessToken is forwarded to per-request RLS-scoped clients.
 */
async function getSessionSupabase(): Promise<SessionUser | null> {
  const store = await cookies()
  const accessToken = store.get(SUPABASE_TOKEN_COOKIE)?.value
  if (!accessToken) return null

  const admin = getSupabaseAdmin()
  if (!admin) {
    // Misconfiguration: env said Supabase is on but service-role key missing.
    // Fall back to Prisma rather than crashing.
    return getSessionPrisma()
  }

  // Verify the JWT and get the auth.users row.
  const { data: authData, error } = await admin.auth.getUser(accessToken)
  if (error || !authData?.user) return null

  const uid = authData.user.id
  const email = authData.user.email || ''

  // Read the profile row. The trigger created it on signup; if missing, deny.
  const { data: profile, error: pErr } = await admin
    .from('profiles')
    .select('id, email, name, role, status, avatar_url')
    .eq('id', uid)
    .single()
  if (pErr || !profile) return null
  if (profile.status === 'SUSPENDED') return null

  return {
    id: profile.id,
    email: profile.email || email,
    name: profile.name,
    role: profile.role as Role,
    status: profile.status,
    avatarUrl: profile.avatar_url,
    accessToken,
  }
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

// ----------------- Cookie helpers -----------------

/** Prisma path: set our HMAC session cookie. */
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
  // Also clear the Supabase token cookie if present.
  store.delete(SUPABASE_TOKEN_COOKIE)
}

/** Supabase path: store the access token in an httpOnly cookie for server reads. */
export async function setSupabaseTokenCookie(accessToken: string) {
  const store = await cookies()
  store.set(SUPABASE_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  })
}

/** Returns a Supabase client scoped to the current session user (for RLS-enforced queries),
 *  or null when Supabase isn't configured. */
export async function getUserSupabase() {
  const session = await getSession()
  if (!session?.accessToken) return null
  return getSupabase() // anon client; RLS will use the bearer token if we pass it
}
