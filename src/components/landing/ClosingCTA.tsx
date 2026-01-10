'use client'

import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export default function ClosingCTA() {
  return (
    <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 bg-gradient-to-br from-indigo-50 via-purple-50 to-indigo-50">
      <div className="text-center space-y-6 sm:space-y-8">
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent">
            <span className="hidden sm:inline">Ready to Feel More Confident in Nursing School?</span>
            <span className="sm:hidden">Feel More Confident in Nursing School</span>
          </h2>
          <div className="space-y-2 text-base sm:text-lg md:text-xl text-slate-700 hidden sm:block">
            <p>Try ForgeNursing free and finally understand the why behind the answers.</p>
          </div>
        </div>
        
        <div className="pt-4 sm:pt-6">
          <Link
            href="/signup?plan=monthly"
            className="inline-flex items-center justify-center gap-2 w-full sm:w-auto px-8 sm:px-10 py-3.5 sm:py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg text-base sm:text-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 min-h-[44px] transform hover:scale-105 active:scale-95"
          >
            Start Free Preview
            <ArrowRight className="w-5 h-5 sm:w-6 sm:h-6" />
          </Link>
          <p className="text-sm text-slate-600 mt-3 sm:mt-4">
            7-day free trial. Cancel anytime.
          </p>
        </div>
      </div>
    </section>
  )
}
