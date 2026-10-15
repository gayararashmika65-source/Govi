import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { forbidden } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return forbidden()
  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return Response.json({ users: [] })
    let q = admin.from('profiles').select(`
      id, email, name, role, status, phone, created_at,
      farmer_profile:farmer_profiles!farmer_profiles_user_id_fkey(*),
      expert_profile:expert_profiles!expert_profiles_user_id_fkey(*),
      enterprise_profile:enterprise_profiles!enterprise_profiles_user_id_fkey(*),
      worker_profile:worker_profiles!worker_profiles_user_id_fkey(*),
      buyer_profile:buyer_profiles!buyer_profiles_user_id_fkey(*)
    `)
    if (role) q = q.eq('role', role)
    q = q.order('created_at', { ascending: false }).limit(200)
    const { data, error } = await q
    if (error) return Response.json({ users: [] })
    // Reshape: camelCase keys + collapse profile lookups (Supabase may return either a single
    // object — when the FK column on the related table is unique — or an array).
    const users = (data || []).map((row: Record<string, unknown>) => {
      const camel = snakeToCamel(row) as Record<string, unknown>
      const pickFirst = (key: string) => {
        const v = camel[key]
        if (Array.isArray(v)) return v.length ? v[0] : null
        return v ?? null
      }
      return {
        ...camel,
        farmerProfile: pickFirst('farmerProfile'),
        expertProfile: pickFirst('expertProfile'),
        enterpriseProfile: pickFirst('enterpriseProfile'),
        workerProfile: pickFirst('workerProfile'),
        buyerProfile: pickFirst('buyerProfile'),
      }
    })
    return Response.json({ users })
  }

  const users = await db.user.findMany({
    where: role ? { role } : {},
    select: {
      id: true, email: true, name: true, role: true, status: true, phone: true, createdAt: true,
      farmerProfile: true, expertProfile: true, enterpriseProfile: true, workerProfile: true, buyerProfile: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 200,
  })
  return Response.json({ users })
}
