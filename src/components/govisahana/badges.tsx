'use client'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { useT } from '@/lib/use-t'

const MAP: Record<string, string> = {
  OPEN: 'bg-blue-100 text-blue-700',
  UNDER_REVIEW: 'bg-amber-100 text-amber-700',
  ASSIGNED: 'bg-violet-100 text-violet-700',
  IN_PROGRESS: 'bg-cyan-100 text-cyan-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-slate-100 text-slate-600',
  CANCELLED: 'bg-rose-100 text-rose-700',
  REQUESTED: 'bg-blue-100 text-blue-700',
  ACCEPTED: 'bg-emerald-100 text-emerald-700',
  DECLINED: 'bg-rose-100 text-rose-700',
  SCHEDULED: 'bg-violet-100 text-violet-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  PENDING: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-emerald-100 text-emerald-700',
  SUSPENDED: 'bg-rose-100 text-rose-700',
  APPROVED: 'bg-emerald-100 text-emerald-700',
  REJECTED: 'bg-rose-100 text-rose-700',
}

export function StatusBadge({ status, className }: { status?: string | null; className?: string }) {
  const t = useT()
  const safeStatus = status || 'OPEN'
  const cls = MAP[safeStatus] || 'bg-slate-100 text-slate-600'
  const localized = t('status.' + safeStatus)
  const label = localized !== 'status.' + safeStatus ? localized : safeStatus.replace(/_/g, ' ')
  return (
    <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize', cls, className)}>
      {label}
    </span>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const t = useT()
  const colors: Record<string, string> = {
    FARMER: 'bg-emerald-100 text-emerald-700',
    EXPERT: 'bg-violet-100 text-violet-700',
    ENTERPRISE: 'bg-amber-100 text-amber-700',
    WORKER: 'bg-orange-100 text-orange-700',
    BUYER: 'bg-cyan-100 text-cyan-700',
    ADMIN: 'bg-slate-800 text-white',
  }
  const localized = t('role.' + role)
  const label = localized !== 'role.' + role ? localized : role
  return (
    <Badge variant="outline" className={cn('border-transparent font-medium', colors[role])}>
      {label}
    </Badge>
  )
}

export function VerifiedBadge({ verified, label }: { verified: boolean; label?: string }) {
  const t = useT()
  const displayLabel = label ?? (verified ? t('badge.verified') : t('badge.unverified'))
  if (!verified)
    return (
      <Badge variant="outline" className="border-amber-300 text-amber-700 bg-amber-50">
        <span className="mr-1 h-1.5 w-1.5 rounded-full bg-amber-500" /> {displayLabel}
      </Badge>
    )
  return (
    <Badge className="bg-emerald-100 text-emerald-700 border-transparent">
      <svg viewBox="0 0 24 24" fill="currentColor" className="mr-1 h-3 w-3"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>
      {displayLabel}
    </Badge>
  )
}
