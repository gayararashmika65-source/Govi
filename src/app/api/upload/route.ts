import { NextRequest } from 'next/server'
import { getSession, useSupabaseAuth } from '@/lib/auth'
import { getSupabaseAdmin } from '@/lib/supabase-server'
import { apiError } from '@/lib/server-helpers'
import { writeFile, mkdir } from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024 // 5 MB

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('Unauthorized', 401)

  const form = await req.formData()
  const file = form.get('file')
  if (!(file instanceof File)) return apiError('No file provided')
  if (!ALLOWED.includes(file.type)) return apiError('Unsupported file type. Allowed: JPG, PNG, WebP, GIF, PDF')
  if (file.size > MAX_SIZE) return apiError('File too large. Max 5MB.')

  const ext = file.name.split('.').pop()?.toLowerCase() || 'bin'
  const name = `${crypto.randomBytes(12).toString('hex')}.${ext}`

  // ----- SUPABASE STORAGE PATH -----
  if (useSupabaseAuth) {
    const admin = getSupabaseAdmin()
    if (!admin) return apiError('Supabase not configured', 500)
    // Default to the avatars bucket (public-read). Case attachments and verification
    // docs are uploaded by the dedicated endpoints that need them.
    const bucket = (form.get('bucket') as string) || 'avatars'
    const folder = session.id // path: <uid>/<filename>
    const buffer = Buffer.from(await file.arrayBuffer())
    const { data, error } = await admin.storage.from(bucket).upload(`${folder}/${name}`, buffer, {
      contentType: file.type, upsert: false,
    })
    if (error) return apiError(error.message, 400)
    const { data: pub } = admin.storage.from(bucket).getPublicUrl(data.path)
    return Response.json({ url: pub.publicUrl, path: data.path, name: file.name, size: file.size })
  }

  // ----- LOCAL FILE PATH (fallback) -----
  const dir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(dir, name), buffer)
  return Response.json({ url: `/uploads/${name}`, name: file.name, size: file.size })
}
