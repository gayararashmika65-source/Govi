'use client'
import { useLang } from '@/lib/use-t'
import { LANGUAGES } from '@/lib/i18n'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export function LanguageSwitcher({ className }: { className?: string }) {
  const { lang, setLang } = useLang()
  const current = LANGUAGES.find((l) => l.value === lang) || LANGUAGES[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn('h-9 gap-1.5 px-2', className)}
          aria-label="Change language"
          title="Language"
        >
          <Globe className="h-4 w-4" />
          <span className="text-sm font-medium">{current.native}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {LANGUAGES.map((l) => (
          <DropdownMenuItem
            key={l.value}
            onClick={() => setLang(l.value)}
            className="flex items-center justify-between"
          >
            <span className="flex flex-col">
              <span className="font-medium">{l.native}</span>
              <span className="text-xs text-muted-foreground">{l.label}</span>
            </span>
            {l.value === lang && <Check className="h-4 w-4 text-primary" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
