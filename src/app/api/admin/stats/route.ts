import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { apiError, forbidden } from '@/lib/server-helpers'

async function count(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, table: string, filter?: string): Promise<number> {
  let q = admin.from(table).select('*', { count: 'exact', head: true })
  if (filter) {
    const [col, val] = filter.split('=')
    q = q.eq(col, val)
  }
  const { count: c, error } = await q
  if (error) return 0
  return c ?? 0
}

async function countOr(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, table: string, orExpr: string): Promise<number> {
  const { count: c, error } = await admin.from(table).select('*', { count: 'exact', head: true }).or(orExpr)
  if (error) return 0
  return c ?? 0
}

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return forbidden()

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const [
      totalUsers, farmers, experts, enterprises, workers, buyers,
      totalCases, openCases, resolvedCases,
      totalProducts, totalCrops, totalJobs, totalArticles,
      pendingExpertVerifs, verifiedExperts, verifiedEnterprises,
    ] = await Promise.all([
      count(admin, 'profiles'),
      count(admin, 'profiles', 'role=FARMER'),
      count(admin, 'profiles', 'role=EXPERT'),
      count(admin, 'profiles', 'role=ENTERPRISE'),
      count(admin, 'profiles', 'role=WORKER'),
      count(admin, 'profiles', 'role=BUYER'),
      count(admin, 'agricultural_cases'),
      countOr(admin, 'agricultural_cases', 'status.eq.OPEN,status.eq.UNDER_REVIEW'),
      count(admin, 'agricultural_cases', 'status=RESOLVED'),
      count(admin, 'product_listings'),
      count(admin, 'crop_listings'),
      count(admin, 'job_listings'),
      count(admin, 'knowledge_articles'),
      count(admin, 'expert_verifications', 'status=PENDING'),
      count(admin, 'expert_profiles', 'verified=true'),
      count(admin, 'enterprise_profiles', 'verified=true'),
    ])

    return Response.json({
      stats: {
        totalUsers, farmers, experts, enterprises, workers, buyers,
        totalCases, openCases, resolvedCases,
        totalProducts, totalCrops, totalJobs, totalArticles,
        pendingExpertVerifs, verifiedExperts, verifiedEnterprises,
      },
    })
  }

  const [
    totalUsers, farmers, experts, enterprises, workers, buyers,
    totalCases, openCases, resolvedCases,
    totalProducts, totalCrops, totalJobs, totalArticles,
    pendingExpertVerifs, verifiedExperts, verifiedEnterprises,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { role: 'FARMER' } }),
    db.user.count({ where: { role: 'EXPERT' } }),
    db.user.count({ where: { role: 'ENTERPRISE' } }),
    db.user.count({ where: { role: 'WORKER' } }),
    db.user.count({ where: { role: 'BUYER' } }),
    db.agriculturalCase.count(),
    db.agriculturalCase.count({ where: { status: { in: ['OPEN', 'UNDER_REVIEW'] } } }),
    db.agriculturalCase.count({ where: { status: 'RESOLVED' } }),
    db.productListing.count(),
    db.cropListing.count(),
    db.jobListing.count(),
    db.knowledgeArticle.count(),
    db.expertVerification.count({ where: { status: 'PENDING' } }),
    db.expertProfile.count({ where: { verified: true } }),
    db.enterpriseProfile.count({ where: { verified: true } }),
  ])

  return Response.json({
    stats: {
      totalUsers, farmers, experts, enterprises, workers, buyers,
      totalCases, openCases, resolvedCases,
      totalProducts, totalCrops, totalJobs, totalArticles,
      pendingExpertVerifs, verifiedExperts, verifiedEnterprises,
    },
  })
}
