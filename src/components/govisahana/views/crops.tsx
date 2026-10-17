'use client'

import { useEffect, useState, useMemo } from 'react'
import { useApp } from '@/lib/store'
import { useT, useLang } from '@/lib/use-t'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { EmptyState, money, formatDate } from '@/components/govisahana/common'
import { SRI_LANKAN_DISTRICTS } from '@/lib/types'
import {
  CROP_CATEGORIES, PRESET_CROP_PHOTOS, QUANTITY_UNITS, PRICE_UNITS, CROP_GRADES,
  type CropCategory,
} from '@/lib/crop-taxonomy'
import {
  Search, ArrowLeft, ChevronRight, MapPin, Calendar, User,
  Plus, Sprout, Sparkles, Filter, ArrowUpDown, X, Tag, Scale,
  CheckCircle2, Clock, Image as ImageIcon,
} from 'lucide-react'
import { toast } from 'sonner'

export type CropListingItem = {
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
    avatarUrl?: string | null
    role?: string
  }
}

const GRADE_BADGES: Record<string, string> = {
  'Grade A': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
  'Grade B': 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300',
  'Grade C': 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300',
  'Premium': 'bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 border-purple-300',
  'Organic Certified': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300',
}

function timeAgo(dateString: string): string {
  try {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffSec = Math.floor(diffMs / 1000)
    const diffMin = Math.floor(diffSec / 60)
    const diffHour = Math.floor(diffMin / 60)
    const diffDay = Math.floor(diffHour / 24)

    if (diffDay === 0) {
      if (diffHour === 0) {
        if (diffMin <= 1) return 'Just now'
        return `${diffMin}m ago`
      }
      return `${diffHour}h ago`
    }
    if (diffDay === 1) return 'Yesterday'
    if (diffDay < 7) return `${diffDay}d ago`
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export default function CropsView() {
  const { openDetail, setView, user } = useApp()
  const { lang } = useLang()
  const t = useT()

  // Selected Category (null = Screen 1: Categories, non-null = Screen 2: Listings within Category)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  // Data
  const [crops, setCrops] = useState<CropListingItem[]>([])
  const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  // Filters for Screen 1 & Screen 2
  const [categorySearch, setCategorySearch] = useState('')
  const [listingSearch, setListingSearch] = useState('')
  const [districtFilter, setDistrictFilter] = useState('all')
  const [gradeFilter, setGradeFilter] = useState('all')
  const [sortBy, setSortBy] = useState<'newest' | 'price_asc' | 'price_desc' | 'quantity_desc'>('newest')

  // Posting Modal
  const [postModalOpen, setPostModalOpen] = useState(false)
  const [submittingPost, setSubmittingPost] = useState(false)
  const [formData, setFormData] = useState({
    category: '',
    cropName: '',
    variety: '',
    quantity: '',
    unit: 'kg',
    priceUnit: 'per kg',
    askingPrice: '',
    grade: 'Grade A',
    district: '',
    expectedHarvestDate: '',
    imageUrl: '',
    description: '',
  })

  // Load all crops or crops for selected category
  const fetchCrops = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (selectedCategoryId) {
      params.set('category', selectedCategoryId)
    }
    if (listingSearch.trim()) {
      params.set('q', listingSearch.trim())
    }
    if (districtFilter !== 'all') {
      params.set('district', districtFilter)
    }
    params.set('sort', sortBy)

    fetch(`/api/crops?${params.toString()}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        setCrops(d.crops || [])
        if (d.categoryCounts) {
          setCategoryCounts(d.categoryCounts)
        }
      })
      .catch(() => setCrops([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchCrops()
  }, [selectedCategoryId, listingSearch, districtFilter, sortBy])

  // Get active category metadata
  const activeCategory = useMemo(() => {
    if (!selectedCategoryId) return null
    return CROP_CATEGORIES.find((c) => c.id === selectedCategoryId) || null
  }, [selectedCategoryId])

  // Filtered categories for Screen 1
  const filteredCategories = useMemo(() => {
    const q = categorySearch.toLowerCase().trim()
    if (!q) return CROP_CATEGORIES
    return CROP_CATEGORIES.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        cat.nameSi.toLowerCase().includes(q) ||
        cat.nameTa.toLowerCase().includes(q) ||
        cat.examples.toLowerCase().includes(q) ||
        cat.commonCrops.some((c) => c.toLowerCase().includes(q))
    )
  }, [categorySearch])

  // Filtered listings for Screen 2 (client-side grade filtering if needed)
  const displayedListings = useMemo(() => {
    if (gradeFilter === 'all') return crops
    return crops.filter((c) => c.grade === gradeFilter)
  }, [crops, gradeFilter])

  // Open posting modal
  const handleOpenPostModal = (presetCategory?: string) => {
    if (!user) {
      toast.info(lang === 'si' ? 'අස්වැන්න ලැයිස්තුගත කිරීමට කරුණාකර ප්‍රවේශ වන්න' : 'Please log in to list your harvest')
      setView('login')
      return
    }
    const cat = presetCategory || selectedCategoryId || CROP_CATEGORIES[0].id
    setFormData({
      category: cat,
      cropName: '',
      variety: '',
      quantity: '',
      unit: 'kg',
      priceUnit: 'per kg',
      askingPrice: '',
      grade: 'Grade A',
      district: SRI_LANKAN_DISTRICTS[0],
      expectedHarvestDate: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      imageUrl: PRESET_CROP_PHOTOS[0].url,
      description: '',
    })
    setPostModalOpen(true)
  }

  // Handle post submit
  const handleCreateListing = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.cropName.trim()) {
      toast.error(lang === 'si' ? 'බෝගයේ නම ඇතුළත් කරන්න' : 'Please enter crop name')
      return
    }
    const qty = parseFloat(formData.quantity)
    if (isNaN(qty) || qty <= 0) {
      toast.error(lang === 'si' ? 'වලංගු ප්‍රමාණයක් ඇතුළත් කරන්න' : 'Please enter a valid quantity')
      return
    }

    setSubmittingPost(true)
    try {
      const res = await fetch('/api/crops', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          category: formData.category,
          cropName: formData.cropName.trim(),
          variety: formData.variety.trim() || undefined,
          quantity: qty,
          unit: formData.unit,
          priceUnit: formData.priceUnit,
          askingPrice: formData.askingPrice ? parseFloat(formData.askingPrice) : undefined,
          grade: formData.grade || undefined,
          district: formData.district || undefined,
          expectedHarvestDate: formData.expectedHarvestDate || undefined,
          imageUrl: formData.imageUrl || undefined,
          description: formData.description.trim() || undefined,
          status: 'AVAILABLE',
        }),
      })

      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error || 'Failed to create listing')
      }

      toast.success(
        lang === 'si'
          ? 'ඔබේ අස්වැන්න සාර්ථකව ලැයිස්තුගත කරන ලදී!'
          : lang === 'ta'
          ? 'உங்கள் அறுவடை வெற்றிகரமாக பட்டியலிடப்பட்டது!'
          : 'Your harvest listing has been published!'
      )
      setPostModalOpen(false)
      fetchCrops()
    } catch (err: any) {
      toast.error(err.message || 'Error creating listing')
    } finally {
      setSubmittingPost(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50/50 dark:bg-background pb-16">
      <div className="mx-auto max-w-4xl px-3 py-6 sm:px-6">
        {/* Navigation Breadcrumb / Top Bar */}
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              if (selectedCategoryId) {
                setSelectedCategoryId(null)
                setListingSearch('')
              } else {
                setView('home')
              }
            }}
            className="text-muted-foreground hover:text-foreground -ml-2"
          >
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {selectedCategoryId
              ? lang === 'si' ? 'සියලු බෝග කාණ්ඩ' : lang === 'ta' ? 'அனைத்து பயிர் பிரிவுகள்' : 'All Crop Categories'
              : t('nav.home')}
          </Button>

          <Button
            onClick={() => handleOpenPostModal(selectedCategoryId || undefined)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all text-xs sm:text-sm px-3.5 py-2 h-auto"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            {lang === 'si' ? 'අස්වැන්න ලැයිස්තුගත කරන්න' : lang === 'ta' ? 'அறுவடையைப் பட்டியலிடுங்கள்' : 'List Your Harvest'}
          </Button>
        </div>

        {/* =========================================================================
            SCREEN 1: CROP CATEGORIES (WHATSAPP CHAT-LIST-STYLE ROWS)
            ========================================================================= */}
        {!selectedCategoryId && (
          <div className="space-y-4">
            {/* Header / Intro */}
            <div className="rounded-2xl border border-emerald-600/20 bg-gradient-to-br from-emerald-500/10 via-background to-teal-500/10 p-5 sm:p-6 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600/15 px-3 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-2">
                    <Sprout className="h-3.5 w-3.5" />
                    {lang === 'si' ? 'සෘජු ගොවි වෙළඳපොළ' : lang === 'ta' ? 'நேரடி விவசாய சந்தை' : 'Direct Farmer Marketplace'}
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                    GoviSahana Crops
                  </h1>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground max-w-xl">
                    {lang === 'si'
                      ? 'අස්වැන්න කාණ්ඩය තෝරා දිවයින පුරා ගොවීන්ගේ නැවුම් අස්වැන්න සෘජුවම ගවේෂණය කරන්න.'
                      : lang === 'ta'
                      ? 'பயிர் பிரிவைத் தேர்ந்தெடுத்து, நாடு முழுவதிலுமிருந்து விவசாயிகளின் நேரடி அறுவடைகளை உலாவவும்.'
                      : 'Browse crop categories to view available farmer harvests directly from growers across Sri Lanka.'}
                  </p>
                </div>

                <Button
                  onClick={() => handleOpenPostModal()}
                  variant="outline"
                  size="sm"
                  className="border-emerald-600/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 self-start sm:self-auto shrink-0"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  {lang === 'si' ? 'බෝග විකුණන්න' : lang === 'ta' ? 'பயிர்களை விற்க' : 'Sell Your Crops'}
                </Button>
              </div>

              {/* WhatsApp-Style Search Input */}
              <div className="relative mt-4">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder={
                    lang === 'si'
                      ? 'කාණ්ඩයක් හෝ බෝගයක් සොයන්න (උදා: තක්කාලි, පොල්, තේ)...'
                      : lang === 'ta'
                      ? 'பிரிவு அல்லது பயிரைத் தேடுங்கள் (எ.கா: தக்காளி, தேங்காய், தேயிலை)...'
                      : 'Search crop categories or produce (e.g. Coconuts, Tomatoes, Tea)...'
                  }
                  className="h-11 rounded-xl bg-background/80 pl-10 pr-9 text-sm shadow-xs border-border/80 focus-visible:ring-emerald-500"
                />
                {categorySearch && (
                  <button
                    onClick={() => setCategorySearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Categories List Container (WhatsApp-Style Vertical List) */}
            <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs divide-y divide-border/50">
              <div className="bg-muted/40 px-4 py-2.5 flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <span>{lang === 'si' ? 'බෝග කාණ්ඩ' : lang === 'ta' ? 'பயிர் பிரிவுகள்' : 'Crop Categories'} ({filteredCategories.length})</span>
                <span>{lang === 'si' ? 'ලබාගත හැකි අස්වැන්න' : lang === 'ta' ? 'கிடைக்கும் அறுவடைகள்' : 'Available Harvests'}</span>
              </div>

              {filteredCategories.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <p>{lang === 'si' ? 'සොයන ලද කාණ්ඩය හමු නොවීය.' : 'No crop categories matching your search.'}</p>
                </div>
              ) : (
                filteredCategories.map((category) => {
                  const count = categoryCounts[category.id] ?? 0
                  return (
                    <div
                      key={category.id}
                      onClick={() => {
                        setSelectedCategoryId(category.id)
                        setListingSearch('')
                        setDistrictFilter('all')
                      }}
                      className="group flex items-center gap-3.5 p-3 sm:p-4 hover:bg-emerald-50/40 dark:hover:bg-muted/50 cursor-pointer transition-colors active:bg-emerald-100/40"
                    >
                      {/* Left: Circular / Rounded Category Image Avatar */}
                      <div className="relative shrink-0">
                        <img
                          src={category.imageUrl}
                          alt={category.name}
                          className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl object-cover ring-1 ring-border/50 shadow-xs group-hover:scale-105 transition-transform duration-200"
                        />
                        {count > 0 && (
                          <span className="sm:hidden absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1 text-[10px] font-bold text-white shadow-xs">
                            {count}
                          </span>
                        )}
                      </div>

                      {/* Middle: Name & Crop Examples */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-bold text-sm sm:text-base text-foreground tracking-tight group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                            {category.name}
                            <span className="ml-2 text-xs font-normal text-muted-foreground">
                              {lang === 'si' ? category.nameSi : lang === 'ta' ? category.nameTa : category.nameSi}
                            </span>
                          </h3>
                        </div>

                        {/* WhatsApp-Style Message Preview / Crop Examples */}
                        <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground line-clamp-1">
                          {lang === 'si' && category.examplesSi ? category.examplesSi : category.examples}
                        </p>
                      </div>

                      {/* Right: Available Listings Count Pill Badge + Chevron */}
                      <div className="flex items-center gap-2.5 shrink-0">
                        <span
                          className={`hidden sm:inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-xs font-bold transition-all shadow-xs ${
                            count > 0
                              ? 'bg-emerald-600 text-white'
                              : 'bg-muted text-muted-foreground font-medium'
                          }`}
                        >
                          {count > 0 ? `${count} ${lang === 'si' ? 'අස්වනු' : 'available'}` : '0 listings'}
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            SCREEN 2: FARMER LISTINGS WITHIN A CATEGORY (WHATSAPP CHAT-LIST ROWS)
            ========================================================================= */}
        {selectedCategoryId && activeCategory && (
          <div className="space-y-4">
            {/* Category Header Card */}
            <div className="rounded-2xl border border-emerald-600/20 bg-card p-4 sm:p-5 shadow-xs">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <img
                    src={activeCategory.imageUrl}
                    alt={activeCategory.name}
                    className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl object-cover ring-1 ring-border/50 shadow-xs"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
                        {activeCategory.name} Listings
                      </h1>
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 text-xs">
                        {displayedListings.length} {lang === 'si' ? 'අස්වනු' : 'harvests'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {lang === 'si' ? activeCategory.nameSi : lang === 'ta' ? activeCategory.nameTa : activeCategory.examples}
                    </p>
                  </div>
                </div>

                <Button
                  size="sm"
                  onClick={() => handleOpenPostModal(activeCategory.id)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm shrink-0"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {lang === 'si' ? 'මෙම කාණ්ඩයට එක්කරන්න' : 'List in this Category'}
                </Button>
              </div>

              {/* Search, Sort and Filter Bar */}
              <div className="mt-4 grid gap-2.5 sm:grid-cols-12">
                <div className="relative sm:col-span-5">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={listingSearch}
                    onChange={(e) => setListingSearch(e.target.value)}
                    placeholder={
                      lang === 'si'
                        ? `${activeCategory.name} තුළ සොයන්න (උදා: තක්කාලි, ප්‍රභේදය)...`
                        : `Search ${activeCategory.name} (e.g. Tomatoes, variety)...`
                    }
                    className="h-9 pl-9 text-xs sm:text-sm"
                  />
                  {listingSearch && (
                    <button
                      onClick={() => setListingSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                <div className="sm:col-span-3">
                  <Select value={districtFilter} onValueChange={setDistrictFilter}>
                    <SelectTrigger className="h-9 text-xs">
                      <MapPin className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="All districts" />
                    </SelectTrigger>
                    <SelectContent className="max-h-72">
                      <SelectItem value="all">All Districts</SelectItem>
                      {SRI_LANKAN_DISTRICTS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="sm:col-span-4">
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="h-9 text-xs">
                      <ArrowUpDown className="mr-1.5 h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="price_asc">Price: Low to High</SelectItem>
                      <SelectItem value="price_desc">Price: High to Low</SelectItem>
                      <SelectItem value="quantity_desc">Highest Quantity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Farmer Listings Container (Compact WhatsApp Rows) */}
            <div className="rounded-2xl border border-border/70 bg-card overflow-hidden shadow-xs divide-y divide-border/50">
              {loading ? (
                <div className="p-4 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3.5">
                      <Skeleton className="h-14 w-14 rounded-xl shrink-0" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-3 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-20 shrink-0" />
                    </div>
                  ))}
                </div>
              ) : displayedListings.length === 0 ? (
                <div className="py-12 px-4 text-center">
                  <EmptyState
                    icon={<Sprout className="h-8 w-8 text-emerald-600" />}
                    title={
                      lang === 'si'
                        ? `මෙම කාණ්ඩයේ අස්වනු නොමැත`
                        : `No listings found in ${activeCategory.name}`
                    }
                    description={
                      lang === 'si'
                        ? 'ඔබේ සෙවුම් පෙරහන වෙනස් කරන්න හෝ ප්‍රථමයෙන් ඔබේ අස්වැන්න ලැයිස්තුගත කරන්න.'
                        : 'Try adjusting your search criteria or be the first farmer to list your harvest in this category.'
                    }
                    action={
                      <Button
                        onClick={() => handleOpenPostModal(activeCategory.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white"
                      >
                        <Plus className="mr-1.5 h-4 w-4" />
                        {lang === 'si' ? 'අස්වැන්න ලැයිස්තුගත කරන්න' : 'List Harvest in ' + activeCategory.name}
                      </Button>
                    }
                  />
                </div>
              ) : (
                displayedListings.map((listing) => {
                  const isAvailable = listing.available && listing.status === 'AVAILABLE'
                  const gradeClass = listing.grade ? GRADE_BADGES[listing.grade] || 'bg-slate-100 text-slate-800' : ''
                  
                  return (
                    <div
                      key={listing.id}
                      onClick={() => openDetail('crop-detail', listing.id)}
                      className="group flex items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-emerald-50/40 dark:hover:bg-muted/50 cursor-pointer transition-colors active:bg-emerald-100/40"
                    >
                      {/* Left: Crop photo thumbnail */}
                      <div className="relative shrink-0 pt-0.5 sm:pt-0">
                        {listing.imageUrl ? (
                          <img
                            src={listing.imageUrl}
                            alt={listing.cropName}
                            className="h-14 w-14 sm:h-16 sm:w-16 rounded-xl object-cover ring-1 ring-border/50 shadow-xs group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )}
                        {!isAvailable && (
                          <span className="absolute -top-1 -right-1 flex h-4 px-1.5 items-center justify-center rounded-full bg-amber-600 text-[9px] font-bold text-white shadow-xs">
                            {listing.status}
                          </span>
                        )}
                      </div>

                      {/* Middle: Farmer & Crop Details */}
                      <div className="min-w-0 flex-1">
                        {/* Farmer Name + Date posted (WhatsApp style top line) */}
                        <div className="flex items-center justify-between gap-1 text-xs">
                          <span className="font-semibold text-foreground/90 truncate flex items-center gap-1">
                            <User className="h-3 w-3 text-muted-foreground" />
                            {listing.owner.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                            {timeAgo(listing.createdAt)}
                          </span>
                        </div>

                        {/* Crop Name & Variety */}
                        <div className="mt-0.5 flex flex-wrap items-baseline gap-1.5">
                          <h3 className="font-bold text-sm sm:text-base text-foreground group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                            {listing.cropName}
                          </h3>
                          {listing.variety && (
                            <span className="text-xs text-muted-foreground font-normal">
                              ({listing.variety})
                            </span>
                          )}
                          {listing.grade && (
                            <Badge variant="outline" className={`h-4.5 px-1.5 text-[10px] ${gradeClass}`}>
                              {listing.grade}
                            </Badge>
                          )}
                        </div>

                        {/* Location, Quantity & Harvest date */}
                        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 font-medium text-foreground/80">
                            <MapPin className="h-3 w-3 text-emerald-600" />
                            {listing.district || 'Sri Lanka'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Scale className="h-3 w-3 text-muted-foreground" />
                            {listing.quantity.toLocaleString()} {listing.unit}
                          </span>
                          {listing.expectedHarvestDate && (
                            <span className="hidden sm:inline-flex items-center gap-1 text-[11px]">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              Harvest: {formatDate(listing.expectedHarvestDate)}
                            </span>
                          )}
                        </div>

                        {/* Description Preview (WhatsApp style preview) */}
                        {listing.description && (
                          <p className="mt-1 text-xs text-muted-foreground/80 line-clamp-1 italic">
                            "{listing.description}"
                          </p>
                        )}
                      </div>

                      {/* Right: Price per Unit & Chevron */}
                      <div className="flex flex-col items-end justify-center self-center shrink-0 pl-1 sm:pl-2">
                        {listing.askingPrice ? (
                          <div className="text-right">
                            <div className="font-extrabold text-sm sm:text-base text-emerald-700 dark:text-emerald-400">
                              {money(listing.askingPrice)}
                            </div>
                            <div className="text-[10px] text-muted-foreground -mt-0.5">
                              {listing.priceUnit || `per ${listing.unit}`}
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">
                            {lang === 'si' ? 'මිල සාකච්ඡා කළ හැක' : 'Negotiable'}
                          </span>
                        )}

                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-foreground group-hover:translate-x-0.5 transition-all mt-1 hidden sm:block" />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            POSTING MODAL: "LIST YOUR HARVEST"
            ========================================================================= */}
        <Dialog open={postModalOpen} onOpenChange={setPostModalOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex items-center gap-2 text-emerald-600 font-semibold text-xs uppercase tracking-wider">
                <Sprout className="h-4 w-4" />
                {lang === 'si' ? 'නව අස්වනු දැන්වීමක්' : 'New Harvest Listing'}
              </div>
              <DialogTitle className="text-xl font-bold">
                {lang === 'si' ? 'ඔබේ අස්වැන්න ලැයිස්තුගත කරන්න' : 'List Your Harvest on GoviSahana'}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {lang === 'si'
                  ? 'දිවයින පුරා ගැනුම්කරුවන් සහ තොග වෙළඳුන් සමඟ සෘජුව ගනුදෙනු කිරීමට තොරතුරු ඇතුළත් කරන්න.'
                  : 'Enter your harvest details to connect with buyers, exporters, and wholesale traders directly.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateListing} className="space-y-4 pt-2">
              {/* Category & Crop Name */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold">
                    {lang === 'si' ? 'බෝග කාණ්ඩය' : 'Crop Category'} *
                  </Label>
                  <Select
                    value={formData.category}
                    onValueChange={(val) => setFormData({ ...formData, category: val })}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CROP_CATEGORIES.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name} ({lang === 'si' ? c.nameSi : c.name})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">
                    {lang === 'si' ? 'බෝගයේ නම' : 'Crop Name'} *
                  </Label>
                  <Input
                    required
                    value={formData.cropName}
                    onChange={(e) => setFormData({ ...formData, cropName: e.target.value })}
                    placeholder="e.g. Tomatoes, Fresh Coconuts, Paddy..."
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              {/* Suggestions Chips based on selected category */}
              {formData.category && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground mr-1">Quick pick:</span>
                  {(CROP_CATEGORIES.find((c) => c.id === formData.category)?.commonCrops || []).map((cropItem) => (
                    <button
                      key={cropItem}
                      type="button"
                      onClick={() => setFormData({ ...formData, cropName: cropItem })}
                      className="text-[11px] px-2 py-0.5 rounded-full border border-border bg-muted/40 hover:bg-emerald-50 hover:border-emerald-300 text-muted-foreground hover:text-emerald-700 transition-colors"
                    >
                      {cropItem}
                    </button>
                  ))}
                </div>
              )}

              {/* Variety & Grade */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold">
                    {lang === 'si' ? 'ප්‍රභේදය' : 'Variety'}
                  </Label>
                  <Input
                    value={formData.variety}
                    onChange={(e) => setFormData({ ...formData, variety: e.target.value })}
                    placeholder="e.g. Thilina Hybrid, CRIC60, Granola..."
                    className="mt-1 h-9 text-xs"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">
                    {lang === 'si' ? 'ශ්‍රේණිය' : 'Quality Grade'}
                  </Label>
                  <Select
                    value={formData.grade}
                    onValueChange={(val) => setFormData({ ...formData, grade: val })}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue placeholder="Select Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      {CROP_GRADES.map((g) => (
                        <SelectItem key={g} value={g}>{g}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Quantity & Unit */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold">
                    {lang === 'si' ? 'ලබාගත හැකි ප්‍රමාණය' : 'Available Quantity'} *
                  </Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      required
                      type="number"
                      step="any"
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                      placeholder="e.g. 500"
                      className="h-9 text-xs flex-1"
                    />
                    <Select
                      value={formData.unit}
                      onValueChange={(val) => setFormData({ ...formData, unit: val, priceUnit: `per ${val}` })}
                    >
                      <SelectTrigger className="h-9 w-28 text-xs">
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

                {/* Asking Price & Price Unit */}
                <div>
                  <Label className="text-xs font-semibold">
                    {lang === 'si' ? 'මිල (රුපියල්)' : 'Asking Price (LKR)'}
                  </Label>
                  <div className="mt-1 flex gap-2">
                    <Input
                      type="number"
                      step="any"
                      min="0"
                      value={formData.askingPrice}
                      onChange={(e) => setFormData({ ...formData, askingPrice: e.target.value })}
                      placeholder="e.g. 250"
                      className="h-9 text-xs flex-1"
                    />
                    <Select
                      value={formData.priceUnit}
                      onValueChange={(val) => setFormData({ ...formData, priceUnit: val })}
                    >
                      <SelectTrigger className="h-9 w-32 text-xs">
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

              {/* District & Expected Harvest Date */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label className="text-xs font-semibold">
                    {lang === 'si' ? 'දිස්ත්‍රික්කය' : 'Farm District'} *
                  </Label>
                  <Select
                    value={formData.district}
                    onValueChange={(val) => setFormData({ ...formData, district: val })}
                  >
                    <SelectTrigger className="mt-1 h-9 text-xs">
                      <SelectValue placeholder="Select District" />
                    </SelectTrigger>
                    <SelectContent className="max-h-60">
                      {SRI_LANKAN_DISTRICTS.map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-xs font-semibold">
                    {lang === 'si' ? 'අපේක්ෂිත අස්වනු දිනය' : 'Expected Harvest Date'}
                  </Label>
                  <Input
                    type="date"
                    value={formData.expectedHarvestDate}
                    onChange={(e) => setFormData({ ...formData, expectedHarvestDate: e.target.value })}
                    className="mt-1 h-9 text-xs"
                  />
                </div>
              </div>

              {/* Crop Photo URL + Preset Chips */}
              <div>
                <Label className="text-xs font-semibold">
                  {lang === 'si' ? 'බෝගයේ ඡායාරූපය' : 'Crop Photo'}
                </Label>
                <Input
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://images.unsplash.com/..."
                  className="mt-1 h-9 text-xs"
                />

                {/* Preset Photo Selector */}
                <div className="mt-2">
                  <span className="text-[11px] text-muted-foreground block mb-1">
                    Select a preset photo for fast listing:
                  </span>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {PRESET_CROP_PHOTOS.slice(0, 10).map((preset) => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setFormData({ ...formData, imageUrl: preset.url })}
                        className={`flex flex-col items-center shrink-0 p-1 rounded-lg border transition-all ${
                          formData.imageUrl === preset.url
                            ? 'border-emerald-600 bg-emerald-50 ring-2 ring-emerald-500/20'
                            : 'border-border/60 hover:border-emerald-300'
                        }`}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="h-10 w-10 rounded-md object-cover"
                        />
                        <span className="text-[9px] text-muted-foreground mt-0.5 max-w-[50px] truncate">
                          {preset.label}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-xs font-semibold">
                  {lang === 'si' ? 'විස්තරය සහ ගුණාත්මකභාවය' : 'Description & Quality Information'}
                </Label>
                <Textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Provide details about quality, irrigation method, packaging, transport availability, or minimum order quantity..."
                  className="mt-1 text-xs"
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setPostModalOpen(false)}
                  disabled={submittingPost}
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submittingPost}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  size="sm"
                >
                  {submittingPost
                    ? 'Publishing…'
                    : lang === 'si' ? 'අස්වැන්න පළකරන්න' : 'Publish Harvest'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}
