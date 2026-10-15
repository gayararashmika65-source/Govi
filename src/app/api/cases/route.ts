import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized, apiError, notify, audit } from '@/lib/server-helpers'
import { snakeToCamel, camelToSnake } from '@/lib/case-convert'

// GET cases. Farmers see their own; experts see open/assigned queue; admins see all.
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    let q = admin.from('agricultural_cases').select('*, farmer:profiles!agricultural_cases_farmer_id_fkey(id,name,avatar_url), expert:profiles!agricultural_cases_expert_id_fkey(id,name), case_attachments(*)')
    if (session.role === 'FARMER') q = q.eq('farmer_id', session.id)
    else if (session.role === 'EXPERT') {
      // Use the admin client to read cases the expert should see (RLS would otherwise restrict; admin bypasses for listing).
      q = q.or(`expert_id.eq.${session.id},status.in.(OPEN,UNDER_REVIEW)`)
    } else if (session.role !== 'ADMIN') return unauthorized()
    if (status) q = q.eq('status', status)
    q = q.order('created_at', { ascending: false }).limit(100)
    const { data, error } = await q
    if (error) return apiError(error.message, 500)
    return Response.json({ cases: (data || []).map(snakeToCamel) })
  }

  // Prisma path
  let where: Record<string, unknown> = {}
  if (session.role === 'FARMER') where = { farmerId: session.id }
  else if (session.role === 'EXPERT') {
    where = { OR: [{ expertId: session.id }, { status: { in: ['OPEN', 'UNDER_REVIEW'] } }] }
  } else if (session.role === 'ADMIN') {
    where = {}
  } else return unauthorized()
  if (status) where = { ...where, status }

  const cases = await db.agriculturalCase.findMany({
    where,
    include: {
      farmer: { select: { id: true, name: true, avatarUrl: true } },
      expert: { select: { id: true, name: true } },
      attachments: true,
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return Response.json({ cases })
}

const createSchema = z.object({
  crop: z.string().min(1, 'Select a crop'),
  category: z.string().min(1, 'Select a problem category'),
  title: z.string().min(5, 'Title must be at least 5 characters'),
  description: z.string().min(10, 'Describe the problem in more detail'),
  district: z.string().optional(),
  expertId: z.string().optional(),
  attachments: z.array(z.string()).optional(),
})

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'FARMER') return unauthorized()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid')

  const { crop, category, title, description, district, expertId, attachments } = parsed.data

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const status = expertId ? 'ASSIGNED' : 'OPEN'
    const { data: newCase, error } = await admin.from('agricultural_cases').insert({
      farmer_id: session.id, expert_id: expertId || null,
      crop, category, title, description, district, status,
    }).select().single()
    if (error) return apiError(error.message, 500)

    if (attachments?.length) {
      await admin.from('case_attachments').insert(
        attachments.map((p) => ({ case_id: newCase.id, file_path: p }))
      )
    }

    // Notify the assigned expert or matching verified experts
    if (expertId) {
      await admin.rpc('notify_user', {
        p_user_id: expertId, p_type: 'CASE', p_title: 'New case assigned to you',
        p_body: `"${title}" — review and respond.`, p_link: 'expert-cases',
      })
    } else {
      const { data: experts } = await admin.from('expert_profiles')
        .select('user_id').eq('verified', true).eq('available', true)
        .like('crops', `%${crop}%`).limit(20)
      for (const e of experts || []) {
        await admin.rpc('notify_user', {
          p_user_id: e.user_id, p_type: 'CASE', p_title: 'New agricultural case',
          p_body: `A farmer reported a ${category.toLowerCase()} issue with ${crop}.`, p_link: 'expert-cases',
        })
      }
    }
    await admin.rpc('write_audit_log', {
      p_actor_id: session.id, p_action: 'CASE_CREATE', p_target: newCase.id, p_detail: `Created case: ${title}`,
    })
    return Response.json({ case: snakeToCamel(newCase) })
  }

  // Prisma path
  const agriCase = await db.agriculturalCase.create({
    data: {
      farmerId: session.id, expertId: expertId || null,
      crop, category, title, description, district,
      status: expertId ? 'ASSIGNED' : 'OPEN',
      attachments: attachments?.length ? { create: attachments.map((p) => ({ filePath: p })) } : undefined,
    },
    include: { attachments: true },
  })
  if (expertId) {
    await notify(expertId, 'CASE', 'New case assigned to you', `“${title}” — review and respond.`)
  } else {
    const experts = await db.expertProfile.findMany({ where: { verified: true, available: true, crops: { contains: crop } }, take: 20 })
    for (const e of experts) await notify(e.userId, 'CASE', 'New agricultural case', `A farmer reported a ${category.toLowerCase()} issue with ${crop}.`)
  }
  await audit(session.id, 'CASE_CREATE', agriCase.id, `Created case: ${title}`)
  return Response.json({ case: agriCase })
}

void db
void camelToSnake
