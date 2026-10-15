import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { apiError, unauthorized } from '@/lib/server-helpers'

// GET current user's profile (role-specific)
export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()
  const base = await db.user.findUnique({
    where: { id: session.id },
    select: {
      id: true, email: true, name: true, role: true, phone: true, avatarUrl: true, status: true,
      farmerProfile: true, expertProfile: { include: { verifications: true } },
      enterpriseProfile: true, workerProfile: true, buyerProfile: true,
    },
  })
  if (!base) return unauthorized()
  return Response.json({ profile: base })
}

const schema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  avatarUrl: z.string().optional(),
  farmer: z.object({
    district: z.string().optional(),
    location: z.string().optional(),
    farmSizeAcres: z.number().optional(),
    crops: z.string().optional(),
    bio: z.string().optional(),
  }).optional(),
  expert: z.object({
    title: z.string().optional(),
    qualifications: z.string().optional(),
    expertise: z.string().optional(),
    crops: z.string().optional(),
    languages: z.string().optional(),
    serviceAreas: z.string().optional(),
    bio: z.string().optional(),
    hourlyRate: z.number().optional(),
    available: z.boolean().optional(),
  }).optional(),
  enterprise: z.object({
    businessName: z.string().optional(),
    businessType: z.string().optional(),
    registrationNo: z.string().optional(),
    district: z.string().optional(),
    address: z.string().optional(),
  }).optional(),
  worker: z.object({
    skills: z.string().optional(),
    experience: z.string().optional(),
    district: z.string().optional(),
    available: z.boolean().optional(),
    bio: z.string().optional(),
  }).optional(),
  buyer: z.object({
    buyerType: z.string().optional(),
    company: z.string().optional(),
    district: z.string().optional(),
  }).optional(),
})

export async function PUT(req: NextRequest) {
  const session = await getSession()
  if (!session) return unauthorized()
  let body
  try { body = await req.json() } catch { return apiError('Invalid body') }
  const parsed = schema.safeParse(body)
  if (!parsed.success) return apiError(parsed.error.issues[0]?.message ?? 'Invalid')

  const { name, phone, avatarUrl, farmer, expert, enterprise, worker, buyer } = parsed.data

  await db.user.update({
    where: { id: session.id },
    data: {
      ...(name ? { name } : {}),
      ...(phone !== undefined ? { phone } : {}),
      ...(avatarUrl !== undefined ? { avatarUrl } : {}),
    },
  })

  if (session.role === 'FARMER' && farmer) {
    await db.farmerProfile.upsert({
      where: { userId: session.id },
      update: {
        ...(farmer.district !== undefined ? { district: farmer.district } : {}),
        ...(farmer.location !== undefined ? { location: farmer.location } : {}),
        ...(farmer.farmSizeAcres !== undefined ? { farmSizeAcres: farmer.farmSizeAcres } : {}),
        ...(farmer.crops !== undefined ? { crops: farmer.crops } : {}),
        ...(farmer.bio !== undefined ? { bio: farmer.bio } : {}),
      },
      create: { userId: session.id, ...farmer },
    })
  }
  if (session.role === 'EXPERT' && expert) {
    await db.expertProfile.upsert({
      where: { userId: session.id },
      update: {
        ...(expert.title !== undefined ? { title: expert.title } : {}),
        ...(expert.qualifications !== undefined ? { qualifications: expert.qualifications } : {}),
        ...(expert.expertise !== undefined ? { expertise: expert.expertise } : {}),
        ...(expert.crops !== undefined ? { crops: expert.crops } : {}),
        ...(expert.languages !== undefined ? { languages: expert.languages } : {}),
        ...(expert.serviceAreas !== undefined ? { serviceAreas: expert.serviceAreas } : {}),
        ...(expert.bio !== undefined ? { bio: expert.bio } : {}),
        ...(expert.hourlyRate !== undefined ? { hourlyRate: expert.hourlyRate } : {}),
        ...(expert.available !== undefined ? { available: expert.available } : {}),
      },
      create: { userId: session.id, ...expert },
    })
  }
  if (session.role === 'ENTERPRISE' && enterprise) {
    await db.enterpriseProfile.upsert({
      where: { userId: session.id },
      update: { ...enterprise },
      create: { userId: session.id, businessName: enterprise.businessName || session.name, ...enterprise },
    })
  }
  if (session.role === 'WORKER' && worker) {
    await db.workerProfile.upsert({
      where: { userId: session.id },
      update: { ...worker },
      create: { userId: session.id, ...worker },
    })
  }
  if (session.role === 'BUYER' && buyer) {
    await db.buyerProfile.upsert({
      where: { userId: session.id },
      update: { ...buyer },
      create: { userId: session.id, ...buyer },
    })
  }

  return Response.json({ ok: true })
}
