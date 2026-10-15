// ============================================================================
// Backend selector — routes data operations to Supabase (when configured) or
// falls back to the working Prisma/SQLite backend. Keeps both paths alive so
// the app works locally AND against a real Supabase project.
// ============================================================================

import { supabaseConfigured } from '@/lib/supabase-server'
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import type { SupabaseClient } from '@supabase/supabase-js'

export const useSupabase = supabaseConfigured
export { db } // re-export prisma for the fallback path

/** Helper: convert Prisma's include-shape into a Supabase select-shape. */
export function includeToSelect(include?: Record<string, unknown>): Record<string, boolean> | undefined {
  if (!include) return undefined
  const out: Record<string, boolean | Record<string, boolean>> = {}
  for (const [k, v] of Object.entries(include)) {
    out[k] = (v && typeof v === 'object' && 'select' in (v as Record<string, unknown>)) ? !!(v as Record<string, unknown>).select : true
  }
  return out as Record<string, boolean>
}

/** Map a Prisma orderBy clause to Supabase order format. */
export function toSupabaseOrder(orderBy?: Prisma.SortOrder | Record<string, 'asc' | 'desc'>): string | undefined {
  if (!orderBy) return undefined
  if (typeof orderBy === 'string') return orderBy
  const [[col, dir]] = Object.entries(orderBy)
  return `${col}:${dir === 'desc' ? 'desc' : 'asc'}`
}

/** Server client for the current request (RLS-scoped via the user's JWT). */
export function forUser(sb: SupabaseClient | null) {
  return sb
}
