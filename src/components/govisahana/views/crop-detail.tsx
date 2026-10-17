'use client'

import { useEffect, useState, useMemo } from 'react'
import { useApp } from '@/lib/store'
import { useLang, useT } from '@/lib/use-t'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter, SheetClose,
} from '@/components/ui/sheet'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { EmptyState, money, formatDate } from '@/components/govisahana/common'
import {
  ArrowLeft, MapPin, Sprout, Mail, Phone, Send, User, Calendar,
  Scale, BadgeCheck, MessageCircle, Edit3, Trash2, CheckCircle2,
  AlertCircle, ShieldCheck, Tag, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { CROP_GRADES, QUANTITY_UNITS, PRICE_UNITS } from '@/lib/crop-taxonomy'

type Crop = {
  id: string
  ownerId: string
  category?: string | null
  cropName: string
  variety?: string | null
  quantity: number
  unit: string
  priceUnit?: string | null
  askingPrice?: number | null
  grade?: string | null
  description?: string | null
  imageUrl?: string | null
  mediaUrls?: string | null
  district?: string | null
  expectedHarvestDate?: string | null
  status: string
  available: boolean
  createdAt: string
  updatedAt: string
  owner: {
    id: string
    name: string
    email?: string | null
    phone?: string | null
    avatarUrl?: string | null
    role?: string
  }
}

const STATUS_CONFIG: Record<string, { label: string; labelSi: string; color: string }> = {
  AVAILABLE: {
    label: 'Available for Purchase',
    labelSi: 'මිලදී ගැනීමට ඇත',
    color: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
  },
  RESERVED: {
    label: 'Reserved by Buyer',
    labelSi: 'වෙන්කර ඇත',
    color: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
  },
  SOLD: {
    label: 'Sold Out',
    labelSi: 'විකිණී අවසන්',
    color: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
  },
}

export default function CropDetailView() {
  const id = useApp((s) => s.viewParam)
  const { setView, user } = useApp()
  const { lang } = useLang()
  const t = useT()

  const [crop, setCrop] = useState<Crop | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Photo gallery active index
  const [activePhotoIndex, setActivePhotoIndex] = useState(0)

  // Enquiry Sheet
  const [enquiryOpen, setEnquiryOpen] = useState(false)
  const [enquiryMessage, setEnquiryMessage] = useState('')
  const [sendingEnquiry, setSendingEnquiry] = useState(false)

  // Edit Modal (for farmer owner)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [savingEdit, setSavingEdit] = useState(false)
  const [editForm, setEditForm] = useState({
    cropName: '',
    variety: '',
    quantity: '',
    unit: 'kg',
    priceUnit: 'per kg',
    askingPrice: '',
    grade: 'Grade A',
    expectedHarvestDate: '',
    description: '',
    status: 'AVAILABLE',
  })

  // Delete Confirm Dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const loadCrop = () => {
    if (!id) return
    setLoading(true)
    setNotFound(false)
    fetch(`/api/crops/${id}`, { credentials: 'include' })
      .then((r) => {
        if (!r.ok) throw new Error('not found')
        return r.json()
      })
      .then((d) => {
        setCrop(d.crop)
        if (d.crop) {
          setEditForm({
            cropName: d.crop.cropName || '',
            variety: d.crop.variety || '',
            quantity: d.crop.quantity?.toString() || '',
            unit: d.crop.unit || 'kg',
            priceUnit: d.crop.priceUnit || `per ${d.crop.unit || 'kg'}`,
            askingPrice: d.crop.askingPrice?.toString() || '',
            grade: d.crop.grade || 'Grade A',
            expectedHarvestDate: d.crop.expectedHarvestDate ? new Date(d.crop.expectedHarvestDate).toISOString().split('T')[0] : '',
            description: d.crop.description || '',
            status: d.crop.status || 'AVAILABLE',
          })
        }
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadCrop()
  }, [id])

  // Extract all photos from crop
  const allPhotos = useMemo(() => {
    if (!crop) return []
    const list: string[] = []
    if (crop.imageUrl) list.push(crop.imageUrl)
    if (crop.mediaUrls) {
      try {
        const parsed = JSON.parse(crop.mediaUrls)
        if (Array.isArray(parsed)) {
          for (const u of parsed) {
            if (u && !list.includes(u)) list.push(u)
          }
        }
      } catch {
        if (!list.includes(crop.mediaUrls)) list.push(crop.mediaUrls)
      }
    }
    return list
  }, [crop])

  const isOwner = user?.id === crop?.owner.id || user?.role === 'ADMIN'

  // Update Status directly (Available / Reserved / Sold)
  const handleUpdateStatus = async (newStatus: string) => {
    if (!crop) return
    try {
      const res = await fetch(`/api/crops/${crop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus }),
      })
      if (!res.ok) throw new Error('Failed to update status')
      toast.success(`Status updated to ${newStatus}`)
      loadCrop()
    } catch {
      toast.error('Could not update status')
    }
  }

  // Save Edit Form
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!crop) return
    const qty = parseFloat(editForm.quantity)
    if (isNaN(qty) || qty <= 0) {
      toast.error('Please enter a valid quantity')
      return
    }

    setSavingEdit(true)
    try {
      const res = await fetch(`/api/crops/${crop.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          cropName: editForm.cropName.trim(),
          variety: editForm.variety.trim() || null,
          quantity: qty,
          unit: editForm.unit,
          priceUnit: editForm.priceUnit,
          askingPrice: editForm.askingPrice ? parseFloat(editForm.askingPrice) : null,
          grade: editForm.grade || null,
          expectedHarvestDate: editForm.expectedHarvestDate || null,
          description: editForm.description.trim() || null,
          status: editForm.status,
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to update')
      }

      toast.success('Listing details updated successfully!')
      setEditModalOpen(false)
      loadCrop()
    } catch (err: any) {
      toast.error(err.message || 'Error updating listing')
    } finally {
      setSavingEdit(false)
    }
  }

  // Delete Listing
  const handleDeleteListing = async () => {
    if (!crop) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/crops/${crop.id}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Listing deleted')
      setView('crops')
    } catch {
      toast.error('Failed to delete listing')
    } finally {
      setDeleting(false)
      setDeleteDialogOpen(false)
    }
  }

  // Send Commercial Enquiry
  const sendEnquiry = async () => {
    if (!crop) return
    if (!enquiryMessage.trim()) {
      toast.error('Please enter a message')
      return
    }
    setSendingEnquiry(true)
    try {
      const res = await fetch('/api/enquiries', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'CROP',
          listingId: crop.id,
          recipientId: crop.owner.id,
          message: enquiryMessage.trim(),
        }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to send')
      }
      toast.success('Enquiry sent directly to the farmer!')
      setEnquiryOpen(false)
      setEnquiryMessage('')
    } catch (e: any) {
      toast.error(e.message || 'Failed to send enquiry')
    } finally {
      setSendingEnquiry(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Skeleton className="mb-6 h-9 w-40 rounded-xl" />
        <div className="grid gap-8 lg:grid-cols-12">
          <Skeleton className="aspect-4/3 w-full rounded-2xl lg:col-span-7" />
          <div className="space-y-4 lg:col-span-5">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-6 w-1/3" />
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !crop) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Button variant="ghost" size="sm" onClick={() => setView('crops')} className="mb-4 text-muted-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Crop Marketplace
        </Button>
        <EmptyState
          icon={<Sprout className="h-8 w-8 text-emerald-600" />}
          title="Crop listing not found"
          description="This harvest may have been completed, unlisted or removed."
          action={
            <Button onClick={() => setView('crops')} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              Browse Available Crops
            </Button>
          }
        />
      </div>
    )
  }

  const statusInfo = STATUS_CONFIG[crop.status] || STATUS_CONFIG.AVAILABLE

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background pb-16">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
        {/* Back Link */}
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('crops')}
            className="text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {lang === 'si' ? 'නැවත බෝග වෙළඳපොළට' : 'Back to Crop Listings'}
          </Button>

          {crop.category && (
            <Badge variant="outline" className="border-emerald-600/30 text-emerald-700 dark:text-emerald-400">
              {crop.category}
            </Badge>
          )}
        </div>

        {/* Owner Control Banner if logged in as owner */}
        {isOwner && (
          <div className="mb-6 rounded-2xl border border-amber-300 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/20 p-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-amber-700 dark:text-amber-400 shrink-0" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-300">
                    {lang === 'si' ? 'ඔබේ අස්වනු දැන්වීම කළමනාකරණය කරන්න' : 'Manage Your Harvest Listing'}
                  </h4>
                  <p className="text-[11px] text-amber-700/90 dark:text-amber-400/90">
                    {lang === 'si'
                      ? 'මිල, ප්‍රමාණය යාවත්කාලීන කරන්න හෝ ගැනුම්කරු වෙන්කර තිබේ නම් තත්ත්වය වෙනස් කරන්න.'
                      : 'Update pricing, quantity, or toggle availability status as buyer orders arrive.'}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Select value={crop.status} onValueChange={handleUpdateStatus}>
                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-background w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">Mark Available</SelectItem>
                    <SelectItem value="RESERVED">Mark Reserved</SelectItem>
                    <SelectItem value="SOLD">Mark as Sold</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditModalOpen(true)}
                  className="h-8 text-xs bg-white dark:bg-background"
                >
                  <Edit3 className="mr-1 h-3.5 w-3.5" />
                  Edit
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="h-8 text-xs text-rose-600 hover:text-rose-700 border-rose-200 hover:bg-rose-50 bg-white dark:bg-background"
                >
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Main Details Grid */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Photos Gallery (Screen 3 requirement) */}
          <div className="lg:col-span-7 space-y-3">
            <Card className="overflow-hidden rounded-2xl border-border/80 shadow-xs">
              <div className="relative aspect-4/3 w-full bg-muted/40">
                {allPhotos.length > 0 ? (
                  <img
                    src={allPhotos[activePhotoIndex] || allPhotos[0]}
                    alt={crop.cropName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                    <Sprout className="h-16 w-16" />
                  </div>
                )}

                {/* Grade Badge Overlay */}
                {crop.grade && (
                  <Badge className="absolute left-3 top-3 border-transparent bg-emerald-600 text-white shadow-xs">
                    {crop.grade}
                  </Badge>
                )}

                {/* Availability Status Badge */}
                <Badge variant="outline" className={`absolute right-3 top-3 font-semibold shadow-xs ${statusInfo.color}`}>
                  {lang === 'si' ? statusInfo.labelSi : statusInfo.label}
                </Badge>
              </div>
            </Card>

            {/* Photo Thumbnails if multiple photos */}
            {allPhotos.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {allPhotos.map((photoUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative h-16 w-16 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                      activePhotoIndex === idx
                        ? 'border-emerald-600 ring-2 ring-emerald-500/20'
                        : 'border-transparent opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Description & Farm Notes */}
            <Card className="rounded-2xl border-border/80 shadow-xs">
              <CardContent className="p-5">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                  <Sprout className="h-4 w-4 text-emerald-600" />
                  {lang === 'si' ? 'අස්වැන්න පිළිබඳ විස්තරය' : 'Crop Description & Quality Notes'}
                </h3>
                <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {crop.description || (
                    <span className="italic text-muted-foreground">
                      No additional description provided. Contact farmer directly for inquiries.
                    </span>
                  )}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Pricing, Specs, Farmer info, Actions */}
          <div className="lg:col-span-5 space-y-4">
            {/* Title & Basic Meta */}
            <div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                <span>{crop.category || 'Agricultural Crop'}</span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-emerald-600" />
                  {crop.district || 'Sri Lanka'}
                </span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                {crop.cropName}
              </h1>
              {crop.variety && (
                <p className="text-sm text-muted-foreground font-medium mt-0.5">
                  Variety: <span className="text-foreground">{crop.variety}</span>
                </p>
              )}
            </div>

            {/* Price Box */}
            <div className="rounded-2xl border border-emerald-600/30 bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10 p-4 sm:p-5 shadow-xs">
              <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {lang === 'si' ? 'ඉල්ලා ඇති මිල' : 'Asking Price'}
              </div>
              <div className="mt-1 flex items-baseline gap-1.5">
                <span className="text-3xl sm:text-4xl font-extrabold text-emerald-700 dark:text-emerald-400">
                  {money(crop.askingPrice)}
                </span>
                <span className="text-sm font-medium text-muted-foreground">
                  / {crop.priceUnit || crop.unit}
                </span>
              </div>
              <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                Direct farm price — no intermediary commissions
              </div>
            </div>

            {/* Key Specs Card */}
            <Card className="rounded-2xl border-border/80 shadow-xs">
              <CardContent className="grid grid-cols-2 gap-4 p-4 text-xs sm:text-sm">
                <div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Scale className="h-3.5 w-3.5 text-emerald-600" />
                    Available Quantity
                  </div>
                  <div className="mt-0.5 font-bold text-foreground text-base">
                    {crop.quantity.toLocaleString()} {crop.unit}
                  </div>
                </div>

                <div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                    Quality Grade
                  </div>
                  <div className="mt-0.5 font-bold text-foreground text-base">
                    {crop.grade || 'Standard'}
                  </div>
                </div>

                <div className="col-span-2 pt-2 border-t border-border/50">
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                    Expected Harvest / Availability Date
                  </div>
                  <div className="mt-0.5 font-semibold text-foreground">
                    {crop.expectedHarvestDate ? formatDate(crop.expectedHarvestDate) : 'Ready for immediate pickup'}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Farmer Profile Card (Screen 3 requirement) */}
            <Card className="rounded-2xl border-border/80 shadow-xs">
              <CardContent className="p-4 sm:p-5">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-emerald-600" />
                  {lang === 'si' ? 'ගොවි තොරතුරු' : 'Farmer Profile'}
                </div>

                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border ring-1 ring-border">
                    <AvatarImage src={crop.owner.avatarUrl || ''} />
                    <AvatarFallback className="bg-emerald-100 text-emerald-800 font-bold">
                      {crop.owner.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-foreground text-sm sm:text-base truncate">
                      {crop.owner.name}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-emerald-600" />
                      {crop.district || 'Sri Lanka'} • {crop.owner.role || 'Farmer'}
                    </div>
                  </div>
                </div>

                {/* Contact Info (if available) */}
                <div className="mt-3.5 space-y-1.5 text-xs text-muted-foreground border-t border-border/50 pt-3">
                  {crop.owner.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span>{crop.owner.phone}</span>
                    </div>
                  )}
                  {crop.owner.email && (
                    <div className="flex items-center gap-2 truncate">
                      <Mail className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                      <span className="truncate">{crop.owner.email}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Action Buttons (Screen 3 requirement: Direct Messaging & Enquiry) */}
            {!isOwner ? (
              <div className="space-y-2 pt-2">
                {/* 1. Direct Chat in GoviSahana Messages */}
                <Button
                  size="lg"
                  onClick={() => {
                    if (!user) {
                      toast.info('Please sign in to message this farmer')
                      setView('login')
                      return
                    }
                    setView('community-messages', crop.owner.id)
                  }}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                >
                  <MessageCircle className="mr-2 h-4 w-4" />
                  {lang === 'si' ? 'ගොවියා සමඟ සෘජුව චැට් කරන්න' : 'Chat with Farmer'}
                </Button>

                {/* 2. Structured Commercial Enquiry */}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => {
                    if (!user) {
                      toast.info('Please sign in to send an enquiry')
                      setView('login')
                      return
                    }
                    setEnquiryOpen(true)
                  }}
                  className="w-full border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {lang === 'si' ? 'වෙළඳ විමසීමක් යවන්න' : 'Send Commercial Enquiry'}
                </Button>
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                {lang === 'si'
                  ? 'මෙය ඔබගේ ලැයිස්තුගත කිරීමයි. ඉහත පාලන මෙනුවෙන් එය සංස්කරණය කළ හැක.'
                  : 'You are the author of this listing. Use the management bar above to edit or update.'}
              </div>
            )}
          </div>
        </div>

        {/* Commercial Enquiry Sheet */}
        <Sheet open={enquiryOpen} onOpenChange={setEnquiryOpen}>
          <SheetContent className="flex flex-col gap-4 sm:max-w-md">
            <SheetHeader>
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs uppercase tracking-wider">
                <Send className="h-4 w-4" /> Commercial Enquiry
              </div>
              <SheetTitle>Contact {crop.owner.name}</SheetTitle>
              <SheetDescription>
                Send a formal purchase enquiry for this harvest of{' '}
                <span className="font-semibold text-foreground">{crop.cropName}</span> ({crop.quantity} {crop.unit}).
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-3 py-2">
              <div className="rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                <div className="font-semibold text-foreground">{crop.cropName}</div>
                <div className="text-muted-foreground">
                  Location: {crop.district} • Asking: {money(crop.askingPrice)} / {crop.priceUnit || crop.unit}
                </div>
              </div>

              <div>
                <Label htmlFor="enquiry-msg" className="text-xs font-semibold">
                  Your Message
                </Label>
                <Textarea
                  id="enquiry-msg"
                  value={enquiryMessage}
                  onChange={(e) => setEnquiryMessage(e.target.value)}
                  rows={5}
                  placeholder={`Hi ${crop.owner.name}, I am interested in purchasing your ${crop.cropName} harvest. Could you share details regarding transport, minimum order, and payment terms?`}
                  className="mt-1 text-xs"
                />
              </div>
            </div>

            <SheetFooter className="mt-auto gap-2">
              <SheetClose asChild>
                <Button variant="outline" size="sm">Cancel</Button>
              </SheetClose>
              <Button
                onClick={sendEnquiry}
                disabled={sendingEnquiry}
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                {sendingEnquiry ? 'Sending…' : 'Send Enquiry'}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>

        {/* Edit Harvest Modal (Farmer Owner Action) */}
        <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">Edit Harvest Listing</DialogTitle>
              <DialogDescription className="text-xs">
                Update the price, remaining quantity, or description of your harvest.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 pt-2">
              <div>
                <Label className="text-xs font-semibold">Crop Name *</Label>
                <Input
                  required
                  value={editForm.cropName}
                  onChange={(e) => setEditForm({ ...editForm, cropName: e.target.value })}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold">Variety</Label>
                  <Input
                    value={editForm.variety}
                    onChange={(e) => setEditForm({ ...editForm, variety: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
                <div>
                  <Label className="text-xs font-semibold">Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(val) => setEditForm({ ...editForm, status: val })}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="AVAILABLE">Available</SelectItem>
                      <SelectItem value="RESERVED">Reserved</SelectItem>
                      <SelectItem value="SOLD">Sold Out</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold">Quantity *</Label>
                  <div className="mt-1 flex gap-1.5">
                    <Input
                      required
                      type="number"
                      step="any"
                      min="1"
                      value={editForm.quantity}
                      onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                      className="h-9 text-xs flex-1"
                    />
                    <Select
                      value={editForm.unit}
                      onValueChange={(val) => setEditForm({ ...editForm, unit: val, priceUnit: `per ${val}` })}
                    >
                      <SelectTrigger className="h-9 w-24 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUANTITY_UNITS.map((u) => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Asking Price (LKR)</Label>
                  <div className="mt-1 flex gap-1.5">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={editForm.askingPrice}
                      onChange={(e) => setEditForm({ ...editForm, askingPrice: e.target.value })}
                      className="h-9 text-xs flex-1"
                    />
                    <Select
                      value={editForm.priceUnit}
                      onValueChange={(val) => setEditForm({ ...editForm, priceUnit: val })}
                    >
                      <SelectTrigger className="h-9 w-28 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRICE_UNITS.map((pu) => (
                          <SelectItem key={pu} value={pu}>{pu}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold">Quality Grade</Label>
                  <Select
                    value={editForm.grade}
                    onValueChange={(val) => setEditForm({ ...editForm, grade: val })}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CROP_GRADES.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">Expected Harvest Date</Label>
                  <Input
                    type="date"
                    value={editForm.expectedHarvestDate}
                    onChange={(e) => setEditForm({ ...editForm, expectedHarvestDate: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">Description</Label>
                <Textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="mt-1 text-xs"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditModalOpen(false)}
                  disabled={savingEdit}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={savingEdit}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-rose-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Delete Crop Listing
              </DialogTitle>
              <DialogDescription className="text-xs pt-1">
                Are you sure you want to permanently remove this listing for{' '}
                <span className="font-semibold text-foreground">{crop.cropName}</span>?
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteDialogOpen(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleDeleteListing}
                disabled={deleting}
                className="bg-rose-600 hover:bg-rose-700 text-white"
              >
                {deleting ? 'Deleting…' : 'Delete Listing'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
