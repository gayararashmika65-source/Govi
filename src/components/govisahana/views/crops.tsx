'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { useT, useLang } from '@/lib/use-t'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { SectionHeader, EmptyState, money, formatDate } from '@/components/govisahana/common'
import { SRI_LANKAN_DISTRICTS, COMMON_CROPS } from '@/lib/types'
import {
  ShoppingBasket, Search, MapPin, Sprout, Image as ImageIcon, ArrowLeft, Calendar, User,
} from 'lucide-react'

type Crop = {
  id: string
  cropName: string
  variety?: string | null
  quantity?: number | null
  unit?: string | null
  expectedHarvestDate?: string | null
  district?: string | null
  askingPrice?: number | null
  grade?: string | null
  imageUrl?: string | null
  available?: boolean
  owner: { id: string; name: string }
}

const GRADE_TONES: Record<string, string> = {
  A: 'bg-emerald-100 text-emerald-700',
  B: 'bg-amber-100 text-amber-700',
  C: 'bg-slate-100 text-slate-700',
  Premium: 'bg-emerald-100 text-emerald-700',
}

export default function CropsView() {
  const { openDetail, setView } = useApp()
  const { lang } = useLang()
  const t = useT()
  const [crops, setCrops] = useState<Crop[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [district, setDistrict] = useState('all')
  const [crop, setCrop] = useState('all')

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (district !== 'all') params.set('district', district)
    if (crop !== 'all') params.set('crop', crop)
    fetch(`/api/crops?${params.toString()}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => setCrops(d.crops || []))
      .catch(() => setCrops([]))
      .finally(() => setLoading(false))
  }, [q, district, crop])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <Button variant="ghost" size="sm" onClick={() => setView('home')} className="mb-4 text-muted-foreground">
        <ArrowLeft className="mr-2 h-4 w-4" /> {t('nav.home')}
      </Button>

      <SectionHeader
        eyebrow={lang === 'si' ? 'අස්වැන්න වෙළඳාම' : lang === 'ta' ? 'பயிர் வர்த்தகம்' : 'Crop Trading'}
        title={lang === 'si' ? 'ශ්‍රී ලාංකික ගොවීන්ගෙන් සෘජු අස්වැන්න' : lang === 'ta' ? 'இலங்கை விவசாயிகளிடமிருந்து நேரடி அறுவடைகள்' : 'Harvests direct from Sri Lankan farmers'}
        description={lang === 'si' ? 'දිස්ත්‍රික්කය, ශ්‍රේණිය සහ අස්වනු දිනය අනුව බෝග සොයන්න. වගාකරු හා සෘජුවම සම්බන්ධ වන්න.' : lang === 'ta' ? 'மாவட்டம், தரம் மற்றும் அறுவடை தேதி அடிப்படையில் பயிர்களை உலாவுங்கள். விவசாயியுடன் நேரடியாக இணையுங்கள்.' : 'Browse available crops by district, grade and harvest date. Connect directly with the grower.'}
      />

      {/* Filters */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === 'si' ? 'බෝගයේ නම සොයන්න…' : lang === 'ta' ? 'பயிர் பெயரைத் தேடுங்கள்…' : 'Search crop name…'}
            className="pl-9"
          />
        </div>
        <Select value={district} onValueChange={setDistrict}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={lang === 'si' ? 'සියලු දිස්ත්‍රික්ක' : lang === 'ta' ? 'அனைத்து மாவட்டங்களும்' : 'All districts'} />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="all">{lang === 'si' ? 'සියලු දිස්ත්‍රික්ක' : lang === 'ta' ? 'அனைத்து மாவட்டங்களும்' : 'All districts'}</SelectItem>
            {SRI_LANKAN_DISTRICTS.map((d) => (
              <SelectItem key={d} value={d}>{d}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={crop} onValueChange={setCrop}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={lang === 'si' ? 'සියලු බෝග' : lang === 'ta' ? 'அனைத்து பயிர்களும்' : 'All crops'} />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            <SelectItem value="all">{lang === 'si' ? 'සියලු බෝග' : lang === 'ta' ? 'அனைத்து பயிர்களும்' : 'All crops'}</SelectItem>
            {COMMON_CROPS.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      <div className="mt-8">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {[...Array(8)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-[4/3] w-full rounded-none" />
                <CardContent className="space-y-2 p-4">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-6 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : crops.length === 0 ? (
          <EmptyState
            icon={<ShoppingBasket className="h-6 w-6" />}
            title={lang === 'si' ? 'අස්වැන්න ලැයිස්තුගත කර නැත' : lang === 'ta' ? 'பயிர்கள் எதுவும் பட்டியலிடப்படவில்லை' : 'No crops listed'}
            description={lang === 'si' ? 'සෙවුම හෝ පෙරහන් වෙනස් කර නැවත බලන්න. ගොවීන්ට ඔවුන්ගේ අස්වැන්න උපකරණ පුවරුවෙන් ලැයිස්තුගත කළ හැක.' : lang === 'ta' ? 'தேடல் அல்லது வடிகட்டிகளை மாற்றிப் பார்க்கவும். விவசாயிகள் தங்கள் அறுவடைகளை கட்டுப்பாட்டுப் பலகையிலிருந்து பட்டியலிடலாம்.' : 'Try adjusting your search or filters. Farmers can list their harvests from the dashboard.'}
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {crops.map((c) => (
              <Card
                key={c.id}
                onClick={() => openDetail('crop-detail', c.id)}
                className="group cursor-pointer overflow-hidden transition-shadow hover:shadow-md"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-muted/40">
                  {c.imageUrl ? (
                    <img
                      src={c.imageUrl}
                      alt={c.cropName}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground/40">
                      <ImageIcon className="h-10 w-10" />
                    </div>
                  )}
                  {c.grade && (
                    <Badge className={`absolute left-2 top-2 border-transparent ${GRADE_TONES[c.grade] || 'bg-primary/90 text-primary-foreground'}`}>
                      {lang === 'si' ? 'ශ්‍රේණිය' : lang === 'ta' ? 'தரம்' : 'Grade'} {c.grade}
                    </Badge>
                  )}
                </div>
                <CardContent className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="line-clamp-1 font-semibold leading-tight">{c.cropName}</h3>
                      {c.variety ? <p className="text-xs text-muted-foreground">{c.variety}</p> : null}
                    </div>
                  </div>
                  <div className="flex items-baseline justify-between pt-1">
                    <span className="text-lg font-bold text-primary">
                      {c.askingPrice ? (
                        <>
                          {money(c.askingPrice)}
                          <span className="ml-1 text-xs font-medium text-muted-foreground">/ {c.unit || 'kg'}</span>
                        </>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">{lang === 'si' ? 'මිල සාකච්ඡා කළ හැක' : lang === 'ta' ? 'பேசித் தீர்மானிக்கலாம்' : 'Price on request'}</span>
                      )}
                    </span>
                    {c.quantity ? (
                      <span className="text-xs font-medium text-muted-foreground">
                        {c.quantity.toLocaleString()} {c.unit || 'kg'}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-center justify-between border-t border-border pt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3" /> {c.district || 'Sri Lanka'}
                    </span>
                    <span className="flex items-center gap-1 truncate">
                      <User className="h-3 w-3" /> {c.owner.name}
                    </span>
                  </div>
                  {c.expectedHarvestDate && (
                    <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{lang === 'si' ? 'අස්වනු දිනය' : lang === 'ta' ? 'அறுவடை தேதி' : 'Harvest'}: {formatDate(c.expectedHarvestDate)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
