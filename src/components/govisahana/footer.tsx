'use client'
import { Mail, Phone, MapPin, Facebook, Twitter, Youtube, Linkedin } from 'lucide-react'
import { useApp } from '@/lib/store'
import { useT } from '@/lib/use-t'
import type { View } from '@/lib/store'

type ColConfig = {
  titleKey: string
  links: { tKey: string; view: View }[]
}

const cols: ColConfig[] = [
  {
    titleKey: 'footer.platform',
    links: [
      { tKey: 'footer.findExperts', view: 'experts' },
      { tKey: 'footer.knowledge', view: 'knowledge' },
      { tKey: 'footer.marketplace', view: 'marketplace' },
      { tKey: 'footer.crops', view: 'crops' },
      { tKey: 'footer.jobs', view: 'jobs' },
    ],
  },
  {
    titleKey: 'footer.forFarmers',
    links: [
      { tKey: 'footer.reportProblem', view: 'register' },
      { tKey: 'footer.findBuyers', view: 'buyer-requirements' },
      { tKey: 'footer.buyProducts', view: 'marketplace' },
      { tKey: 'footer.hireWorkers', view: 'jobs' },
    ],
  },
  {
    titleKey: 'footer.company',
    links: [
      { tKey: 'footer.about', view: 'about' },
      { tKey: 'footer.contact', view: 'contact' },
      { tKey: 'footer.privacy', view: 'privacy' },
      { tKey: 'footer.terms', view: 'terms' },
    ],
  },
]

export function Footer() {
  const { setView } = useApp()
  const t = useT()

  return (
    <footer className="mt-auto border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <img
              src="/logo-transparent.png"
              alt="GoviSahana"
              width={160}
              height={76}
              className="h-16 w-auto"
            />
            <p className="mt-4 max-w-sm text-sm text-muted-foreground leading-relaxed">
              {t('footer.desc')}
            </p>
            <div className="mt-4 space-y-1.5 text-sm text-muted-foreground">
              <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> Dalugama, Kelaniya, Sri Lanka</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> 074 121 6582</div>
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> govisahana.srilanka@gmail.com</div>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.titleKey}>
              <h3 className="text-sm font-semibold text-foreground">{t(c.titleKey)}</h3>
              <ul className="mt-3 space-y-2">
                {c.links.map((l) => (
                  <li key={l.tKey}>
                    <button
                      onClick={() => setView(l.view)}
                      className="text-sm text-muted-foreground transition-colors hover:text-primary"
                    >
                      {t(l.tKey)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} GoviSahana. {t('footer.rights')}
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
