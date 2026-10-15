import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { unauthorized } from '@/lib/server-helpers'

// Aggregated data for the signed-in user's dashboard
export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()

  const [products, crops, services, jobs, jobApplications, buyerRequirements, enquiriesSent, enquiriesReceived] = await Promise.all([
    db.productListing.findMany({ where: { ownerId: session.id }, orderBy: { createdAt: 'desc' } }),
    db.cropListing.findMany({ where: { ownerId: session.id }, orderBy: { createdAt: 'desc' } }),
    db.serviceListing.findMany({ where: { ownerId: session.id }, orderBy: { createdAt: 'desc' } }),
    db.jobListing.findMany({ where: { ownerId: session.id }, include: { _count: { select: { applications: true } } }, orderBy: { createdAt: 'desc' } }),
    db.jobApplication.findMany({ where: { workerId: session.id }, include: { job: { select: { id: true, title: true, location: true, wage: true, status: true } } }, orderBy: { createdAt: 'desc' } }),
    db.buyerRequirement.findMany({ where: { ownerId: session.id }, orderBy: { createdAt: 'desc' } }),
    db.enquiry.findMany({ where: { senderId: session.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
    db.enquiry.findMany({ where: { recipientId: session.id }, orderBy: { createdAt: 'desc' }, take: 30 }),
  ])

  return Response.json({
    listings: { products, crops, services, jobs, jobApplications, buyerRequirements },
    enquiries: { sent: enquiriesSent, received: enquiriesReceived },
  })
}
