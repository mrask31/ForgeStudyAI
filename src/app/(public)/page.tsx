'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { LandingBetaBanner } from '@/components/beta/LandingBetaBanner'
import {
  ArrowRight,
  Sparkles,
  Zap,
  Shield,
} from 'lucide-react'
import { Accordion } from '@/components/ui/accordion'

export default function HomePage() {
  const [betaSpots, setBetaSpots] = useState<number | null>(null)
  
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.has('code')) {
      const targetUrl = new URL('/auth/callback', window.location.origin)
      targetUrl.search = params.toString()
      window.location.replace(targetUrl.toString())
      return
    }
    fetch('/api/beta').then(r => r.json()).then(d => setBetaSpots(d.spotsRemaining ?? null)).catch(() => {})
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
      {/* Beta Banner — pinned to top */}
      <LandingBetaBanner />

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
            <Link href="/" className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-400" />
              <span className="text-xl font-bold text-slate-100">ForgeStudy</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-slate-100 transition-colors"
              >
                Sign in →
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
            Your child isn't learning. They're outsourcing.
          </h1>

          {/* Subheadline */}
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mt-6 mb-12">
            ForgeStudy is the AI tutor that refuses to give the answer. It forces your child to think — and mathematically guarantees they'll remember.
          </p>

          {/* Plan-First Split */}
          <p className="text-lg text-slate-500 uppercase tracking-wider font-semibold mb-8">Choose your plan</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-2xl mx-auto mb-6">
            {/* 1 Student */}
            <Link
              href="/signup?flow=parent&plan=individual"
              className="group p-6 bg-slate-900/60 border border-slate-700 hover:border-indigo-500/50 rounded-2xl text-left transition-all hover:shadow-[0_0_30px_rgba(99,102,241,0.15)]"
            >
              <span className="text-2xl mb-2 block">👤</span>
              <h3 className="text-lg font-bold text-slate-100 mb-0.5">1 Student</h3>
              <p className="text-xs text-slate-400 mb-4">Grades 6–12 · One student, one account</p>
              <p className="text-2xl font-bold text-white mb-0.5">$14.99<span className="text-sm font-normal text-slate-400">/mo</span></p>
              <p className="text-xs text-slate-500 mb-5">or $129.99/yr</p>
              <span className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors group-hover:gap-2">
                Get Started <ArrowRight className="w-4 h-4" />
              </span>
            </Link>

            {/* Up to 4 Students */}
            <Link
              href="/signup?flow=parent&plan=family"
              className="group relative p-6 bg-slate-900/60 border-2 border-[#c9a96e]/50 hover:border-[#c9a96e]/80 rounded-2xl text-left transition-all hover:shadow-[0_0_30px_rgba(201,169,110,0.15)]"
            >
              <div className="absolute -top-3 right-4 bg-[#c9a96e] text-[#08080F] text-[10px] font-bold px-2.5 py-0.5 rounded-full">Most Popular</div>
              <span className="text-2xl mb-2 block">👨‍👩‍👧‍👦</span>
              <h3 className="text-lg font-bold text-slate-100 mb-0.5">Up to 4 Students</h3>
              <p className="text-xs text-slate-400 mb-4">Grades 6–12 · One account, multiple kids</p>
              <p className="text-2xl font-bold text-white mb-0.5">$29.99<span className="text-sm font-normal text-slate-400">/mo</span></p>
              <p className="text-xs text-slate-500 mb-5">or $249.99/yr</p>
              <span className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-[#c9a96e] hover:bg-[#d4b87a] text-[#08080F] rounded-xl text-sm font-bold transition-colors group-hover:gap-2">
                Get Started <ArrowRight className="w-4 h-4" />
              </span>
            </Link>
          </div>

          <p className="text-sm text-slate-500 text-center mb-16">
            Are you a high schooler signing up yourself?{' '}
            <Link href="/signup?flow=student&plan=individual" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Start here →
            </Link>
          </p>

        </div>
      </section>

      {/* The Moment Parents Recognize */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-slate-900/60 border-l-4 border-indigo-500 p-8 md:p-12 rounded-2xl shadow-[0_0_30px_rgba(99,102,241,0.1)]">
            <p className="text-xl md:text-2xl text-slate-200 leading-relaxed">
              They got an A on the assignment. You were proud. Then you asked them to explain it. They couldn't. <span className="text-indigo-400 font-semibold">ForgeStudy closes that gap — permanently.</span>
            </p>
          </div>
        </div>
      </section>

      {/* Paradigm Shift - Problem/Solution */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* The Problem */}
          <div className="bg-slate-900/40 border border-rose-900/50 p-8 rounded-3xl">
            <h3 className="text-2xl font-bold text-rose-400 mb-4">The ChatGPT Trap.</h3>
            <p className="text-slate-300 leading-relaxed">
              Your child types a question. The AI writes the answer. They copy, paste, and submit. They learned nothing — but they feel like they did. That's the most dangerous kind of failure.
            </p>
          </div>

          {/* The Solution */}
          <div className="bg-slate-900/60 border border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.1)] p-8 rounded-3xl">
            <h3 className="text-2xl font-bold text-indigo-400 mb-4">The AI That Fights Back.</h3>
            <p className="text-slate-300 leading-relaxed">
              ForgeStudy's Logic Loom uses Socratic sparring. It won't reveal the answer until your child proves they understand the concept. Every session ends with verified comprehension — not just completed homework.
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
              Watch their knowledge physically grow as gray nodes turn indigo — proof of real mastery, visible in real time.
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
              Drop any syllabus, PDF, or photo of a whiteboard. ForgeStudy builds their entire study universe in seconds.
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
              The SM-2 algorithm tracks exactly when a memory is about to fade — and snaps it back before it does. No cramming. Ever.
            </p>
          </div>
        </div>
      </section>

      {/* Social Proof - Trust Signals */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {/* Stat 1 */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-indigo-400 mb-3">SM-2 Algorithm</h3>
            <p className="text-slate-300 leading-relaxed">
              The same spaced repetition science used by medical students worldwide
            </p>
          </div>

          {/* Stat 2 */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-indigo-400 mb-3">Socratic Method</h3>
            <p className="text-slate-300 leading-relaxed">
              2,400 years of proven teaching — now running at AI speed
            </p>
          </div>

          {/* Stat 3 */}
          <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-2xl p-8 text-center">
            <h3 className="text-2xl font-bold text-indigo-400 mb-3">Zero Answer Leaking</h3>
            <p className="text-slate-300 leading-relaxed">
              ForgeStudy cannot write your child's essay. It is architecturally impossible.
            </p>
          </div>
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
    </div>
  )
}
