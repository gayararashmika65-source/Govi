 
'use client'
import { useEffect, useState } from 'react'
import { useApp } from '@/lib/store'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EmptyState, formatDate } from '@/components/govisahana/common'
import {
  ArrowLeft,
  Calendar,
  User,
  Tag,
  Store,
  ShoppingBasket,
  Sprout,
  BookOpen,
  ArrowRight,
} from 'lucide-react'

type Article = {
  id: string
  title: string
  summary: string
  content: string
  category?: string
  authorName?: string
  tags?: string
  createdAt: string
}

export default function ArticleView() {
  const id = useApp((s) => s.viewParam)
  const { setView } = useApp()
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!id) {
      setNotFound(true)
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setNotFound(false)
    setArticle(null)
    fetch(`/api/knowledge/${id}`, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Not found')
        const d = await r.json()
        if (!active) return
        if (!d.article) {
          setNotFound(true)
        } else {
          setArticle(d.article)
        }
      })
      .catch(() => {
        if (active) setNotFound(true)
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <div className="mb-6 h-9 w-32 animate-pulse rounded bg-muted/40" />
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            <div className="h-6 w-28 animate-pulse rounded bg-primary/10" />
            <div className="h-10 w-3/4 animate-pulse rounded bg-muted/40" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted/40" />
            <div className="mt-4 space-y-3">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="h-4 w-full animate-pulse rounded bg-muted/40" />
              ))}
            </div>
          </div>
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (notFound || !article) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
        <Button variant="ghost" onClick={() => setView('knowledge')} className="mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Knowledge Hub
        </Button>
        <EmptyState
          icon={<BookOpen className="h-6 w-6" />}
          title="Article not found"
          description="This article may have been removed or the link is incorrect."
          action={
            <Button onClick={() => setView('knowledge')} className="bg-primary hover:bg-primary/90">
              Browse articles
            </Button>
          }
        />
      </div>
    )
  }

  const paragraphs = (article.content || '')
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
  const tags = (article.tags || '')
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)

  const relatedLinks = [
    {
      icon: Sprout,
      title: 'Talk to an expert',
      desc: 'Get personalised advice from verified agricultural officers and researchers.',
      view: 'experts' as const,
    },
    {
      icon: Store,
      title: 'Browse the marketplace',
      desc: 'Find seeds, fertilizers, equipment and irrigation supplies.',
      view: 'marketplace' as const,
    },
    {
      icon: ShoppingBasket,
      title: 'Sell your harvest',
      desc: 'List your crop and connect directly with buyers across Sri Lanka.',
      view: 'crops' as const,
    },
  ]

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12">
      <Button variant="ghost" onClick={() => setView('knowledge')} className="mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Knowledge Hub
      </Button>

      <div className="grid gap-8 lg:grid-cols-3">
        <article className="lg:col-span-2">
          {article.category && (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <BookOpen className="h-3.5 w-3.5" /> {article.category}
            </span>
          )}
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{article.title}</h1>
          <p className="mt-3 text-base text-muted-foreground leading-relaxed">{article.summary}</p>

          <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 border-y border-border py-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <User className="h-4 w-4 text-primary" /> {article.authorName || 'GoviSahana'}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-primary" /> {formatDate(article.createdAt)}
            </span>
          </div>

          <div className="mt-6 space-y-4">
            {paragraphs.map((p, i) => (
              <p key={i} className="text-base leading-7 text-foreground/90">
                {p}
              </p>
            ))}
            {paragraphs.length === 0 && (
              <p className="text-sm text-muted-foreground">This article has no content yet.</p>
            )}
          </div>

          {tags.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-2 border-t border-border pt-6">
              <span className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Tag className="h-3.5 w-3.5" /> Tags
              </span>
              {tags.map((t) => (
                <Badge key={t} variant="outline" className="border-border text-muted-foreground">
                  {t}
                </Badge>
              ))}
            </div>
          )}
        </article>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold">Related resources</h3>
            <p className="mt-1 text-xs text-muted-foreground">Put this knowledge into practice.</p>
          </div>

          {relatedLinks.map((r) => (
            <Card
              key={r.title}
              className="group cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => setView(r.view)}
            >
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <r.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h4 className="text-sm font-semibold leading-snug">{r.title}</h4>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{r.desc}</p>
                    <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary transition-all group-hover:gap-2">
                      Explore <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </aside>
      </div>
    </div>
  )
}
