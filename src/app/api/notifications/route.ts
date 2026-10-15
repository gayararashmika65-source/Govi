import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized } from '@/lib/server-helpers'

export async function GET(req: Request) {
  const session = await getSession()
  if (!session) return unauthorized()
  const { searchParams } = new URL(req.url)
  const unreadOnly = searchParams.get('unread') === 'true'
  const notifications = await db.notification.findMany({
    where: { userId: session.id, ...(unreadOnly ? { read: false } : {}) },
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  const unreadCount = await db.notification.count({ where: { userId: session.id, read: false } })
  return Response.json({ notifications, unreadCount })
}
