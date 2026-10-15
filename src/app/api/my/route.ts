import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { unauthorized } from '@/lib/server-helpers'
import { snakeToCamel } from '@/lib/case-convert'

// Aggregated data for the signed-in user's dashboard
export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return Response.json({ listings: { products: [], crops: [], services: [], jobs: [], jobApplications: [], buyerRequirements: [] }, enquiries: { sent: [], received: [] } })

    const [productsRes, cropsRes, servicesRes, jobsRes, appsRes, buyerReqsRes, sentRes, receivedRes] = await Promise.all([
      admin.from('product_listings').select('*').eq('owner_id', session.id).order('created_at', { ascending: false }),
      admin.from('crop_listings').select('*').eq('owner_id', session.id).order('created_at', { ascending: false }),
      admin.from('service_listings').select('*').eq('owner_id', session.id).order('created_at', { ascending: false }),
      admin.from('job_listings').select('*, applications:job_applications(id)').eq('owner_id', session.id).order('created_at', { ascending: false }),
      admin.from('job_applications').select('*, job:job_listings(id, title, location, wage, status)').eq('worker_id', session.id).order('created_at', { ascending: false }),
      admin.from('buyer_requirements').select('*').eq('owner_id', session.id).order('created_at', { ascending: false }),
      admin.from('enquiries').select('*').eq('sender_id', session.id).order('created_at', { ascending: false }).limit(30),
      admin.from('enquiries').select('*').eq('recipient_id', session.id).order('created_at', { ascending: false }).limit(30),
    ])

    const jobs = (jobsRes.data || []).map((row: Record<string, unknown>) => {
      const camel = snakeToCamel(row) as Record<string, unknown>
      const apps = (camel.applications as Array<unknown> | undefined) || []
      const { applications: _a, ...rest } = camel
      void _a
      return { ...rest, _count: { applications: apps.length } }
    })

    const jobApplications = (appsRes.data || []).map((row: Record<string, unknown>) => {
      const camel = snakeToCamel(row) as Record<string, unknown>
      const { job, ...rest } = camel
      return { ...rest, job: job ?? null }
    })

    return Response.json({
      listings: {
        products: (productsRes.data || []).map(snakeToCamel),
        crops: (cropsRes.data || []).map(snakeToCamel),
        services: (servicesRes.data || []).map(snakeToCamel),
        jobs,
        jobApplications,
        buyerRequirements: (buyerReqsRes.data || []).map(snakeToCamel),
      },
      enquiries: {
        sent: (sentRes.data || []).map(snakeToCamel),
        received: (receivedRes.data || []).map(snakeToCamel),
      },
    })
  }

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
