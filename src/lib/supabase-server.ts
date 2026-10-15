// Supabase client initialization.
// Reads env vars; exports null when not configured so callers can fall back to Prisma.
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
export const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/** True when Supabase env vars are present. Routes use this to switch backends. */
export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

/**
 * Browser/anon client — uses the public anon key. Safe to use in client code.
 * Returns null when Supabase is not configured (callers fall back to Prisma).
 */
let anonClient: SupabaseClient | null = null
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null
  if (!anonClient) {
    anonClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return anonClient
}

/**
 * Server-only admin client using the service_role key — bypasses RLS.
 * ONLY import this in server code (API route handlers, server components).
 * NEVER expose this in client bundles.
 * Returns null when not configured.
 */
let adminClient: SupabaseClient | null = null
export function getSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceRoleKey) return null
  if (!adminClient) {
    adminClient = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return adminClient
}

/**
 * Server client scoped to the current request's user (via their JWT).
 * Used by API routes to make RLS-enforced queries on behalf of a user.
 * Falls back to null if Supabase is not configured.
 */
export function getSupabaseForUser(accessToken: string | null): SupabaseClient | null {
  if (!supabaseConfigured || !accessToken) return null
  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  })
}
