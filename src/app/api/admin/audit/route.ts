import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { forbidden } from '@/lib/server-helpers'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return forbidden()
  const logs = await db.auditLog.findMany({
    include: { actor: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })
  return Response.json({ logs })
}
