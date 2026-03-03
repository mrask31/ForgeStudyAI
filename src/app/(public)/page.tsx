'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  Shield,
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
      answer: "ForgeStudy adapts its teaching style, vocabulary, and complexity to match each student's grade band. Middle school students receive structured guidance and study foundations. High school students get advanced support aligned with college-prep coursework."
    },
    {
      question: "Can parents manage multiple students?",
      answer: "Yes. With the Family Plan, one parent account can manage up to 4 student profiles. Each student gets their own personalized dashboard and learning experience. You can easily switch between profiles to check progress for each student."
    },
    {
      question: "What happens after I sign up?",
      answer: "After signing up, you'll create your first student profile (Grades 6–8 or Grades 9–12). If you have one profile, you'll go straight to that student's dashboard. If you create multiple profiles, you'll see a profile selector to choose which student to work with."
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

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.answer,
      },
    })),
  }

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'ForgeStudy',
    url: 'https://www.forgestudyai.com',
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([orgSchema, faqSchema]),
        }}
      />

      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-50 bg-slate-950/70 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-indigo-400" />
              <span className="text-xl font-bold text-slate-100">ForgeStudy</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors"
              >
                Log In
              </Link>
              <Link
                href="/signup"
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-semibold text-sm transition-colors shadow-lg shadow-indigo-500/20"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-24">
        <div className="text-center max-w-5xl mx-auto">
          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-slate-100 to-slate-400 tracking-tight mb-6">
            The AI tutor that refuses to cheat.
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mt-6 mb-12">
            Standard AI just gives your child the answers. ForgeStudy is a spatial operating system that maps their brain, forces critical thinking through Socratic sparring, and mathematically guarantees memory retention.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link
              href="/signup"
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full font-medium text-lg transition-all shadow-[0_0_30px_rgba(99,102,241,0.3)] hover:shadow-[0_0_40px_rgba(99,102,241,0.4)] flex items-center gap-2"
            >
              Unlock Their Galaxy
              <ArrowRight className="w-5 h-5" />
            </Link>
            <button className="px-8 py-4 bg-slate-900/60 backdrop-blur-md border border-slate-700 hover:border-indigo-500/50 text-slate-200 rounded-full font-medium text-lg transition-all">
              See how it works
            </button>
          </div>

          {/* Hero Visual - Video or Placeholder */}
          <div className="w-full max-w-6xl h-[600px] mx-auto mt-12 rounded-2xl border border-slate-800 shadow-[0_0_50px_rgba(99,102,241,0.2)] bg-slate-900/50 backdrop-blur-md overflow-hidden">
            {/* 
              TO INTEGRATE YOUR RECORDED VIDEO:
              1. Record the Galaxy UI following the shot list (Pan → Weave → Focus Panel)
              2. Compress the video for web (H.264 MP4 + WebM for compatibility)
              3. Place video files in: public/hero-galaxy-demo.mp4 and public/hero-galaxy-demo.webm
              4. Uncomment the <video> tag below and remove the placeholder div
            */}
            
            {/* VIDEO INTEGRATION (uncomment when ready): */}
            {/* <video 
              autoPlay 
              loop 
              muted 
              playsInline
              className="w-full h-full object-cover"
              poster="/hero-galaxy-poster.jpg"
            >
              <source src="/hero-galaxy-demo.webm" type="video/webm" />
              <source src="/hero-galaxy-demo.mp4" type="video/mp4" />
              Your browser does not support the video tag.
            </video> */}
            
            {/* PLACEHOLDER (remove when video is ready): */}
            <div className="w-full h-full flex items-center justify-center">
              <div className="text-center">
                <Sparkles className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                <p className="text-slate-400 text-lg font-semibold">Galaxy UI Sizzle Reel</p>
                <p className="text-slate-500 text-sm mt-2">Record: Pan → Weave Mode → Focus Panel</p>
                <p className="text-slate-600 text-xs mt-4 max-w-md mx-auto">
                  Use OBS Studio or QuickTime to capture 1080p+ footage.<br />
                  Compress with HandBrake (H.264, CRF 23) for web delivery.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Paradigm Shift - Problem/Solution */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* The Old Way */}
          <div className="bg-slate-900/40 border border-rose-900/50 p-8 rounded-3xl">
            <h3 className="text-2xl font-bold text-rose-400 mb-4">The ChatGPT Trap.</h3>
            <p className="text-slate-300 leading-relaxed">
              Kids type a question. The AI writes the essay. They copy, paste, and learn absolutely nothing. It is a digital crutch.
            </p>
          </div>

          {/* The ForgeStudy Way */}
          <div className="bg-slate-900/60 border border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.1)] p-8 rounded-3xl">
            <h3 className="text-2xl font-bold text-indigo-400 mb-4">Cryptographic Proof of Cognition.</h3>
            <p className="text-slate-300 leading-relaxed">
              Our Logic Loom uses Socratic sparring. It won't give the answer until your child proves they understand the concept. We turn passive reading into active mental warfare.
            </p>
          </div>
        </div>
      </section>

      {/* Engine Showcase - 3 Feature Pillars */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-100 mb-4">
            The V2 Engine
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Three systems working in perfect harmony to build unstoppable learners.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1: The Galaxy */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-8 hover:border-indigo-500/50 transition-colors">
            <div className="w-12 h-12 bg-indigo-900/50 rounded-xl flex items-center justify-center mb-6">
              <Sparkles className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">The Galaxy</h3>
            <p className="text-lg font-semibold text-indigo-400 mb-3">Visualized Mastery</p>
            <p className="text-slate-400 leading-relaxed">
              Watch their knowledge physically grow. Concepts turn from gray to glowing indigo as they prove mastery, building unstoppable intrinsic motivation.
            </p>
          </div>

          {/* Card 2: The Airlock */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-8 hover:border-indigo-500/50 transition-colors">
            <div className="w-12 h-12 bg-indigo-900/50 rounded-xl flex items-center justify-center mb-6">
              <Zap className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">The Airlock</h3>
            <p className="text-lg font-semibold text-indigo-400 mb-3">Instant Intake</p>
            <p className="text-slate-400 leading-relaxed">
              Drop chaotic syllabi, PDFs, and whiteboard photos into the Airlock. Our AI instantly decontaminates it into a structured, clickable universe.
            </p>
          </div>

          {/* Card 3: The Vault */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-3xl p-8 hover:border-indigo-500/50 transition-colors">
            <div className="w-12 h-12 bg-indigo-900/50 rounded-xl flex items-center justify-center mb-6">
              <Shield className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-2xl font-bold text-slate-100 mb-4">The Vault</h3>
            <p className="text-lg font-semibold text-indigo-400 mb-3">Guaranteed Memory</p>
            <p className="text-slate-400 leading-relaxed">
              Powered by the SM-2 Spaced Repetition algorithm. Before a memory fades, the Vault triggers a snap-back review, mathematically eliminating test-day anxiety.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-100 mb-4">
            Simple pricing for individuals and families
          </h2>
        </div>

        {/* Billing Period Toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex items-center gap-2 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5">
            <button
              onClick={() => setBillingPeriod('monthly')}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                billingPeriod === 'monthly'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingPeriod('annual')}
              className={`px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                billingPeriod === 'annual'
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Annual
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Individual Plan */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-8 shadow-xl">
            <div className="text-center mb-6">
              <h3 className="text-2xl font-bold text-slate-100 mb-3">Individual Plan</h3>
              <div className="mb-2">
                {billingPeriod === 'monthly' ? (
                  <>
                    <span className="text-5xl font-bold text-slate-100">$9.99</span>
                    <span className="text-lg text-slate-400 ml-1">/ month</span>
                  </>
                ) : (
                  <>
                    <span className="text-5xl font-bold text-slate-100">$89</span>
                    <span className="text-lg text-slate-400 ml-1">/ year</span>
                  </>
                )}
              </div>
              {billingPeriod === 'monthly' ? (
                <p className="text-sm text-indigo-400 font-semibold mb-1">Annual: $89 / year</p>
              ) : (
                <p className="text-sm text-indigo-400 font-semibold mb-1">Pay for 9 months, get 12</p>
              )}
            </div>
            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300 text-sm">1 student profile</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300 text-sm">Step-by-step homework help</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300 text-sm">Personalized readiness dashboard</span>
              </div>
            </div>
            <Link
              href="/signup"
              className="block w-full px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-center transition-all duration-200 shadow-lg shadow-indigo-500/20"
            >
              Get Started
            </Link>
          </div>

          {/* Family Plan - Most Popular */}
          <div className="bg-slate-900/60 backdrop-blur-md border-2 border-indigo-500 rounded-2xl p-8 shadow-[0_0_30px_rgba(99,102,241,0.2)] relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className="bg-indigo-600 text-white text-xs px-3 py-1 rounded-full font-semibold shadow-lg">
                Most Popular
              </span>
            </div>
            <div className="text-center mb-6 mt-2">
              <h3 className="text-2xl font-bold text-slate-100 mb-3">Family Plan</h3>
              <div className="mb-2">
                {billingPeriod === 'monthly' ? (
                  <>
                    <span className="text-5xl font-bold text-slate-100">$19.99</span>
                    <span className="text-lg text-slate-400 ml-1">/ month</span>
                  </>
                ) : (
                  <>
                    <span className="text-5xl font-bold text-slate-100">$179</span>
                    <span className="text-lg text-slate-400 ml-1">/ year</span>
                  </>
                )}
              </div>
              {billingPeriod === 'monthly' ? (
                <p className="text-sm text-indigo-400 font-semibold mb-1">Annual: $179 / year</p>
              ) : (
                <p className="text-sm text-indigo-400 font-semibold mb-1">Less than $15/month per child</p>
              )}
            </div>
            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300 text-sm">Up to 4 student profiles</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300 text-sm">One parent account</span>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-400 flex-shrink-0 mt-0.5" />
                <span className="text-slate-300 text-sm">Easy profile switching</span>
              </div>
            </div>
            <Link
              href="/signup"
              className="block w-full px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold text-center transition-all duration-200 shadow-lg shadow-indigo-500/20"
            >
              Get Started
            </Link>
          </div>
        </div>

        <div className="text-center mt-8">
          <p className="text-sm text-slate-500">Cancel anytime</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold text-slate-100 mb-4">
            Frequently Asked Questions
          </h2>
        </div>

        <Accordion items={faqItems} />
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <span className="text-lg font-bold text-slate-100">ForgeStudy</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-slate-400">
              <Link href="/privacy" className="hover:text-slate-200 transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="hover:text-slate-200 transition-colors">
                Terms
              </Link>
              <span>© 2024 ForgeStudy</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
