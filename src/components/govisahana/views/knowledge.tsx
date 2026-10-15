 
'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { SectionHeader, EmptyState, formatDate } from '@/components/govisahana/common'
import { Search, BookOpen, Calendar, User, ArrowRight } from 'lucide-react'

type Article = {
  id: string
  title: string
  summary: string
  content?: string
  category?: string
  authorName?: string
  tags?: string
  createdAt: string
}

const CATEGORIES = [
  'All',
  'Pest Management',
  'Soil & Fertility',
  'Cultivation Calendar',
  'Good Practices',
  'Irrigation',
]

export default function KnowledgeView() {
  const { openDetail, setView } = useApp()
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')
  const [category, setCategory] = useState<string>('All')
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)

  // Debounce search input
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  useEffect(() => {
    let active = true
    setLoading(true)
    const params = new URLSearchParams()
    if (debouncedQ) params.set('q', debouncedQ)
    if (category && category !== 'All') params.set('category', category)
    fetch(`/api/knowledge?${params.toString()}`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (active) setArticles(Array.isArray(d.articles) ? d.articles : [])
      })
      .catch(() => {
        if (active) setArticles([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [debouncedQ, category])

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
      <SectionHeader
        eyebrow="Knowledge Hub"
        title="Agricultural resources for Sri Lankan farmers"
        description="Practical articles from agricultural officers and researchers on pests, soil health, cultivation calendars, irrigation and good farming practices — written for our local conditions."
      />

      {/* Filters */}
      <div className="mt-8 flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search articles, tags or topics…"
            className="pl-9"
            aria-label="Search knowledge articles"
          />
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Filter by category">
          {CATEGORIES.map((c) => {
            const active = category === c
            return (
              <button
                key={c}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  active
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary'
                }`}
              >
                {c}
              </button>
            )
          })}
        </div>
      </div>

      {/* Result count */}
      <div className="mt-6 text-sm text-muted-foreground">
        {loading ? 'Loading articles…' : `${articles.length} article${articles.length === 1 ? '' : 's'}`}
      </div>

      {/* Results */}
      {loading ? (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <EmptyState
          className="mt-4"
          icon={<BookOpen className="h-6 w-6" />}
          title="No articles found"
          description="Try a different search term or category. New articles are added regularly by our experts."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setQ('')
                setCategory('All')
              }}
            >
              Reset filters
            </Button>
          }
        />
      ) : (
        <div className="mt-4 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {articles.map((a) => (
            <Card
              key={a.id}
              className="group cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => openDetail('article', a.id)}
            >
              <CardContent className="flex h-full flex-col p-5">
                <div className="flex items-center gap-2">
                  {a.category ? (
                    <Badge className="border-transparent bg-primary/10 text-primary">{a.category}</Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground">Article</Badge>
                  )}
                </div>
                <h3 className="mt-3 line-clamp-2 font-semibold leading-snug">{a.title}</h3>
                <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground leading-relaxed">{a.summary}</p>
                <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
                  <span className="flex min-w-0 items-center gap-1.5">
                    <User className="h-3.5 w-3.5 shrink-0 text-primary" />
                    <span className="truncate">{a.authorName || 'GoviSahana'}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> {formatDate(a.createdAt)}
                  </span>
                </div>
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary transition-all group-hover:gap-2">
                  Read article <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* CTA */}
      <div className="mt-12 rounded-xl border border-border bg-muted/30 p-6 sm:p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Need advice specific to your farm?</h3>
            <p className="mt-1 text-sm text-muted-foreground">Connect with a verified agricultural expert for a personal consultation.</p>
          </div>
          <Button onClick={() => setView('experts')} className="bg-primary hover:bg-primary/90">
            Find an expert <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
