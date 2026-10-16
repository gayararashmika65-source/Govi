import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const session = await getSession()
  const { searchParams } = new URL(req.url)
  const q = searchParams.get('q')?.trim() || ''

  if (!q) {
    return Response.json({ posts: [], people: [], hashtags: [] })
  }

  // 1. Search posts
  const posts = await db.communityPost.findMany({
    where: {
      AND: [
        { visibility: 'PUBLIC' },
        {
          OR: [
            { content: { contains: q } },
            { hashtags: { contains: q } },
            { category: { contains: q } },
          ],
        },
      ],
    },
    take: 10,
    orderBy: { createdAt: 'desc' },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          role: true,
          avatarUrl: true,
          expertProfile: { select: { verified: true, title: true } },
          farmerProfile: { select: { district: true } },
        },
      },
    },
  })

  // 2. Search people
  const people = await db.user.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { name: { contains: q } },
        { farmerProfile: { district: { contains: q } } },
        { farmerProfile: { crops: { contains: q } } },
        { expertProfile: { expertise: { contains: q } } },
        { expertProfile: { crops: { contains: q } } },
        { expertProfile: { title: { contains: q } } },
        { enterpriseProfile: { businessName: { contains: q } } },
      ],
    },
    take: 10,
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      farmerProfile: { select: { district: true, crops: true } },
      expertProfile: { select: { verified: true, title: true, crops: true } },
    },
  })

  return Response.json({
    posts: posts.map((p) => ({
      id: p.id,
      content: p.content,
      category: p.category,
      author: {
        id: p.author.id,
        name: p.author.name,
        role: p.author.role,
        avatarUrl: p.author.avatarUrl,
        verified: p.author.expertProfile?.verified || false,
        title: p.author.expertProfile?.title || null,
        district: p.author.farmerProfile?.district || null,
      },
      likesCount: p.likesCount,
      commentsCount: p.commentsCount,
      createdAt: p.createdAt.toISOString(),
    })),
    people: people.map((u) => ({
      id: u.id,
      name: u.name,
      role: u.role,
      avatarUrl: u.avatarUrl,
      verified: u.expertProfile?.verified || false,
      title: u.expertProfile?.title || null,
      district: u.farmerProfile?.district || null,
      crops: u.farmerProfile?.crops || u.expertProfile?.crops || null,
    })),
  })
}
