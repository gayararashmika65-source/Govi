import { getSession } from '@/lib/auth'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ user: null })

  // Include profile completion info
  const profileComplete = await isProfileComplete(session.id, session.role)

  return Response.json({ user: { ...session, profileComplete } })
}

async function isProfileComplete(userId: string, role: string): Promise<boolean> {
  switch (role) {
    case 'FARMER': {
      const p = await db.farmerProfile.findUnique({ where: { userId } })
      return !!(p && p.district && p.crops)
    }
    case 'EXPERT': {
      const p = await db.expertProfile.findUnique({ where: { userId } })
      return !!(p && p.expertise && p.qualifications)
    }
    case 'ENTERPRISE': {
      const p = await db.enterpriseProfile.findUnique({ where: { userId } })
      return !!(p && p.businessName && p.businessType)
    }
    case 'WORKER': {
      const p = await db.workerProfile.findUnique({ where: { userId } })
      return !!(p && p.skills && p.district)
    }
    case 'BUYER': {
      const p = await db.buyerProfile.findUnique({ where: { userId } })
      return !!(p && p.buyerType)
    }
    default:
      return true
  }
}
