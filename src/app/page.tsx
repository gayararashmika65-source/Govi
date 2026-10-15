'use client'
import { useEffect } from 'react'
import { useApp } from '@/lib/store'
import { Navbar } from '@/components/govisahana/navbar'
import { Footer } from '@/components/govisahana/footer'
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

export default function Home() {
  const { view, user, loading, refreshUser, setView } = useApp()

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [view])

  // Guard: dashboard & onboarding require auth
  useEffect(() => {
    if (!loading && !user && (view === 'dashboard' || view === 'onboarding')) {
      setView('login')
    }
  }, [loading, user, view, setView])

  const isDashboard = view === 'dashboard'
  const isAuthView = view === 'login' || view === 'register'

  if (loading && !user && (view === 'dashboard' || view === 'onboarding')) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      </div>
    )
  }

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
      case 'login': return <LoginView />
      case 'register': return <RegisterView />
      case 'onboarding': return <OnboardingView />
      case 'dashboard': return user ? <DashboardShell /> : <LoginView />
      default: return <HomeView />
    }
  }
}
