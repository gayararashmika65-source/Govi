'use client'
import { useState, type FormEvent } from 'react'
import { useApp, api } from '@/lib/store'
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
    { icon: MapPin, label: 'Address', value: 'Department of Agriculture, Peradeniya, Sri Lanka' },
    { icon: Phone, label: 'Phone', value: '+94 81 238 8000' },
    { icon: Mail, label: 'Email', value: 'hello@govisahana.lk' },
    { icon: Clock, label: 'Office hours', value: 'Mon–Fri, 8:30 AM – 4:15 PM (Sri Lanka time)' },
  ]

  const faqs = [
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
  ]

  return (
    <div>
      {/* HEADER */}
      <section className="relative overflow-hidden border-b border-border gs-hero-gradient">
        <div className="gs-pattern absolute inset-0 opacity-60" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 text-center sm:px-6 lg:py-20">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            <Leaf className="h-3.5 w-3.5" /> We&apos;re here to help
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
            Contact GoviSahana
          </h1>
          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            Questions about the platform, an expert listing, a marketplace order or a crop emergency?
            Our team is ready to support farmers, experts and partners across Sri Lanka.
          </p>
        </div>
      </section>

      {/* CONTACT INFO + FORM */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-2">
          {/* LEFT: contact info */}
          <div className="space-y-6">
            <SectionHeader
              eyebrow="Reach us directly"
              title="Contact information"
              description="Use the channel that works best for you. Our team responds to messages within 48 hours."
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
              <AlertTitle className="text-amber-900">Urgent crop emergencies</AlertTitle>
              <AlertDescription className="text-amber-800">
                For suspected pest outbreaks, plant quarantine concerns or fast-spreading crop disease,
                please contact your <span className="font-semibold">nearest Department of Agriculture office</span> or
                the Govijana Seva Centre immediately. GoviSahana is not an emergency response service.
              </AlertDescription>
            </Alert>
          </div>

          {/* RIGHT: form */}
          <Card className="shadow-sm">
            <CardContent className="p-6 sm:p-8">
              <h2 className="text-lg font-semibold">Send us a message</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Fill in the form below and our team will get back to you. (This is a demo form — messages are not stored.)
              </p>
              <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name" placeholder="e.g. Nimal Perera"
                    value={form.name} onChange={(e) => update('name', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email" type="email" placeholder="you@example.com"
                    value={form.email} onChange={(e) => update('email', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject" placeholder="What is this about?"
                    value={form.subject} onChange={(e) => update('subject', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message" rows={5} placeholder="Tell us how we can help…"
                    value={form.message} onChange={(e) => update('message', e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" disabled={submitting} className="w-full bg-primary hover:bg-primary/90">
                  <Send className="mr-2 h-4 w-4" />
                  {submitting ? 'Sending…' : 'Send message'}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  By submitting this form you agree to our{' '}
                  <button type="button" onClick={() => setView('privacy')} className="font-medium text-primary hover:underline">
                    Privacy Policy
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
            eyebrow="Frequently asked"
            title="Questions farmers often ask us"
            description="A quick reference before you reach out — your answer may already be here."
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
