// Helper to pick the right data backend for a request.
// Returns { mode: 'supabase', admin, userClient } or { mode: 'prisma', db }.
import { getSession, type SessionUser } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { supabaseConfigured } from '@/lib/supabase-server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { db } from '@/lib/db'

export type BackendCtx =
  | { mode: 'supabase'; admin: SupabaseClient; user: SessionUser }
  | { mode: 'prisma'; user: SessionUser }

/** Resolve the backend for the current request. Requires an authenticated user. */
export async function getBackend(): Promise<BackendCtx> {
  const user = await getSession()
  if (!user) throw new Error('UNAUTHORIZED')
  if (supabaseConfigured) {
    const admin = getSupabaseAdmin()
    if (admin) return { mode: 'supabase', admin, user }
  }
  return { mode: 'prisma', user }
}

export { db }
