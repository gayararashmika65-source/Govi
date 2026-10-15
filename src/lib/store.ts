// Lightweight client-side fetch helper + app state (Zustand) for the GoviSahana SPA shell.
// Only the `/` route is user-visible, so views are switched via client state.
import { create } from 'zustand'
import type { Role } from '@/lib/types'
import type { Lang } from '@/lib/i18n'

export type SessionUser = {
  id: string
  email: string
  name: string
  role: Role
  status: string
  avatarUrl: string | null
  profileComplete?: boolean
}

export type View =
  | 'home' | 'about' | 'contact' | 'privacy' | 'terms'
  | 'experts' | 'expert-detail' | 'knowledge' | 'article'
  | 'marketplace' | 'product-detail'
  | 'crops' | 'crop-detail'
  | 'jobs' | 'job-detail'
  | 'buyer-requirements'
  | 'login' | 'register' | 'onboarding'
  | 'dashboard'

type AppState = {
  user: SessionUser | null
  loading: boolean
  view: View
  viewParam: string | null  // id or context for a view (e.g. expert id, article id)
  lang: Lang
  prevView: View | null

  setView: (v: View, param?: string | null) => void
  setUser: (u: SessionUser | null) => void
  refreshUser: () => Promise<SessionUser | null>
  logout: () => Promise<void>

  // language
  setLang: (l: Lang) => void

  // navigation helpers
  goHome: () => void
  openDetail: (view: View, id: string) => void
}

async function api<T = unknown>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) },
    credentials: 'include',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error((data as { error?: string }).error || 'Request failed')
  return data as T
}

export { api }

// Read persisted language once at init (safe for SSR — window only on client)
function getInitialLang(): Lang {
  if (typeof window === 'undefined') return 'en'
  const stored = window.localStorage.getItem('gs_lang')
  if (stored === 'en' || stored === 'si' || stored === 'ta') return stored
  // Detect from browser language
  const bl = window.navigator.language.toLowerCase()
  if (bl.startsWith('si')) return 'si'
  if (bl.startsWith('ta')) return 'ta'
  return 'en'
}

export const useApp = create<AppState>((set, get) => ({
  user: null,
  loading: true,
  view: 'home',
  viewParam: null,
  prevView: null,
  lang: getInitialLang(),

  setView: (v, param = null) =>
    set((s) => ({ view: v, viewParam: param, prevView: s.view === v ? s.prevView : s.view })),

  setUser: (u) => set({ user: u, loading: false }),

  setLang: (l) => {
    if (typeof window !== 'undefined') window.localStorage.setItem('gs_lang', l)
    set({ lang: l })
  },

  refreshUser: async () => {
    try {
      const data = await api<{ user: SessionUser | null }>('/api/auth/me')
      set({ user: data.user, loading: false })
      return data.user
    } catch {
      set({ user: null, loading: false })
      return null
    }
  },

  logout: async () => {
    await api('/api/auth/logout', { method: 'POST' })
    set({ user: null, view: 'home', viewParam: null })
  },

  goHome: () => set({ view: 'home', viewParam: null }),

  openDetail: (view, id) => set({ view, viewParam: id }),
}))
