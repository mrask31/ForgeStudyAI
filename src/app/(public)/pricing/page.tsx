'use client'

import Link from 'next/link'
import { CheckCircle2, ArrowRight } from 'lucide-react'
import { FoundingFamiliesBanner } from '@/components/founding-families-banner'

const individualFeatures = [
  '1 student profile',
  'Everything unlimited',
  'Parent weekly email',
]

const familyFeatures = [
  'Up to 4 student profiles',
  'Everything unlimited, per kid',
  'One parent email covering all of them',
]

const comparisonRows = [
  { label: 'Price', others: '$50-$120/hr or free', forge: '$14.99/mo' },
  { label: 'Method', others: 'Gives the answer', forge: 'Socratic — guides, never gives' },
  { label: 'Safety', others: 'Open internet', forge: 'COPPA-compliant, no community' },
  { label: 'Auto-charge', others: 'Yes, usually', forge: 'Never. You opt in.' },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <FoundingFamiliesBanner />

      <header className="border-b border-slate-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-xl font-bold text-white">ForgeStudy AI</Link>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm text-slate-400 hover:text-white transition-colors">Sign in</Link>
            <Link href="/signup" className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors">
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-16 space-y-16">
        {/* Hero */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold text-white">Simple pricing. Try free first.</h1>
          <p className="text-slate-400 max-w-lg mx-auto">
            14-day free trial. No credit card. No cancellation department. We don't charge you until you say yes.
          </p>
        </div>

        {/* Tiers */}
        <div className="grid md:grid-cols-3 gap-6">
          {/* Free Trial */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Free Trial</h3>
            <div className="text-3xl font-bold text-white">$0 <span className="text-base font-normal text-slate-500">for 14 days</span></div>
            <p className="text-slate-400 text-sm">Full access. No credit card. Start here.</p>
            <Link
              href="/signup"
              className="block w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium text-center transition-colors"
            >
              Try Free First <ArrowRight className="inline w-4 h-4 ml-1" />
            </Link>
          </div>

          {/* Individual */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-white">Individual</h3>
            <div className="text-3xl font-bold text-white">$14.99<span className="text-base font-normal text-slate-500">/mo</span></div>
            <p className="text-slate-500 text-xs">or $129.99/year (save 28%)</p>
            <ul className="space-y-2">
              {individualFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {f}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">14-day free trial. No credit card. Opt in to continue.</p>
          </div>

          {/* Family */}
          <div className="bg-slate-900/60 border-2 border-indigo-500 rounded-2xl p-6 space-y-4 relative">
            <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">Most Popular</span>
            <h3 className="text-lg font-semibold text-white">Family</h3>
            <div className="text-3xl font-bold text-white">$29.99<span className="text-base font-normal text-slate-500">/mo</span></div>
            <p className="text-slate-500 text-xs">or $249.99/year (save 31%)</p>
            <ul className="space-y-2">
              {familyFeatures.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {f}
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">14-day free trial. No credit card. Opt in to continue.</p>
          </div>
        </div>

        {/* Comparison */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-white text-center">Why this beats what you've tried</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-slate-500 font-medium"></th>
                  <th className="text-left py-3 px-4 text-slate-500 font-medium">Other apps</th>
                  <th className="text-left py-3 px-4 text-indigo-400 font-medium">ForgeStudy AI</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label} className="border-b border-slate-800/50">
                    <td className="py-3 px-4 text-slate-400 font-medium">{row.label}</td>
                    <td className="py-3 px-4 text-slate-500">{row.others}</td>
                    <td className="py-3 px-4 text-white font-medium">{row.forge}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Guarantee */}
        <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-center max-w-2xl mx-auto">
          <p className="text-slate-300 text-sm leading-relaxed">
            Free for 14 days. We don't ask for a card up front. We don't auto-charge. 
            On day 13 we email you — you subscribe or you don't. If you paid annually 
            later and change your mind in 30 days, full refund. No forms. No survey. 
            No cancellation department.
          </p>
        </div>
      </main>
    </div>
  )
}
