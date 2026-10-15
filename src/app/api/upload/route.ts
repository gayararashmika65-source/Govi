import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth'
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
  const dir = path.join(process.cwd(), 'public', 'uploads')
  await mkdir(dir, { recursive: true })
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(dir, name), buffer)

  return Response.json({ url: `/uploads/${name}`, name: file.name, size: file.size })
}
