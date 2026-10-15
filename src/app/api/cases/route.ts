import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, apiError, notify, audit } from '@/lib/server-helpers'

// GET cases. Farmers see their own; experts see open/assigned queue; admins see all.
export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')

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

  const agriCase = await db.agriculturalCase.create({
    data: {
      farmerId: session.id,
      expertId: expertId || null,
      crop, category, title, description, district,
      status: expertId ? 'ASSIGNED' : 'OPEN',
      attachments: attachments?.length
        ? { create: attachments.map((p) => ({ filePath: p })) }
        : undefined,
    },
    include: { attachments: true },
  })

  // Notify the assigned expert (if any) or relevant verified experts in same crop/area
  if (expertId) {
    await notify(expertId, 'CASE', 'New case assigned to you', `“${title}” — review and respond.`)
  } else {
    // Notify verified experts who handle this crop
    const experts = await db.expertProfile.findMany({
      where: { verified: true, available: true, crops: { contains: crop } },
      take: 20,
    })
    for (const e of experts) {
      await notify(e.userId, 'CASE', 'New agricultural case', `A farmer reported a ${category.toLowerCase()} issue with ${crop}.`)
    }
  }
  await audit(session.id, 'CASE_CREATE', agriCase.id, `Created case: ${title}`)
  return Response.json({ case: agriCase })
}
