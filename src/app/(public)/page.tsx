'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { 
  GraduationCap, BookOpen, Sparkles, ArrowRight, Shield, Users, 
  Target, CheckCircle2, TrendingUp, Brain, MessageSquare, 
  ChevronRight
} from 'lucide-react'
import { Accordion } from '@/components/ui/accordion'

export default function HomePage() {
  const [billingPeriod, setBillingPeriod] = useState<'monthly' | 'annual'>('monthly')
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (!params.has('code')) return
    const targetUrl = new URL('/auth/callback', window.location.origin)
    targetUrl.search = params.toString()
    window.location.replace(targetUrl.toString())
  }, [])
  const faqItems = [
    {
      question: "Is this cheating?",
      answer: "No. ForgeStudy is designed to help students understand concepts, not provide answers. Our AI uses Socratic questioning to guide students through problems step-by-step, building understanding rather than enabling shortcuts."
    },
    {
      question: "How does ForgeStudy adapt by grade?",
      answer: "ForgeStudy adapts its teaching style, vocabulary, and complexity to match each student's grade band. Elementary students get fun, engaging explanations with visual concepts. Middle school students receive structured guidance. High school students get advanced support aligned with college-prep coursework."
    },
    {
      question: "Can parents manage multiple students?",
      answer: "Yes. With the Family Plan, one parent account can manage up to 4 student profiles. Each student gets their own personalized dashboard and learning experience. You can easily switch between profiles to check progress for each student."
    },
    {
      question: "What happens after I sign up?",
      answer: "After signing up, you'll create your first student profile (choosing the grade band). If you have one profile, you'll go straight to that student's dashboard. If you create multiple profiles, you'll see a profile selector (like Netflix) to choose which student to work with."
    },
    {
      question: "Can I cancel anytime?",
      answer: "Yes. You can cancel your subscription at any time from your account settings. There are no long-term contracts or cancellation fees."
    },
    {
      question: "How do you handle privacy?",
      answer: "We take student privacy seriously. We comply with education privacy standards (FERPA/COPPA), encrypt all data in transit and at rest, and never share student information with third parties. Parents have full control over their children's data."
    }
  ]

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 sm:pt-20 pb-16 sm:pb-24 bg-gradient-to-br from-white via-slate-50/30 to-white">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Text Content */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
              Homework, without<br className="hidden sm:block" /> the nightly struggle.
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl text-slate-700 mb-4 leading-relaxed max-w-2xl mx-auto lg:mx-0 font-medium">
              ForgeStudy helps students in Grades 3–12 understand their work step-by-step — building confidence, independence, and better study habits.
            </p>
            <p className="text-sm sm:text-base text-slate-500 mb-8 leading-relaxed max-w-2xl mx-auto lg:mx-0">
              Built for real learning. Designed for families.
            </p>
            
            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-8">
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold text-lg hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
              >
                Get Started
                <ArrowRight className="w-5 h-5" />
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 bg-white text-slate-900 border-2 border-slate-300 rounded-xl font-semibold text-lg hover:border-teal-400 hover:bg-slate-50 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Log In
              </Link>
            </div>

            {/* Proof Chips */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
              <div className="flex items-center gap-2 px-4 py-2 bg-teal-50 border border-teal-200 rounded-full">
                <MessageSquare className="w-4 h-4 text-teal-600" />
                <span className="text-sm font-medium text-teal-900">Explains step-by-step (not just answers)</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-cyan-50 border border-cyan-200 rounded-full">
                <Users className="w-4 h-4 text-cyan-600" />
                <span className="text-sm font-medium text-cyan-900">One account for the whole family</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-full">
                <TrendingUp className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-900">Builds confidence & independence</span>
              </div>
            </div>
          </div>

          {/* Right: Product Preview Panel - Readiness Dashboard Mock */}
          <div className="relative">
            <div className="bg-gradient-to-br from-white to-slate-50 rounded-2xl border-2 border-slate-200 shadow-2xl p-6 sm:p-8">
              {/* Mock Dashboard Header */}
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-lg"></div>
                  <div>
                    <div className="h-4 bg-slate-700 rounded w-28 mb-2 font-semibold text-slate-900">Readiness Dashboard</div>
                    <div className="h-3 bg-slate-400 rounded w-40"></div>
                  </div>
                </div>
              </div>

              {/* Mock Dashboard Sections */}
              <div className="space-y-4 mb-6">
                {/* Tonight's Focus */}
                <div className="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl p-4 border border-cyan-200">
                  <div className="text-xs font-semibold text-cyan-900 mb-2">Tonight's Focus</div>
                  <div className="h-3 bg-cyan-200 rounded w-32 mb-2"></div>
                  <div className="h-2 bg-cyan-100 rounded w-24"></div>
                </div>

                {/* Progress Cards */}
                <div className="grid grid-cols-2 gap-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-white rounded-xl p-3 border border-slate-200">
                      <div className="h-2.5 bg-slate-300 rounded w-16 mb-2"></div>
                      <div className="h-6 bg-teal-100 rounded w-full mb-1"></div>
                      <div className="h-1.5 bg-slate-100 rounded w-20"></div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mock Ask Question Input */}
              <div className="bg-white rounded-xl p-4 border-2 border-teal-300 shadow-sm">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-teal-600" />
                  <div className="flex-1 h-10 bg-slate-100 rounded-lg"></div>
                  <div className="w-10 h-10 bg-gradient-to-r from-teal-600 to-cyan-600 rounded-lg flex items-center justify-center">
                    <ArrowRight className="w-5 h-5 text-white" />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-3 text-center">Ask a question</p>
              </div>
            </div>
            
            {/* Decorative gradient overlay */}
            <div className="absolute -z-10 -inset-4 bg-gradient-to-r from-teal-200/20 to-cyan-200/20 rounded-3xl blur-2xl"></div>
          </div>
        </div>
      </section>

      {/* Parent Pain → Relief Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-8 sm:mb-12 text-center">
            If homework time feels like this… you're not alone.
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
            <div className="flex items-start gap-3 p-5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed">I don't remember how to help.</p>
            </div>
            <div className="flex items-start gap-3 p-5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed">My kid shuts down when they get stuck.</p>
            </div>
            <div className="flex items-start gap-3 p-5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed">We spend forever and still feel behind.</p>
            </div>
            <div className="flex items-start gap-3 p-5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
              <p className="text-base sm:text-lg text-slate-700 leading-relaxed">I'm worried they're falling behind.</p>
            </div>
          </div>

          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-8 sm:p-10 text-center text-white shadow-xl">
            <p className="text-xl sm:text-2xl md:text-3xl font-bold mb-2 leading-tight">
              ForgeStudy turns "stuck" into progress — by teaching how to think, not what to copy.
            </p>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              Why ForgeStudy?
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
            {/* Explains step-by-step */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                <Brain className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">Explains step-by-step (not just answers)</h3>
              <p className="text-slate-600 leading-relaxed">
                Builds understanding through guided inquiry, not quick answers that get forgotten.
              </p>
            </div>

            {/* Builds independence */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">Builds study habits and independence</h3>
              <p className="text-slate-600 leading-relaxed">
                Students learn to think through problems themselves, building confidence over time.
              </p>
            </div>

            {/* Personal dashboards */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                <Target className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">Personal dashboards per student</h3>
              <p className="text-slate-600 leading-relaxed">
                Each student gets their own dashboard tracking progress, focus areas, and achievements.
              </p>
            </div>

            {/* One parent account */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 hover:shadow-lg transition-all duration-300">
              <div className="w-12 h-12 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3 leading-tight">One parent account, multiple learners</h3>
              <p className="text-slate-600 leading-relaxed">
                Manage multiple students from one account with easy profile switching for families.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Grade Bands - Informational Only */}
      <section className="py-16 sm:py-20 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              Support for Every Grade Level
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
              Tailored learning support from elementary through high school
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* Elementary - Non-clickable */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Elementary</h3>
                <p className="text-slate-600 leading-relaxed">
                  Grades 3–5. Structured support with reading, math, and foundational skills that build independent learning habits.
                </p>
              </div>
            </div>

            {/* Middle School - Non-clickable */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
                  <BookOpen className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Middle School</h3>
                <p className="text-slate-600 leading-relaxed">
                  Grades 6–8. Study guides, homework help, and concept explanations that support growing independence.
                </p>
              </div>
            </div>

            {/* High School - Non-clickable */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
                  <GraduationCap className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-3">High School</h3>
                <p className="text-slate-600 leading-relaxed">
                  Grades 9–12. Advanced coursework support, essay help, and exam preparation for college readiness.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              How It Works
            </h2>
            <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto">
              Get started in minutes
            </p>
          </div>

          <div className="max-w-5xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Step 1 */}
              <div className="text-center relative">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">
                  1
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Create account</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Sign up with email. Quick and secure.
                </p>
                <ChevronRight className="hidden md:block absolute top-8 -right-4 w-6 h-6 text-slate-300" />
              </div>

              {/* Step 2 */}
              <div className="text-center relative">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">
                  2
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Add student profile(s)</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Create profiles during onboarding or add more later.
                </p>
                <ChevronRight className="hidden md:block absolute top-8 -right-4 w-6 h-6 text-slate-300" />
              </div>

              {/* Step 3 */}
              <div className="text-center relative">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">
                  3
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Land in dashboard</h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-1">
                  Students land in the Readiness dashboard.
                </p>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Personalized dashboards automatically.
                </p>
                <ChevronRight className="hidden md:block absolute top-8 -right-4 w-6 h-6 text-slate-300" />
              </div>

              {/* Step 4 */}
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-full flex items-center justify-center mx-auto mb-4 text-white text-2xl font-bold shadow-lg">
                  4
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">Switch profiles anytime</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Multiple students? Use the profile selector to switch between learners.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 sm:py-20 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4 tracking-tight">
              Simple pricing for individuals and families
            </h2>
          </div>

          {/* Billing Period Toggle */}
          <div className="flex justify-center mb-8">
            <div className="inline-flex items-center gap-2 bg-white border-2 border-teal-300 rounded-2xl p-1.5 shadow-lg shadow-teal-200/60">
              <button
                onClick={() => setBillingPeriod('monthly')}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 ${
                  billingPeriod === 'monthly'
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-500/30'
                    : 'text-teal-700 hover:text-teal-900 hover:bg-teal-50'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingPeriod('annual')}
                className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-600 focus:ring-offset-2 ${
                  billingPeriod === 'annual'
                    ? 'bg-teal-600 text-white shadow-md shadow-teal-500/30'
                    : 'text-teal-700 hover:text-teal-900 hover:bg-teal-50'
                }`}
              >
                Annual
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 max-w-4xl mx-auto">
            {/* Individual Plan */}
            <div className="bg-white border-2 border-slate-200 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Individual Plan</h3>
                <div className="mb-2">
                  {billingPeriod === 'monthly' ? (
                    <>
                      <span className="text-5xl font-bold text-slate-900">$9.99</span>
                      <span className="text-lg text-slate-600 ml-1">/ month</span>
                    </>
                  ) : (
                    <>
                      <span className="text-5xl font-bold text-slate-900">$89</span>
                      <span className="text-lg text-slate-600 ml-1">/ year</span>
                    </>
                  )}
                </div>
                {billingPeriod === 'monthly' ? (
                  <p className="text-sm text-teal-700 font-semibold mb-1">Annual: $89 / year</p>
                ) : (
                  <p className="text-sm text-teal-700 font-semibold mb-1">Pay for 9 months, get 12</p>
                )}
                {billingPeriod === 'annual' && (
                  <p className="text-xs text-slate-600">3 months free, includes summer</p>
                )}
              </div>
              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm">1 student profile</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm">Step-by-step homework help</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm">Personalized readiness dashboard</span>
                </div>
              </div>
              <Link
                href="/signup"
                className="block w-full px-6 py-3.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold text-center hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Get Started
              </Link>
            </div>

            {/* Family Plan - Most Popular */}
            <div className="bg-gradient-to-br from-teal-50/50 via-slate-50 to-teal-50/50 border-2 border-teal-300 rounded-2xl p-8 shadow-lg hover:shadow-xl transition-shadow relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-teal-600 text-white text-[10px] px-2.5 py-0.5 rounded-full font-semibold shadow-lg">
                  Most Popular
                </span>
              </div>
              <div className="text-center mb-6 mt-2">
                <h3 className="text-2xl font-bold text-slate-900 mb-3">Family Plan</h3>
                <div className="mb-2">
                  {billingPeriod === 'monthly' ? (
                    <>
                      <span className="text-5xl font-bold text-slate-900">$19.99</span>
                      <span className="text-lg text-slate-600 ml-1">/ month</span>
                    </>
                  ) : (
                    <>
                      <span className="text-5xl font-bold text-slate-900">$179</span>
                      <span className="text-lg text-slate-600 ml-1">/ year</span>
                    </>
                  )}
                </div>
                {billingPeriod === 'monthly' ? (
                  <p className="text-sm text-teal-700 font-semibold mb-1">Annual: $179 / year</p>
                ) : (
                  <p className="text-sm text-teal-700 font-semibold mb-1">Less than $15/month per child</p>
                )}
                {billingPeriod === 'annual' && (
                  <p className="text-xs text-slate-600">3 months free, includes summer</p>
                )}
              </div>
              <div className="space-y-3 mb-8">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm">Up to 4 student profiles</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm">One parent account</span>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 text-sm">Easy profile switching</span>
                </div>
              </div>
              <Link
                href="/signup"
                className="block w-full px-6 py-3.5 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold text-center hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-md hover:shadow-lg"
              >
                Get Started
              </Link>
            </div>
          </div>

          <div className="text-center mt-8 space-y-2">
            {billingPeriod === 'annual' && (
              <p className="text-sm text-slate-600 font-medium">
                Includes summer — 3 months free
              </p>
            )}
            <p className="text-sm text-slate-500">
              Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 sm:py-20 md:py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <Accordion items={faqItems} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-16 sm:py-20 md:py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-t-3xl">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-4 sm:mb-6 tracking-tight">
            Make tonight's homework easier.
          </h2>
          <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto mb-8 sm:mb-10">
            Get started in minutes.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-semibold text-lg hover:from-teal-700 hover:to-cyan-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              Get Started
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-4 bg-slate-700/50 text-white border-2 border-slate-600/50 rounded-xl font-semibold text-lg hover:bg-slate-600/50 hover:border-slate-500/50 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Log In
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
