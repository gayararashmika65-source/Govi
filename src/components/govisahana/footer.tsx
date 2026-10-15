'use client'
import Image from 'next/image'
import { Mail, Phone, MapPin, Facebook, Twitter, Youtube, Linkedin } from 'lucide-react'
import { useApp } from '@/lib/store'
import type { View } from '@/lib/store'

const cols: { title: string; links: { label: string; view: View }[] }[] = [
  {
    title: 'Platform',
    links: [
      { label: 'Find Experts', view: 'experts' },
      { label: 'Knowledge Hub', view: 'knowledge' },
      { label: 'Marketplace', view: 'marketplace' },
      { label: 'Crop Listings', view: 'crops' },
      { label: 'Jobs & Services', view: 'jobs' },
    ],
  },
  {
    title: 'For Farmers',
    links: [
      { label: 'Report a Problem', view: 'register' },
      { label: 'Find Buyers', view: 'buyer-requirements' },
      { label: 'Buy Products', view: 'marketplace' },
      { label: 'Hire Workers', view: 'jobs' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About Us', view: 'about' },
      { label: 'Contact Us', view: 'contact' },
      { label: 'Privacy Policy', view: 'privacy' },
      { label: 'Terms & Conditions', view: 'terms' },
    ],
  },
]

export function Footer() {
  const { setView } = useApp()
  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Image
              src="/logo-transparent.png"
              alt="GoviSahana"
              width={160}
              height={76}
              className="h-16 w-auto"
            />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground leading-relaxed">
              A digital agriculture platform connecting Sri Lankan farmers with verified agricultural
              experts, enterprises, workers and buyers — to close the knowledge gap and modernise farming.
            </p>
            <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Department of Agriculture, Peradeniya, Sri Lanka</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> +94 81 238 8000</div>
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> hello@govisahana.lk</div>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <h3 className="text-sm font-semibold text-foreground">{c.title}</h3>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l.label}>
                    <button
                      onClick={() => setView(l.view)}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} GoviSahana. Built for Sri Lankan agriculture. Demo platform for educational purposes.
          </p>
          <div className="flex items-center gap-3 text-muted-foreground">
            {[Facebook, Twitter, Youtube, Linkedin].map((Icon, i) => (
              <button key={i} className="flex h-8 w-8 items-center justify-center rounded-full border border-border hover:bg-muted hover:text-primary">
                <Icon className="h-4 w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  )
}
