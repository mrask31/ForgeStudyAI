'use client'

import Link from 'next/link'
import { BookOpen } from 'lucide-react'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'

export default function MiddleSchoolPage() {
  const { activeProfileId } = useActiveProfile()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="bg-white/80 backdrop-blur-sm border border-slate-200/60 rounded-2xl p-8 sm:p-10 shadow-lg text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-teal-100 to-cyan-100 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
            <BookOpen className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
            Middle School Dashboard
          </h1>
          <p className="text-base sm:text-lg text-slate-600 mb-6">
            Structured support for Grades 6–8 with clear explanations and confidence building.
          </p>
          {activeProfileId && (
            <p className="text-sm text-slate-500 mb-6">
              Active profile selected
            </p>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/profiles"
              className="px-6 py-3 bg-gradient-to-r from-teal-700 to-teal-600 text-white rounded-xl font-semibold hover:from-teal-800 hover:to-teal-700 transition-colors shadow-md"
            >
              Switch profile
            </Link>
            <Link
              href="/profiles/new?band=middle"
              className="px-6 py-3 border-2 border-slate-300 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-colors"
            >
              Add student profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
