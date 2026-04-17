'use client'

import { FoundingSignupForm } from '@/components/founding-signup-form'
import { CheckCircle2, Heart, MessageSquare, Shield } from 'lucide-react'
import Link from 'next/link'

const benefits = [
  { icon: Heart, text: '90 days completely free — no credit card, no catch' },
  { icon: MessageSquare, text: 'Direct line to the founder. Reply to any email.' },
  { icon: Shield, text: 'Your feedback shapes the product before public launch' },
  { icon: CheckCircle2, text: 'Keep going at $14.99/mo or walk away — no charge' },
]

export default function FoundingPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white">
            ForgeStudy AI
          </Link>
          <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">
            Already have an account? Sign in
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="max-w-lg w-full space-y-8">
          {/* Hero */}
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 bg-amber-900/30 border border-amber-700/50 rounded-full px-4 py-1.5">
              <span className="text-amber-400 text-sm font-medium">🚀 Founding Families</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-white">
              90 days free. No credit card. No catch.
            </h1>
            <p className="text-slate-400 text-base max-w-md mx-auto">
              We're inviting 20 families to use ForgeStudy AI free for 90 days. 
              In return, we ask for honest feedback — what works, what doesn't, 
              what your kid actually said when they used it.
            </p>
          </div>

          {/* Benefits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {benefits.map((b) => (
              <div key={b.text} className="flex items-start gap-2.5 bg-slate-900/60 border border-slate-800 rounded-lg p-3">
                <b.icon className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-slate-300">{b.text}</span>
              </div>
            ))}
          </div>

          {/* Signup Form */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
            <FoundingSignupForm />
          </div>

          {/* Footer link */}
          <p className="text-center text-sm text-slate-500">
            Not sure yet?{' '}
            <Link href="/signup" className="text-indigo-400 hover:text-indigo-300">
              Start a regular 14-day free trial instead →
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
