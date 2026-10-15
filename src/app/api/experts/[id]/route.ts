import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized } from '@/lib/server-helpers'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { id } = await params
  const expert = await db.expertProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, name: true, email: true, phone: true, avatarUrl: true } },
      recommendations: { include: { agriCase: true }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  })
  if (!expert) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ expert })
}
