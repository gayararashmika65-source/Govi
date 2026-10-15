import { NextRequest } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { apiError, unauthorized } from '@/lib/server-helpers'

// GET current user's profile (role-specific)
export async function GET() {
  const session = await getSession()
  if (!session) return unauthorized()

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return unauthorized()
    const userId = session.id
    const [userRow, farmer, expert, enterprise, worker, buyer] = await Promise.all([
      admin.from('profiles').select('id, email, name, role, phone, avatar_url, status').eq('id', userId).single(),
      admin.from('farmer_profiles').select('*').eq('user_id', userId).maybeSingle(),
      admin.from('expert_profiles').select('*, expert_verifications(*)').eq('user_id', userId).maybeSingle(),
      admin.from('enterprise_profiles').select('*').eq('user_id', userId).maybeSingle(),
      admin.from('worker_profiles').select('*').eq('user_id', userId).maybeSingle(),
      admin.from('buyer_profiles').select('*').eq('user_id', userId).maybeSingle(),
    ])
    return Response.json({
      profile: {
        ...userRow.data,
        avatarUrl: userRow.data?.avatar_url,
        farmerProfile: farmer.data,
        expertProfile: expert.data,
        enterpriseProfile: enterprise.data,
        workerProfile: worker.data,
        buyerProfile: buyer.data,
      },
    })
  }

  // Prisma path
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
    district: z.string().optional(), location: z.string().optional(),
    farmSizeAcres: z.number().optional(), crops: z.string().optional(), bio: z.string().optional(),
  }).optional(),
  expert: z.object({
    title: z.string().optional(), qualifications: z.string().optional(), expertise: z.string().optional(),
    crops: z.string().optional(), languages: z.string().optional(), serviceAreas: z.string().optional(),
    bio: z.string().optional(), hourlyRate: z.number().optional(), available: z.boolean().optional(),
  }).optional(),
  enterprise: z.object({
    businessName: z.string().optional(), businessType: z.string().optional(),
    registrationNo: z.string().optional(), district: z.string().optional(), address: z.string().optional(),
  }).optional(),
  worker: z.object({
    skills: z.string().optional(), experience: z.string().optional(),
    district: z.string().optional(), available: z.boolean().optional(), bio: z.string().optional(),
  }).optional(),
  buyer: z.object({
    buyerType: z.string().optional(), company: z.string().optional(), district: z.string().optional(),
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

  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    const userId = session.id

    // Update common profile fields (NEVER allow role/status changes here — RLS also enforces this)
    const profileUpdate: Record<string, unknown> = {}
    if (name) profileUpdate.name = name
    if (phone !== undefined) profileUpdate.phone = phone
    if (avatarUrl !== undefined) profileUpdate.avatar_url = avatarUrl
    if (Object.keys(profileUpdate).length > 0) {
      await admin.from('profiles').update(profileUpdate).eq('id', userId)
    }

    // Upsert role-specific profile
    if (session.role === 'FARMER' && farmer) {
      await admin.from('farmer_profiles').upsert({
        user_id: userId,
        district: farmer.district, location: farmer.location,
        farm_size_acres: farmer.farmSizeAcres, crops: farmer.crops, bio: farmer.bio,
      }, { onConflict: 'user_id' })
    }
    if (session.role === 'EXPERT' && expert) {
      await admin.from('expert_profiles').upsert({
        user_id: userId, title: expert.title, qualifications: expert.qualifications,
        expertise: expert.expertise, crops: expert.crops, languages: expert.languages,
        service_areas: expert.serviceAreas, bio: expert.bio,
        hourly_rate: expert.hourlyRate, available: expert.available,
      }, { onConflict: 'user_id' })
    }
    if (session.role === 'ENTERPRISE' && enterprise) {
      await admin.from('enterprise_profiles').upsert({
        user_id: userId, business_name: enterprise.businessName || name,
        business_type: enterprise.businessType, registration_no: enterprise.registrationNo,
        district: enterprise.district, address: enterprise.address,
      }, { onConflict: 'user_id' })
    }
    if (session.role === 'WORKER' && worker) {
      await admin.from('worker_profiles').upsert({
        user_id: userId, skills: worker.skills, experience: worker.experience,
        district: worker.district, available: worker.available, bio: worker.bio,
      }, { onConflict: 'user_id' })
    }
    if (session.role === 'BUYER' && buyer) {
      await admin.from('buyer_profiles').upsert({
        user_id: userId, buyer_type: buyer.buyerType, company: buyer.company, district: buyer.district,
      }, { onConflict: 'user_id' })
    }
    return Response.json({ ok: true })
  }

  // Prisma path (unchanged)
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
    await db.workerProfile.upsert({ where: { userId: session.id }, update: { ...worker }, create: { userId: session.id, ...worker } })
  }
  if (session.role === 'BUYER' && buyer) {
    await db.buyerProfile.upsert({ where: { userId: session.id }, update: { ...buyer }, create: { userId: session.id, ...buyer } })
  }
  return Response.json({ ok: true })
}
