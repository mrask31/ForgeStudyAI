'use client'

import { createBrowserClient } from '@supabase/ssr'
import { useEffect, useState } from 'react'
import { Check, ArrowRight, Sparkles, Shield, Heart } from 'lucide-react'
import Hero from '@/components/landing/Hero'
import HowItClicks from '@/components/landing/HowItClicks'
import ThreeFeatures from '@/components/landing/ThreeFeatures'
import BeliefValidation from '@/components/landing/BeliefValidation'
import ClosingCTA from '@/components/landing/ClosingCTA'
import { startStripeCheckout } from '@/lib/stripeClient'
import { getGradeBandConfig, type GradeBand } from '@/config'

interface LandingPageContentProps {
  gradeBand: GradeBand
}

export default function LandingPageContent({ gradeBand }: LandingPageContentProps) {
  const [user, setUser] = useState<any>(null)
  const cfg = getGradeBandConfig(gradeBand)

  useEffect(() => {
    // Safely create Supabase client - don't break landing page if env vars are missing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn('[Landing Page] Supabase environment variables are missing - user detection disabled')
      return
    }
    
    try {
      const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey)
      
      supabase.auth.getUser().then(({ data: { user } }) => {
        setUser(user)
      }).catch((error) => {
        console.error('[Landing Page] Error getting user:', error)
        // Don't break the page if auth check fails
      })
    } catch (error) {
      console.error('[Landing Page] Error creating Supabase client:', error)
      // Don't break the page if Supabase client creation fails
    }
  }, [])

  return (
    <div className="w-full bg-slate-50">
      {/* Hero Section */}
      <Hero user={user} />

      {/* How studying finally clicks */}
      <HowItClicks />

      {/* Built for how nurses actually learn */}
      <ThreeFeatures />

      {/* If this sounds like you... */}
      <BeliefValidation />

      {/* Pricing - Enhanced */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 bg-gradient-to-br from-white via-indigo-50/30 to-white">
        <div className="text-center mb-10 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent mb-4">
            <span className="hidden sm:inline">Simple, Student-Friendly Pricing</span>
            <span className="sm:hidden">Simple Pricing</span>
          </h2>
          <p className="text-base sm:text-lg text-slate-700 mb-4 hidden sm:block">
            Start with a 7-day free trial, then choose the plan that fits your semester.
          </p>
          <p className="text-base sm:text-lg text-slate-700 mb-4 sm:hidden">
            7-day free trial, then pick your plan.
          </p>
          
          {/* All Plans Include */}
          <div className="mt-6 mb-8 max-w-3xl mx-auto">
            <p className="text-xs sm:text-sm font-semibold text-slate-700 mb-3">All plans include full access to:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span>AI tutor with your materials</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span>Step-by-step guidance</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span>Guided help aligned with your coursework</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span>Key concepts & evidence review</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span>Support for your uploaded textbooks</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span>Progress insights & history</span>
              </div>
            </div>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          {/* Monthly Plan - Enhanced */}
          <div className="bg-white/80 backdrop-blur-sm border-2 border-slate-200/60 rounded-2xl p-6 sm:p-8 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-indigo-200/30 transition-all duration-300 transform hover:scale-[1.02]">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Monthly Access</h3>
            <div className="mb-4">
              <span className="text-3xl sm:text-4xl font-bold text-slate-900">$29</span>
              <span className="text-slate-600 text-sm sm:text-base ml-1">/month</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mb-6">Perfect for focused study periods</p>
            <button
              onClick={() => startStripeCheckout('monthly')}
              className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm sm:text-base font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40 transform hover:scale-105 active:scale-95"
            >
              Start Free Preview
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 inline-block ml-2" />
            </button>
          </div>

          {/* Semester Plan - Enhanced */}
          <div className="bg-white/80 backdrop-blur-sm border-2 border-indigo-300/60 rounded-2xl p-6 sm:p-8 shadow-lg shadow-indigo-200/50 hover:shadow-xl hover:shadow-indigo-300/40 transition-all duration-300 transform hover:scale-[1.02] relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold rounded-full">
              Most Popular
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Semester Access</h3>
            <div className="mb-2">
              <span className="text-3xl sm:text-4xl font-bold text-slate-900">$89</span>
              <span className="text-slate-600 text-sm sm:text-base ml-1">/semester</span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 mb-1">4 months</p>
            <p className="text-xs sm:text-sm text-indigo-600 font-semibold mb-4">
              ~$22/month • Save 24% vs monthly
            </p>
            <p className="text-xs sm:text-sm text-slate-600 mb-6">Best value for a full term</p>
            <button
              onClick={() => startStripeCheckout('semester')}
              className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm sm:text-base font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40 transform hover:scale-105 active:scale-95"
            >
              Start Free Preview
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 inline-block ml-2" />
            </button>
          </div>

          {/* Annual Plan - Enhanced */}
          <div className="bg-white/80 backdrop-blur-sm border-2 border-slate-200/60 rounded-2xl p-6 sm:p-8 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-indigo-200/30 transition-all duration-300 transform hover:scale-[1.02]">
            <h3 className="text-xl font-bold text-slate-900 mb-2">Annual Access</h3>
            <div className="mb-2">
              <span className="text-3xl sm:text-4xl font-bold text-slate-900">$199</span>
              <span className="text-slate-600 text-sm sm:text-base ml-1">/year</span>
            </div>
            <p className="text-[10px] sm:text-xs text-slate-400 mb-1">12 months</p>
            <p className="text-xs sm:text-sm text-indigo-600 font-semibold mb-4">
              ~$17/month • Save 41% vs monthly
            </p>
            <p className="text-xs sm:text-sm text-slate-600 mb-6">Maximum savings for long-term commitment</p>
            <button
              onClick={() => startStripeCheckout('annual')}
              className="w-full px-4 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl text-sm sm:text-base font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-md shadow-indigo-500/30 hover:shadow-lg hover:shadow-indigo-500/40 transform hover:scale-105 active:scale-95"
            >
              Start Free Preview
              <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 inline-block ml-2" />
            </button>
          </div>
        </div>

        {/* Trust Section - Enhanced */}
        <div className="text-center pt-8 sm:pt-12 border-t border-slate-200">
          <div className="flex flex-wrap justify-center items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-600">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              <span>7-day free trial included</span>
            </div>
            <div className="flex items-center gap-2">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              <span>Cancel anytime</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
              <span>No hidden fees</span>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <ClosingCTA />

      {/* Disclaimer Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 bg-slate-50">
        <div className="text-center">
          <p className="text-xs sm:text-sm text-slate-600 max-w-3xl mx-auto">
            <span className="hidden sm:inline">ForgeStudy Platform supplements your Grades 6–12 education by providing guided help aligned with your coursework. It does not replace instruction or classroom learning.</span>
            <span className="sm:hidden">Supplemental study tool — not a replacement for instruction.</span>
          </p>
        </div>
      </section>
    </div>
  )
}
