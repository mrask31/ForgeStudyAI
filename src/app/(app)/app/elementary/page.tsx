'use client'

import Link from 'next/link'
import { Sparkles, BookOpenCheck, PenLine, Shapes } from 'lucide-react'
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
                  Calm, joyful learning support for younger learners
                </h1>
                <p className="text-slate-600 text-base sm:text-lg max-w-2xl">
                  Short steps, friendly explanations, and confidence-building practice that keeps kids engaged.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href="/tutor"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow-lg hover:from-teal-700 hover:to-cyan-700 transition-all"
                >
                  Start a guided lesson
                </Link>
                <Link
                  href="/sources"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Add learning materials
                </Link>
                <div className="rounded-xl border border-teal-100 bg-teal-50/70 px-4 py-2 text-xs text-teal-800">
                  Map-first: we show a simple study map before practice.
                </div>
              </div>
            </div>
            {!activeProfileId && (
              <div className="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Choose a student profile to personalize examples and grade-level support.
              </div>
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Continue where you left off',
                description: 'Pick up your last session and keep the momentum going.',
                href: '/tutor',
                action: 'Resume session',
              },
              {
                title: 'Start a new map',
                description: 'Open the tutor and build a simple map for today’s topic.',
                href: '/tutor',
                action: 'Start a new map',
              },
              {
                title: 'Tonight’s plan',
                description: 'Get a quick plan for what to study tonight.',
                href: '/tutor',
                action: 'Build a plan',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-teal-100 bg-white/90 p-6 shadow-md shadow-slate-200/40"
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 mb-4">{item.description}</p>
                <Link
                  href={item.href}
                  className="inline-flex items-center justify-center rounded-xl bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
                >
                  {item.action}
                </Link>
              </div>
            ))}
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: BookOpenCheck,
                title: 'Reading comprehension',
                description: 'Break passages into small steps and highlight the main idea together.',
              },
              {
                icon: PenLine,
                title: 'Spelling & writing',
                description: 'Practice tricky words with gentle prompts and phonics-based tips.',
              },
              {
                icon: Shapes,
                title: 'Math foundations',
                description: 'Build confidence with number sense, word problems, and visual models.',
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
          </section>

          <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-8 sm:p-10 shadow-lg shadow-slate-200/40">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-teal-700" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">How ForgeStudy helps at home</h2>
                <p className="text-slate-600 mb-4">
                  We keep lessons short, encouraging, and easy for parents to support.
                </p>
                <ul className="grid gap-3 text-sm text-slate-600">
                  <li>Daily 10–15 minute micro-sessions to keep momentum.</li>
                  <li>Simple explanations kids can repeat back confidently.</li>
                  <li>Practice questions that feel like games, not tests.</li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
