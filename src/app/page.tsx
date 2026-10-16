'use client'
import { useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Navbar } from '@/components/govisahana/navbar'
import { Footer } from '@/components/govisahana/footer'
import { WelcomeScreen, MinimalNav } from '@/components/govisahana/welcome-screen'
import DashboardShell from '@/components/govisahana/dashboards/shell'
import { Loader2 } from 'lucide-react'

import HomeView from '@/components/govisahana/views/home'
import AboutView from '@/components/govisahana/views/about'
import ContactView from '@/components/govisahana/views/contact'
import PrivacyView from '@/components/govisahana/views/privacy'
import TermsView from '@/components/govisahana/views/terms'
import ExpertsView from '@/components/govisahana/views/experts'
import ExpertDetailView from '@/components/govisahana/views/expert-detail'
import KnowledgeView from '@/components/govisahana/views/knowledge'
import ArticleView from '@/components/govisahana/views/article'
import MarketplaceView from '@/components/govisahana/views/marketplace'
import ProductDetailView from '@/components/govisahana/views/product-detail'
import CropsView from '@/components/govisahana/views/crops'
import CropDetailView from '@/components/govisahana/views/crop-detail'
import JobsView from '@/components/govisahana/views/jobs'
import JobDetailView from '@/components/govisahana/views/job-detail'
import BuyerRequirementsView from '@/components/govisahana/views/buyer-requirements'
import LoginView from '@/components/govisahana/views/login'
import RegisterView from '@/components/govisahana/views/register'
import OnboardingView from '@/components/govisahana/views/onboarding'
import CommunityView from '@/components/govisahana/views/community'
import UserProfileView from '@/components/govisahana/views/user-profile'
import CommunityMessagesView from '@/components/govisahana/views/community-messages'

export default function Home() {
  const { view, user, loading, refreshUser, setView, lang } = useApp()

  // Update <html lang> to match the chosen language (accessibility / screen readers)
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang === 'si' ? 'si' : lang === 'ta' ? 'ta' : 'en'
    }
  }, [lang])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [view])

  // AUTH GATE: unauthenticated visitors can only access login & register.
  // Any other view they try to reach → bounce to the welcome screen.
  useEffect(() => {
    if (!loading && !user && view !== 'login' && view !== 'register' && view !== 'home') {
      setView('home')
    }
  }, [loading, user, view, setView])

  // After login, send the user to their dashboard (their personalised home)
  useEffect(() => {
    if (!loading && user && (view === 'login' || view === 'home')) {
      // Only auto-redirect from the welcome screen right after auth;
      // we don't force dashboard if the user explicitly navigates to home later.
    }
  }, [loading, user, view])

  const isAuthed = !!user
  const isAuthView = view === 'login' || view === 'register'
  const isDashboard = view === 'dashboard'

  // Loading state right after first paint, before session resolves
  if (loading && !user) {
    return (
      <div className="flex min-h-screen flex-col">
        <MinimalNav />
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </div>
    )
  }

  // === UNAUTHENTICATED: show the gate ===
  // Only login & register are reachable; everything else shows the welcome screen.
  if (!isAuthed) {
    return (
      <div className="flex min-h-screen flex-col">
        <MinimalNav />
        <main className="flex-1">
          {view === 'login' ? <LoginView /> :
           view === 'register' ? <RegisterView /> :
           <WelcomeScreen />}
        </main>
        {view === 'home' && <Footer />}
      </div>
    )
  }

  // === AUTHENTICATED: full platform ===
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {renderView(view)}
      </main>
      {!isDashboard && !isAuthView && <Footer />}
    </div>
  )

  function renderView(v: string) {
    switch (v) {
      case 'home': return <HomeView />
      case 'about': return <AboutView />
      case 'contact': return <ContactView />
      case 'privacy': return <PrivacyView />
      case 'terms': return <TermsView />
      case 'experts': return <ExpertsView />
      case 'expert-detail': return <ExpertDetailView />
      case 'knowledge': return <KnowledgeView />
      case 'article': return <ArticleView />
      case 'marketplace': return <MarketplaceView />
      case 'product-detail': return <ProductDetailView />
      case 'crops': return <CropsView />
      case 'crop-detail': return <CropDetailView />
      case 'jobs': return <JobsView />
      case 'job-detail': return <JobDetailView />
      case 'buyer-requirements': return <BuyerRequirementsView />
      case 'login': return <DashboardShell />
      case 'register': return <RegisterView />
      case 'onboarding': return <OnboardingView />
      case 'dashboard': return <DashboardShell />
      case 'community': return <CommunityView />
      case 'user-profile': return <UserProfileView />
      case 'community-messages': return <CommunityMessagesView />
      default: return <HomeView />
    }
  }
}
