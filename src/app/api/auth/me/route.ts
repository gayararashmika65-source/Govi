import { getSession, useSupabaseAuth } from '@/lib/auth'
import { db } from '@/lib/db'
import { getSupabaseAdmin } from '@/lib/supabase-server'

export async function GET() {
  const session = await getSession()
  if (!session) return Response.json({ user: null })

  if (useSupabaseAuth) {
    // Use the admin client to fetch the role-specific profile (RLS would block some cross-role reads).
    const admin = getSupabaseAdmin()
    if (!admin) return Response.json({ user: { ...session, profileComplete: false } })

    const [farmerP, expertP, enterpriseP, workerP, buyerP] = await Promise.all([
      admin.from('farmer_profiles').select('*').eq('user_id', session.id).maybeSingle(),
      admin.from('expert_profiles').select('id, verified, expertise, qualifications').eq('user_id', session.id).maybeSingle(),
      admin.from('enterprise_profiles').select('id, verified, business_name, business_type').eq('user_id', session.id).maybeSingle(),
      admin.from('worker_profiles').select('id, skills, district').eq('user_id', session.id).maybeSingle(),
      admin.from('buyer_profiles').select('id, buyer_type').eq('user_id', session.id).maybeSingle(),
    ])

    const profileComplete = isProfileCompleteSupabase(session.role, farmerP.data, expertP.data, enterpriseP.data, workerP.data, buyerP.data)
    return Response.json({ user: { ...session, profileComplete } })
  }

  // Prisma path
  const profileComplete = await isProfileCompletePrisma(session.id, session.role)
  return Response.json({ user: { ...session, profileComplete } })
}

async function isProfileCompletePrisma(userId: string, role: string): Promise<boolean> {
  switch (role) {
    case 'FARMER': { const p = await db.farmerProfile.findUnique({ where: { userId } }); return !!(p && p.district && p.crops) }
    case 'EXPERT': { const p = await db.expertProfile.findUnique({ where: { userId } }); return !!(p && p.expertise && p.qualifications) }
    case 'ENTERPRISE': { const p = await db.enterpriseProfile.findUnique({ where: { userId } }); return !!(p && p.businessName && p.businessType) }
    case 'WORKER': { const p = await db.workerProfile.findUnique({ where: { userId } }); return !!(p && p.skills && p.district) }
    case 'BUYER': { const p = await db.buyerProfile.findUnique({ where: { userId } }); return !!(p && p.buyerType) }
    default: return true
  }
}

function isProfileCompleteSupabase(role: string, farmer: any, expert: any, enterprise: any, worker: any, buyer: any): boolean {
  switch (role) {
    case 'FARMER': return !!(farmer?.district && farmer?.crops)
    case 'EXPERT': return !!(expert?.expertise && expert?.qualifications)
    case 'ENTERPRISE': return !!(enterprise?.business_name && enterprise?.business_type)
    case 'WORKER': return !!(worker?.skills && worker?.district)
    case 'BUYER': return !!(buyer?.buyer_type)
    default: return true
  }
}
