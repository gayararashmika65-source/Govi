'use client'
import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

export function SectionHeader({
  eyebrow, title, description, center, className,
}: {
  eyebrow?: string
  title: string
  description?: string
  center?: boolean
  className?: string
}) {
  return (
    <div className={cn('space-y-2', center && 'text-center mx-auto max-w-2xl', className)}>
      {eyebrow && (
        <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </span>
      )}
      <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      {description && <p className="text-muted-foreground leading-relaxed">{description}</p>}
    </div>
  )
}

export function EmptyState({
  icon, title, description, action, className,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 p-10 text-center', className)}>
      {icon && <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">{icon}</div>}
      <h3 className="text-base font-semibold text-foreground">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function StatCard({
  label, value, icon, hint, tone = 'default',
}: {
  label: string
  value: string | number
  icon?: ReactNode
  hint?: string
  tone?: 'default' | 'green' | 'amber' | 'blue'
}) {
  const tones: Record<string, string> = {
    default: 'bg-card text-foreground',
    green: 'bg-emerald-50 text-emerald-900 border-emerald-100',
    amber: 'bg-amber-50 text-amber-900 border-amber-100',
    blue: 'bg-blue-50 text-blue-900 border-blue-100',
  }
  return (
    <div className={cn('rounded-xl border p-4 shadow-sm', tones[tone])}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
        {icon && <span className="text-primary">{icon}</span>}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}

export function money(value?: number | null) {
  if (value == null) return '—'
  return `Rs. ${value.toLocaleString('en-LK')}`
}

export function formatDate(date?: Date | string | null) {
  if (!date) return '—'
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-LK', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function timeAgo(date?: Date | string | null) {
  if (!date) return ''
  const d = new Date(date).getTime()
  const diff = Date.now() - d
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 30) return `${days}d ago`
  return formatDate(date)
}
