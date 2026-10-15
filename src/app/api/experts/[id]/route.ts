import { db } from '@/lib/db'

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
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
