import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { forbidden } from '@/lib/server-helpers'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'ADMIN') return forbidden()

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
