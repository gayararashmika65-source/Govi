'use client'
import { useRef, useState } from 'react'
import { Upload, X, Loader2, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

export function ImageUpload({
  value, onChange, accept = 'image/*', label = 'Upload image', className,
}: {
  value?: string
  onChange: (url: string) => void
  accept?: string
  label?: string
  className?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { toast.error('File too large (max 5MB)'); return }
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: form, credentials: 'include' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')
      onChange(data.url)
      toast.success('Uploaded')
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const isPdf = value?.toLowerCase().endsWith('.pdf')

  return (
    <div className={cn('space-y-2', className)}>
      {value ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          {isPdf ? (
            <div className="flex items-center gap-3 p-4">
              <FileText className="h-8 w-8 text-primary" />
              <span className="text-sm text-muted-foreground">Document uploaded</span>
            </div>
          ) : (
            <img src={value} alt="preview" className="h-40 w-full object-cover" />
          )}
          <button type="button" onClick={() => onChange('')} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          <span>{uploading ? 'Uploading…' : label}</span>
          <span className="text-xs text-muted-foreground/70">JPG, PNG, WebP, PDF · max 5MB</span>
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = '' }}
      />
    </div>
  )
}
