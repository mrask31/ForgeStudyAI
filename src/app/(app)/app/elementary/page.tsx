'use client'

import Link from 'next/link'
import { Sparkles, BookOpenCheck, PenLine, Shapes, BookOpen, Type } from 'lucide-react'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'

export default function ElementaryDashboardPage() {
  const { activeProfileId } = useActiveProfile()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex flex-col gap-10">
          <section className="rounded-3xl border border-slate-200/70 bg-white/90 shadow-xl shadow-slate-200/40 p-8 sm:p-10">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-teal-100/80 text-teal-700 text-xs font-semibold px-3 py-1 mb-4">
                  ForgeElementary • Grades 3–5
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
                  Bright, simple learning for younger learners
                </h1>
                <p className="text-slate-600 text-base sm:text-lg max-w-2xl">
                  One clear starting point with friendly practice that keeps kids confident.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-teal-100 bg-teal-50/70 px-5 py-4">
                  <p className="text-xs font-semibold text-teal-800 uppercase tracking-wide mb-2">Start here</p>
                  <Link
                    href="/tutor"
                    className="inline-flex items-center justify-center w-full px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow-lg hover:from-teal-700 hover:to-cyan-700 transition-all"
                  >
                    Start a 5-minute session
                  </Link>
                </div>
                <Link
                  href="/sources"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Upload learning materials
                </Link>
              </div>
            </div>
            {!activeProfileId && (
              <div className="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Choose a student profile to personalize examples and grade-level support.
              </div>
            )}
          </section>

          <section>
            <div className="flex items-center gap-3 mb-4">
              <Sparkles className="w-5 h-5 text-teal-700" />
              <h2 className="text-xl font-semibold text-slate-900">Learn</h2>
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  icon: Type,
                  title: 'Spelling Words',
                  description: 'Practice 5 words at a time with gentle prompts.',
                },
                {
                  icon: BookOpenCheck,
                  title: 'Reading Coach',
                  description: 'Work through passages step-by-step with clear cues.',
                },
                {
                  icon: BookOpen,
                  title: 'Sight Words',
                  description: 'Build fast recognition with short, focused drills.',
                },
                {
                  icon: Shapes,
                  title: 'Math Help',
                  description: 'Friendly explanations with visuals and examples.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-md shadow-slate-200/40"
                >
                  <div className="w-12 h-12 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center mb-4">
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-slate-600">{item.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-8 sm:p-10 shadow-lg shadow-slate-200/40">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-teal-700" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">Homework help, without the stress</h2>
                <p className="text-slate-600 mb-4">
                  Short sessions and calm prompts keep momentum without overwhelm.
                </p>
                <ul className="grid gap-3 text-sm text-slate-600">
                  <li>One question at a time with clear steps.</li>
                  <li>Lots of examples to build confidence fast.</li>
                  <li>Map-first guidance that stays simple.</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
