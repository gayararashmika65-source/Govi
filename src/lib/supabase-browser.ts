'use client'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabaseConfigured = Boolean(url && anon)

let client: SupabaseClient | null = null

/** Browser Supabase client (anon key). Used by client components for auth + RLS-scoped queries. */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!supabaseConfigured) return null
  if (!client) {
    client = createClient(url, anon, { auth: { persistSession: true, autoRefreshToken: true } })
  }
  return client
}
