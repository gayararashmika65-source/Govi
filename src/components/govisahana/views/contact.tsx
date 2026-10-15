'use client'
import { useState, type FormEvent } from 'react'
import { useApp, api } from '@/lib/store'
import { useT, useLang } from '@/lib/use-t'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Accordion, AccordionItem, AccordionTrigger, AccordionContent,
} from '@/components/ui/accordion'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { SectionHeader } from '@/components/govisahana/common'
import { toast } from 'sonner'
import { MapPin, Phone, Mail, Clock, Send, AlertTriangle, Leaf } from 'lucide-react'

export default function ContactView() {
  const { setView } = useApp()
  const { lang } = useLang()
  const t = useT()
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' })
  const [submitting, setSubmitting] = useState(false)

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast.error('Please fill in all fields before sending.')
      return
    }
    setSubmitting(true)
    try {
      await api('/api/contact', { method: 'POST', body: JSON.stringify(form) })
      toast.success('Thank you! Your message has been received. Our team will respond within 48 hours.')
      setForm({ name: '', email: '', subject: '', message: '' })
    } catch (err) {
      toast.error((err as Error).message || 'Failed to send message. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const contactInfo = [
    { icon: MapPin, label: t('contact.address'), value: 'Dalugama, Kelaniya, Sri Lanka' },
    { icon: Phone, label: t('contact.phone'), value: '074 121 6582' },
    { icon: Mail, label: t('contact.email'), value: 'govisahana.srilanka@gmail.com' },
    { icon: Clock, label: t('contact.officeHours'), value: t('contact.officeHoursVal') },
  ]

  const faqsByLang = {
    en: [
      {
        q: 'Is farmer registration free?',
        a: 'Yes. Creating a GoviSahana account is completely free for farmers and for every other role. You only pay if you choose to purchase products, hire services or arrange paid consultations — and all such payments happen outside this demo platform.',
      },
      {
        q: 'How are experts verified?',
        a: 'Experts submit their qualifications, role (e.g. Agricultural Officer, Researcher, Consultant) and service areas during onboarding. Our admin team reviews each application and marks verified experts with a green Verified badge before their profile is publicly listed.',
      },
      {
        q: 'Can I sell my crops here?',
        a: 'Yes — registered farmers can list their harvest on the Crop Trading page with quantity, grade, expected price and harvest date. Verified buyers can then contact you directly. GoviSahana does not process payments; transactions are agreed between farmer and buyer.',
      },
      {
        q: 'Does GoviSahana replace government agricultural advisory services?',
        a: 'No. GoviSahana complements them by making it easier to reach experts online, but for official advisories, subsidies and emergency responses you should still contact your nearest Department of Agriculture office.',
      },
    ],
    si: [
      {
        q: 'ගොවි ලියාපදිංචිය නොමිලේද?',
        a: 'ඔව්. GoviSahana ගිණුමක් සෑදීම ගොවීන්ට මෙන්ම අනෙකුත් සියලු කාර්යභාරයන් සඳහා සම්පූර්ණයෙන්ම නොමිලේ වේ. ඔබ නිෂ්පාදන මිලදී ගැනීම, සේවා ලබා ගැනීම හෝ ගෙවීම් සහිත උපදේශන ලබා ගැනීම තෝරා ගතහොත් පමණක් ගෙවීම් සිදු වේ.',
      },
      {
        q: 'විශේෂඥයන් සත්‍යාපනය කරන්නේ කෙසේද?',
        a: 'විශේෂඥයන් ලියාපදිංචියේදී ඔවුන්ගේ අධ්‍යාපන සුදුසුකම්, නිල තනතුර (උදා. කෘෂිකර්ම නිලධාරී, පර්යේෂක, උපදේශක) සහ සේවා ප්‍රදේශ ඉදිරිපත් කරයි. අපගේ පරිපාලක කණ්ඩායම එක් එක් අයදුම්පත සමාලෝචනය කර ඔවුන්ගේ පැතිකඩ ප්‍රසිද්ධ කිරීමට පෙර සත්‍යාපිත ලාංඡනය ලබා දෙයි.',
      },
      {
        q: 'මට මෙහි මගේ අස්වැන්න විකිණිය හැකිද?',
        a: 'ඔව් — ලියාපදිංචි ගොවීන්ට තම අස්වැන්න ප්‍රමාණය, ශ්‍රේණිය, අපේක්ෂිත මිල සහ අස්වනු දිනය සමඟ අස්වැන්න වෙළඳ පිටුවේ ලැයිස්තුගත කළ හැකිය. සත්‍යාපිත ගැණුම්කරුවන්ට සෘජුවම ඔබ හා සම්බන්ධ විය හැකිය.',
      },
      {
        q: 'GoviSahana මගින් රජයේ කෘෂිකාර්මික උපදේශන සේවාවන් ප්‍රතිස්ථාපනය කරන්නේද?',
        a: 'නැත. GoviSahana මගින් අන්තර්ජාලය ඔස්සේ විශේෂඥයන් වෙත ළඟාවීම පහසු කරමින් රජයේ සේවාවන්ට අනුපූරක සහායක් සපයයි. නිල උපදේශන, සහනාධාර සහ හදිසි ප්‍රතිචාර සඳහා ඔබගේ ළඟම ඇති කෘෂිකර්ම දෙපාර්තමේන්තු කාර්යාලය අමතන්න.',
      },
    ],
    ta: [
      {
        q: 'விவசாயி பதிவு இலவசமா?',
        a: 'ஆம். விவசாயிகளுக்கும் ஏனைய அனைத்து பாத்திரங்களுக்கும் GoviSahana கணக்கை உருவாக்குவது முற்றிலும் இலவசம். நீங்கள் பொருட்களை வாங்கவோ, சேவைகளைப் பெறவோ அல்லது கட்டண ஆலோசனைகளைப் பெறவோ விரும்பினால் மட்டுமே பணம் செலுத்த வேண்டும்.',
      },
      {
        q: 'நிபுணர்கள் எவ்வாறு சரிபார்க்கப்படுகிறார்கள்?',
        a: 'நிபுணர்கள் தங்கள் தகுதிகள், பாத்திரம் (எ.கா. வேளாண்மை அதிகாரி, ஆராய்ச்சியாளர், ஆலோசகர்) மற்றும் சேவைப் பகுதிகளைச் சமர்ப்பிக்கின்றனர். எங்கள் நிர்வாகக் குழு ஒவ்வொரு விண்ணப்பத்தையும் மதிப்பாய்வு செய்து சரிபார்க்கப்பட்ட பேட்ஜை வழங்குகிறது.',
      },
      {
        q: 'எனது பயிர்களை இங்கு விற்க முடியுமா?',
        a: 'ஆம் — பதிவுசெய்த விவசாயிகள் தங்கள் அறுவடையின் அளவு, தரம், எதிர்பார்க்கும் விலை மற்றும் அறுவடைத் தேதியுடன் பயிர் வர்த்தகப் பக்கத்தில் பட்டியலிடலாம். சரிபார்க்கப்பட்ட வாங்குபவர்கள் உங்களை நேரடியாகத் தொடர்பு கொள்ளலாம்.',
      },
      {
        q: 'GoviSahana அரசாங்க விவசாய ஆலோசனை சேவைகளுக்கு மாற்றாக அமையுமா?',
        a: 'இல்லை. GoviSahana இணையம் மூலம் நிபுணர்களை அடைவதை எளிதாக்குவதன் மூலம் அரசாங்க சேவைகளுக்கு துணையாக செயல்படுகிறது. உத்தியோகபூர்வ ஆலோசனைகள் மற்றும் மானியங்களுக்கு உங்கள் அருகிலுள்ள விவசாய அலுவலகத்தைத் தொடர்பு கொள்ளவும்.',
      },
    ],
  }

  const faqs = faqsByLang[lang] || faqsByLang.en

  return (
    <div>
      {/* HEADER */}
      <section className="relative overflow-hidden border-b border-border gs-hero-gradient">
        <div className="gs-pattern absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Leaf className="h-3.5 w-3.5" /> {t('contact.badge')}
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            {t('contact.title')}
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            {t('contact.subtitle')}
          </p>
        </div>
      </section>

      {/* CONTACT INFO + FORM */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* LEFT: contact info */}
          <div className="space-y-6">
            <SectionHeader
              eyebrow={t('contact.eyebrow')}
              title={t('contact.infoTitle')}
              description={t('contact.infoDesc')}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              {contactInfo.map((c) => (
                <Card key={c.label} className="shadow-sm">
                  <CardContent className="flex items-start gap-3 p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <c.icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.label}</div>
                      <div className="mt-1 text-sm font-medium text-foreground break-words">{c.value}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              <AlertTriangle className="text-amber-600" />
              <AlertTitle className="text-amber-900">{t('contact.urgentAlertTitle')}</AlertTitle>
              <AlertDescription className="text-amber-800">
                {t('contact.urgentAlertDesc')}
              </AlertDescription>
            </Alert>
          </div>

          {/* RIGHT: form */}
          <Card className="shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-lg font-semibold">{t('contact.sendMessage')}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('contact.formDesc')}
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t('contact.name')}</Label>
                  <Input
                    id="name" placeholder="e.g. Nimal Perera"
                    value={form.name} onChange={(e) => update('name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email" type="email" placeholder="you@example.com"
                    value={form.email} onChange={(e) => update('email', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">{t('contact.subject')}</Label>
                  <Input
                    id="subject" placeholder="What is this about?"
                    value={form.subject} onChange={(e) => update('subject', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">{t('contact.message')}</Label>
                  <Textarea
                    id="message" rows={5} placeholder="Tell us how we can help…"
                    value={form.message} onChange={(e) => update('message', e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90">
                  <Send className="mr-2 h-4 w-4" />
                  {submitting ? t('contact.sending') : t('contact.sendBtn')}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {t('auth.agree')}{' '}
                  <button type="button" onClick={() => setView('privacy')} className="font-medium text-primary hover:underline">
                    {t('auth.privacyPolicy')}
                  </button>.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-border bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <SectionHeader
            center
            eyebrow="FAQ"
            title={lang === 'si' ? 'නිතර අසන ප්‍රශ්න' : lang === 'ta' ? 'அடிக்கடி கேட்கப்படும் கேள்விகள்' : 'Frequently asked questions'}
            description={lang === 'si' ? 'ඔබ අප හා සම්බන්ධ වීමට පෙර පිළිතුරු මෙහි තිබිය හැක.' : lang === 'ta' ? 'நீங்கள் எங்களைத் தொடர்பு கொள்வதற்கு முன் உங்கள் பதில் இங்கே இருக்கலாம்.' : 'A quick reference before you reach out — your answer may already be here.'}
          />
          <Accordion type="single" collapsible className="mt-8 w-full rounded-xl border border-border bg-card px-4 shadow-sm">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-base font-medium">{f.q}</AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>
    </div>
  )
}
