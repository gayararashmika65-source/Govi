import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const district = searchParams.get('district')?.trim()
  const crop = searchParams.get('crop')?.trim()
  const verifiedOnly = searchParams.get('verified') !== 'false'

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return Response.json({ experts: [] })
    let query = admin.from('expert_profiles').select(`
      *, user:profiles!expert_profiles_user_id_fkey(id, name, avatar_url)
    `)
    if (verifiedOnly) query = query.eq('verified', true)
    if (q) query = query.or(`title.ilike.%${q}%,expertise.ilike.%${q}%,bio.ilike.%${q}%`)
    if (district) query = query.ilike('service_areas', `%${district}%`)
    if (crop) query = query.ilike('crops', `%${crop}%`)
    query = query.order('rating', { ascending: false }).limit(60)
    const { data, error } = await query
    if (error) return Response.json({ experts: [] })
    return Response.json({ experts: (data || []).map(snakeToCamel) })
  }

  const experts = await db.expertProfile.findMany({
    where: {
      AND: [
        verifiedOnly ? { verified: true } : {},
        q ? { OR: [{ user: { name: { contains: q } } }, { expertise: { contains: q } }, { title: { contains: q } }, { bio: { contains: q } }] } : {},
        district ? { serviceAreas: { contains: district } } : {},
        crop ? { crops: { contains: crop } } : {},
      ],
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { rating: 'desc' },
    take: 60,
  })
  return Response.json({ experts })
}
