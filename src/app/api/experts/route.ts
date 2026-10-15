import { NextRequest } from 'next/server'
import { db } from '@/lib/db'

// GET verified experts with optional search
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim()
  const district = searchParams.get('district')?.trim()
  const crop = searchParams.get('crop')?.trim()
  const verifiedOnly = searchParams.get('verified') !== 'false'

  const experts = await db.expertProfile.findMany({
    where: {
      AND: [
        verifiedOnly ? { verified: true } : {},
        q ? {
          OR: [
            { user: { name: { contains: q } } },
            { expertise: { contains: q } },
            { title: { contains: q } },
            { bio: { contains: q } },
          ],
        } : {},
        district ? { serviceAreas: { contains: district } } : {},
        crop ? { crops: { contains: crop } } : {},
      ],
    },
    include: { user: { select: { id: true, name: true, avatarUrl: true } } },
    orderBy: { rating: 'desc' },
    take: 60,
  })
  return Response.json({ experts })
}
