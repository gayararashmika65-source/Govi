import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized, forbidden } from '@/lib/server-helpers'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return forbidden()
  const { searchParams } = new URL(req.url)
  const role = searchParams.get('role')
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
