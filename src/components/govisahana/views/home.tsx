'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { useT, useLang } from '@/lib/use-t'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SectionHeader } from '@/components/govisahana/common'
import { VerifiedBadge } from '@/components/govisahana/badges'
import {
  Sprout, Search, Stethoscope, Store, ShoppingBasket, HardHat, GraduationCap,
  ShieldCheck, MessageSquare, Image as ImageIcon, CalendarCheck,
  ArrowRight, Leaf, Users, TrendingUp, MapPin, BookOpen, Star,
} from 'lucide-react'

type Expert = {
  id: string; title?: string; expertise?: string; bio?: string; rating?: number;
  serviceAreas?: string; verified: boolean; languages?: string;
  user: { id: string; name: string; avatarUrl?: string | null }
}
type Article = { id: string; title: string; summary: string; category?: string; authorName?: string }

export default function HomeView() {
  const { setView, openDetail, user } = useApp()
  const { lang } = useLang()
  const t = useT()
  const [experts, setExperts] = useState<Expert[]>([])
  const [articles, setArticles] = useState<Article[]>([])

  useEffect(() => {
    fetch('/api/experts?verified=true').then((r) => r.json()).then((d) => setExperts((d.experts || []).slice(0, 3))).catch(() => {})
    fetch('/api/knowledge').then((r) => r.json()).then((d) => setArticles((d.articles || []).slice(0, 3))).catch(() => {})
  }, [])

  const services = [
    {
      icon: Stethoscope,
      title: lang === 'si' ? 'විශේෂඥ උපදේශන' : lang === 'ta' ? 'விவசாய ஆலோசனைகள்' : 'Expert Consultations',
      desc: lang === 'si' ? 'ඕනෑම බෝග ගැටලුවක් සඳහා කෘෂිකර්ම නිලධාරීන්, පර්යේෂකයන් සහ උපදේශකයන්ගෙන් සත්‍යාපිත උපදෙස් ලබා ගන්න.' : lang === 'ta' ? 'எந்தவொரு பயிர் பிரச்சினைக்கும் வேளாண் அதிகாரிகள் மற்றும் ஆராய்ச்சியாளர்களிடமிருந்து சரிபார்க்கப்பட்ட ஆலோசனைகளைப் பெறுங்கள்.' : 'Get verified advice from agricultural officers, researchers and consultants for any crop problem.',
      view: 'experts' as const,
    },
    {
      icon: Store,
      title: t('nav.marketplace'),
      desc: lang === 'si' ? 'විශ්වාසනීය ව්‍යවසායන්ගෙන් උසස් බීජ, පොහොර සහ උපකරණ මිලදී ගන්න.' : lang === 'ta' ? 'நம்பகமான நிறுவனங்களிடமிருந்து தரமான விதைகள், உரம் மற்றும் உபகரணங்களை வாங்குக.' : 'Buy seeds, fertilizer, equipment and irrigation supplies from verified enterprises.',
      view: 'marketplace' as const,
    },
    {
      icon: ShoppingBasket,
      title: lang === 'si' ? 'අස්වැන්න වෙළඳාම' : lang === 'ta' ? 'பயிர் வர்த்தகம்' : 'Crop Trading',
      desc: lang === 'si' ? 'ඔබේ අස්වැන්න සෘජුවම තොග වෙළෙන්දන්, අපනයනකරුවන් සහ ගැණුම්කරුවන්ට විකුණන්න.' : lang === 'ta' ? 'உங்கள் அறுவடையை நேரடியாக மொத்த வியாபாரிகள் மற்றும் வாங்குபவர்களுக்கு விற்கவும்.' : 'List your harvest and connect directly with wholesalers, exporters and buyers.',
      view: 'crops' as const,
    },
    {
      icon: HardHat,
      title: lang === 'si' ? 'සේවකයන් සහ යන්ත්‍රෝපකරණ' : lang === 'ta' ? 'தொழிலாளர்கள் & இயந்திரங்கள்' : 'Workers & Machinery',
      desc: lang === 'si' ? 'අස්වනු නෙලීම සහ වගා කටයුතු සඳහා කුසලතා සහිත කෘෂි සේවකයන් සහ යන්ත්‍ර කුලියට ලබා ගන්න.' : lang === 'ta' ? 'அறுவடை மற்றும் சாகுபடிக்கு திறமையான தொழிலாளர்கள் மற்றும் வாடகை இயந்திரங்களைக் கண்டறியவும்.' : 'Find skilled farm labour and rent machinery for harvesting and cultivation.',
      view: 'jobs' as const,
    },
  ]

  const steps = [
    {
      icon: ImageIcon,
      title: lang === 'si' ? 'ගැටලුව වාර්තා කරන්න' : lang === 'ta' ? 'பிரச்சினையைப் புகாரளிக்கவும்' : 'Report your problem',
      desc: lang === 'si' ? 'රෝග ලක්ෂණ විස්තර කර බලපෑමට ලක් වූ බෝගවල ඡායාරූප උඩුගත කරන්න.' : lang === 'ta' ? 'அறிகுறிகளை விவரித்து பாதிக்கப்பட்ட பயிர்களின் புகைப்படங்களைப் பதிவேற்றவும்.' : 'Describe symptoms and upload photos of affected crops.',
    },
    {
      icon: Search,
      title: lang === 'si' ? 'විශේෂඥයෙකු හා සම්බන්ධ වන්න' : lang === 'ta' ? 'நிபுணருடன் இணையுங்கள்' : 'Match with an expert',
      desc: lang === 'si' ? 'බෝගය, විශේෂඥ දැනුම සහ ප්‍රදේශය අනුව අපි ඔබව සත්‍යාපිත විශේෂඥයන් හා සම්බන්ධ කරමු.' : lang === 'ta' ? 'பயிர் மற்றும் பகுதி அடிப்படையில் சரிபார்க்கப்பட்ட நிபுணர்களுடன் இணைக்கிறோம்.' : 'We connect you to verified experts by crop, expertise and location.',
    },
    {
      icon: MessageSquare,
      title: lang === 'si' ? 'උපදෙස් සහ පසු විපරම්' : lang === 'ta' ? 'ஆலோசனை & பின்தொடர்தல்' : 'Get advice & follow up',
      desc: lang === 'si' ? 'ආරක්ෂිතව පණිවිඩ හුවමාරු කරගන්න, ව්‍යුහගත නිර්දේශ ලබා ගන්න සහ ප්‍රගතිය නිරීක්ෂණය කරන්න.' : lang === 'ta' ? 'பாதுகாப்பாக உரையாடி, பரிந்துரைகளைப் பெற்று முன்னேற்றத்தைக் கண்காணியுங்கள்.' : 'Chat securely, receive structured recommendations and track progress.',
    },
    {
      icon: CalendarCheck,
      title: lang === 'si' ? 'විසඳා දියුණු වන්න' : lang === 'ta' ? 'தீர்த்து மேம்படுத்துங்கள்' : 'Resolve & improve',
      desc: lang === 'si' ? 'උපදෙස් ක්‍රියාත්මක කර ගැටලුව විසඳා ගන්න, සම්පූර්ණ ඉතිහාස සටහනක් තබා ගන්න.' : lang === 'ta' ? 'ஆலோசனையைப் பயன்படுத்தி தீர்வு கண்டு, முழுமையான வரலாற்றை வைத்திருக்கவும்.' : 'Apply advice, mark resolved, and keep a complete case history.',
    },
  ]

  const roles = [
    { icon: Sprout, key: 'FARMER', color: 'bg-emerald-50 text-emerald-700' },
    { icon: GraduationCap, key: 'EXPERT', color: 'bg-violet-50 text-violet-700' },
    { icon: Store, key: 'ENTERPRISE', color: 'bg-amber-50 text-amber-700' },
    { icon: HardHat, key: 'WORKER', color: 'bg-orange-50 text-orange-700' },
    { icon: ShoppingBasket, key: 'BUYER', color: 'bg-cyan-50 text-cyan-700' },
  ]

  return (
    <div>
      {/* HERO */}
      <section className="gs-hero-gradient relative overflow-hidden">
        <div className="gs-pattern absolute inset-0 opacity-60" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:py-24">
          <div className="space-y-6">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
              <Leaf className="h-3.5 w-3.5" /> {t('brand.builtFor')}
            </span>
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              {t('welcome.title').split(t('welcome.titleHighlight'))[0]}
              <span className="text-primary">{t('welcome.titleHighlight')}</span>
              {t('welcome.title').split(t('welcome.titleHighlight'))[1] || ''}
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground leading-relaxed">
              {t('welcome.subtitle')}
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" onClick={() => setView('experts')} className="bg-primary hover:bg-primary/90">
                <Search className="mr-2 h-4 w-4" /> {t('nav.findExperts')}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setView(user ? 'dashboard' : 'register')}>
                <Stethoscope className="mr-2 h-4 w-4" /> {user ? t('nav.dashboard') : t('dash.reportProblem')}
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><Users className="h-4 w-4 text-primary" /> {t('welcome.trustRoles')}</span>
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-primary" /> {t('nav.verifiedProf')}</span>
              <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-primary" /> {t('welcome.trustDistricts')}</span>
            </div>
          </div>
          <div className="relative">
            <div className="overflow-hidden rounded-2xl border border-border shadow-xl">
              <img src="/hero-paddy.png" alt="Sri Lankan paddy farmer" className="h-full w-full object-cover" />
            </div>
            <div className="absolute -bottom-4 -left-4 hidden rounded-xl border border-border bg-card p-3 shadow-lg sm:block">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700"><TrendingUp className="h-4 w-4" /></span>
                <div>
                  <div className="text-xs text-muted-foreground">{lang === 'si' ? 'විසඳන ලද ගැටලු' : lang === 'ta' ? 'தீர்க்கப்பட்ட பிரச்சினைகள்' : 'Cases resolved'}</div>
                  <div className="text-sm font-bold">{lang === 'si' ? 'සෑම උපදේශනයක්ම නිරීක්ෂණය කරන්න' : lang === 'ta' ? 'ஒவ்வொரு ஆலோசனையையும் கண்காணியுங்கள்' : 'Track every consultation'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK ACTIONS */}
      <section className="border-b border-border bg-card">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-2 px-4 py-3 sm:px-6 md:grid-cols-5">
          {[
            { label: t('nav.findExperts'), icon: Search, view: 'experts' as const },
            { label: t('dash.reportProblem'), icon: Stethoscope, view: 'register' as const },
            { label: t('nav.marketplace'), icon: Store, view: 'marketplace' as const },
            { label: t('footer.findBuyers'), icon: ShoppingBasket, view: 'crops' as const },
            { label: t('nav.jobs'), icon: HardHat, view: 'jobs' as const },
          ].map((a) => (
            <button key={a.view} onClick={() => setView(a.view)} className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5 text-sm font-medium transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary">
              <a.icon className="h-4 w-4" /> <span className="truncate">{a.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* SERVICES */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <SectionHeader
          center
          eyebrow={lang === 'si' ? 'අප සපයන සේවාවන්' : lang === 'ta' ? 'நாம் வழங்குபவை' : 'What we offer'}
          title={lang === 'si' ? 'ශ්‍රී ලාංකේය කෘෂිකර්මාන්තයට අවශ්‍ය සියල්ල එකම වේදිකාවකින්' : lang === 'ta' ? 'இலங்கை விவசாயத்திற்குத் தேவையான அனைத்தும் ஒரே தளத்தில்' : 'Everything Sri Lankan agriculture needs, in one platform'}
          description={lang === 'si' ? 'විශේෂඥ උපදෙස්වල සිට මිලදී ගැනීම් සහ අලෙවිය දක්වා — GoviSahana සමස්ත කෘෂි පද්ධතියම එකට එක් කරයි.' : lang === 'ta' ? 'நிபுணர் ஆலோசனை முதல் வாங்குதல் மற்றும் விற்பனை வரை — GoviSahana முழு விவசாய சூழலையும் ஒன்றிணைக்கிறது.' : 'From expert advice to buying and selling — GoviSahana brings the whole ecosystem together.'}
        />
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {services.map((s) => (
            <Card key={s.title} className="group cursor-pointer transition-shadow hover:shadow-md" onClick={() => setView(s.view)}>
              <CardHeader>
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <s.icon className="h-5 w-5" />
                </span>
                <CardTitle className="mt-3 text-lg">{s.title}</CardTitle>
                <CardDescription className="leading-relaxed">{s.desc}</CardDescription>
              </CardHeader>
              <CardContent>
                <span className="inline-flex items-center gap-1 text-sm font-medium text-primary group-hover:gap-2 transition-all">
                  {t('common.explore')} <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-y border-border bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeader
            center
            eyebrow={lang === 'si' ? 'ක්‍රියාකාරීත්වය' : lang === 'ta' ? 'இது எவ்வாறு செயல்படுகிறது' : 'How it works'}
            title={lang === 'si' ? 'පියවර හතරකින් ගැටලුවට නිසි විසඳුම' : lang === 'ta' ? 'நான்கு படிகளில் பிரச்சினை முதல் தீர்வு வரை' : 'From problem to resolution in four steps'}
            description={lang === 'si' ? 'විධිමත් ක්‍රියාවලියක් මඟින් ගොවීන්ට නිශ්චිත සහ ප්‍රායෝගික විශේෂඥ උපදෙස් හිමිවීම තහවුරු කරයි.' : lang === 'ta' ? 'தெளிவான வழிமுறை விவசாயிகள் உண்மையான ஆலோசனையைப் பெறுவதை உறுதி செய்கிறது.' : 'A clear, tracked workflow ensures farmers get real advice — not guesswork.'}
          />
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((s, i) => (
              <div key={s.title} className="relative rounded-xl border border-border bg-card p-5">
                <span className="absolute -top-3 left-5 flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{i + 1}</span>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><s.icon className="h-5 w-5" /></span>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED EXPERTS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <SectionHeader
            eyebrow={lang === 'si' ? 'විශ්වාසනීය වෘත්තිකයන්' : lang === 'ta' ? 'நம்பகமான நிபுணர்கள்' : 'Trusted professionals'}
            title={lang === 'si' ? 'විශේෂාංග සත්‍යාපිත විශේෂඥයන්' : lang === 'ta' ? 'சிறப்பம்ச சரிபார்க்கப்பட்ட நிபுணர்கள்' : 'Featured verified experts'}
            description={lang === 'si' ? 'ඔබට සහාය වීමට සූදානම් කෘෂිකර්ම නිලධාරීන්, පර්යේෂකයන් සහ උපදේශකයන්.' : lang === 'ta' ? 'உதவத் தயாராக உள்ள வேளாண் அதிகாரிகள், ஆராய்ச்சியாளர்கள் மற்றும் ஆலோசகர்கள்.' : 'Agricultural officers, researchers and consultants ready to help.'}
          />
          <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => setView('experts')}>
            {t('common.viewAll')} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {experts.length === 0 ? (
            [0, 1, 2].map((i) => <div key={i} className="h-56 animate-pulse rounded-xl border border-border bg-muted/40" />)
          ) : experts.map((e) => (
            <Card key={e.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => openDetail('expert-detail', e.id)}>
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <Avatar className="h-14 w-14">
                    <AvatarImage src={e.user.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">{e.user.name.split(' ').map((s) => s[0]).slice(0, 2).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate font-semibold">{e.user.name}</h3>
                    </div>
                    <p className="truncate text-sm text-muted-foreground">{e.title || t('role.EXPERT')}</p>
                    <div className="mt-1.5"><VerifiedBadge verified={e.verified} /></div>
                  </div>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{e.bio || e.expertise || (lang === 'si' ? 'සත්‍යාපිත කෘෂිකාර්මික වෘත්තිකයා.' : lang === 'ta' ? 'சரிபார்க்கப்பட்ட வேளாண் நிபுணர்.' : 'Verified agricultural professional.')}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {(e.expertise || '').split(',').filter(Boolean).slice(0, 3).map((item) => (
                    <span key={item} className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{item.trim()}</span>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {(e.serviceAreas || 'Sri Lanka').split(',')[0]}</span>
                  {e.rating ? <span className="flex items-center gap-1"><Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {e.rating}</span> : null}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* JOIN AS */}
      <section className="border-y border-border bg-primary text-primary-foreground">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <SectionHeader
            center
            title={`${t('welcome.joinAs')} GoviSahana`}
            className="[&_h2]:text-primary-foreground [&_p]:text-primary-foreground/80"
          />
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {roles.map((r) => (
              <button key={r.key} onClick={() => setView('register')} className="rounded-xl border border-primary-foreground/15 bg-primary-foreground/5 p-5 text-left backdrop-blur-sm transition-colors hover:bg-primary-foreground/10">
                <span className={`flex h-10 w-10 items-center justify-center rounded-lg ${r.color}`}><r.icon className="h-5 w-5" /></span>
                <h3 className="mt-3 font-semibold text-primary-foreground">{t('role.' + r.key)}</h3>
                <p className="mt-1 text-sm text-primary-foreground/70">{t('role.' + r.key + '.desc')}</p>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* KNOWLEDGE HUB PREVIEW */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="flex items-end justify-between gap-4">
          <SectionHeader
            eyebrow={t('nav.knowledge')}
            title={lang === 'si' ? 'කෘෂිකාර්මික සම්පත්වලින් දැනුම ලබන්න' : lang === 'ta' ? 'விவசாய வளங்களிலிருந்து கற்றுக்கொள்ளுங்கள்' : 'Learn from agricultural resources'}
            description={lang === 'si' ? 'පළිබෝධ, රෝග, පස සහ වගාව පිළිබඳ ප්‍රායෝගික විශේෂඥ ලිපි.' : lang === 'ta' ? 'பூச்சிகள், நோய்கள், மண் மற்றும் சாகுபடி குறித்த நிபுணர்களின் நடைமுறைக் கட்டுரைகள்.' : 'Practical articles from experts on pests, diseases, soil and cultivation.'}
          />
          <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => setView('knowledge')}>
            {lang === 'si' ? 'සියල්ල බලන්න' : lang === 'ta' ? 'அனைத்தையும் பார்' : 'Browse all'} <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {articles.length === 0 ? [0, 1, 2].map((i) => <div key={i} className="h-44 animate-pulse rounded-xl border border-border bg-muted/40" />) :
            articles.map((a) => (
              <Card key={a.id} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => openDetail('article', a.id)}>
                <CardContent className="p-5">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5 text-primary" />
                    {a.category || 'Article'}
                  </div>
                  <h3 className="mt-2 font-semibold leading-snug line-clamp-2">{a.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-3 leading-relaxed">{a.summary}</p>
                  <div className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">{lang === 'si' ? 'කර්තෘ' : lang === 'ta' ? 'ஆசிரியர்' : 'By'} {a.authorName || 'GoviSahana'}</div>
                </CardContent>
              </Card>
            ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 sm:p-12">
          <img src="/agri-landscape.png" alt="" className="absolute inset-0 h-full w-full object-cover opacity-10" />
          <div className="relative space-y-4 text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {lang === 'si' ? 'ඔබේ ගොවිපළ නවීකරණය කිරීමට සූදානම්ද?' : lang === 'ta' ? 'உங்கள் பண்ணையை நவீனமயமாக்கத் தயாரா?' : 'Ready to modernise your farm?'}
            </h2>
            <p className="mx-auto max-w-xl text-muted-foreground">
              {lang === 'si' ? 'සත්‍යාපිත උපදෙස්, උසස් ආදාන සහ සාධාරණ වෙළඳපොළ අවස්ථා ලබන දහස් ගණනක් ශ්‍රී ලාංකික ගොවීන් සමඟ එක්වන්න.' : lang === 'ta' ? 'சரிபார்க்கப்பட்ட ஆலோசனை, தரமான உள்ளீடுகள் மற்றும் நியாயமான சந்தை அணுகலைப் பெறும் ஆயிரக்கணக்கான இலங்கை விவசாயிகளுடன் இணையுங்கள்.' : 'Join thousands of Sri Lankan farmers getting verified advice, quality inputs and fair market access.'}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button size="lg" onClick={() => setView('register')} className="bg-primary hover:bg-primary/90">
                {t('welcome.createAccount')}
              </Button>
              <Button size="lg" variant="outline" onClick={() => setView('about')}>
                {t('nav.about')}
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
