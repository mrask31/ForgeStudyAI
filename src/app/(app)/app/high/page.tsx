'use client'

import Link from 'next/link'
import { GraduationCap, ClipboardList, Timer } from 'lucide-react'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'

export default function HighDashboardPage() {
  const { activeProfileId } = useActiveProfile()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex flex-col gap-10">
          <section className="rounded-3xl border border-slate-200/70 bg-white/90 shadow-xl shadow-slate-200/40 p-8 sm:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 text-emerald-700 text-xs font-semibold px-3 py-1 mb-4">
                  ForgeHigh • Grades 9–12
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
                  Focused support for higher-level coursework
                </h1>
                <p className="text-slate-600 text-base sm:text-lg max-w-2xl">
                  Clear explanations, exam prep, and writing support so students feel ready.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href="/tutor"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-lg hover:from-emerald-700 hover:to-teal-700 transition-all"
                >
                  Start a session
                </Link>
                <Link
                  href="/sources"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Add course materials
                </Link>
              </div>
            </div>
            {!activeProfileId && (
              <div className="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Choose a student profile to tailor pacing and assignments.
              </div>
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Continue where you left off',
                description: 'Return to your last session with quick context.',
                href: '/tutor',
                action: 'Resume session',
              },
              {
                title: 'Start a new map',
                description: 'Build a fresh concept map for today’s subject.',
                href: '/tutor',
                action: 'Start a new map',
              },
              {
                title: 'Tonight’s plan',
                description: 'Create a short study plan for what’s due next.',
                href: '/tutor',
                action: 'Build a plan',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-emerald-100 bg-white/90 p-6 shadow-md shadow-slate-200/40"
              >
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600 mb-4">{item.description}</p>
                <Link
                  href={item.href}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
                >
                  {item.action}
                </Link>
              </div>
            ))}
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: ClipboardList,
                title: 'Assignment breakdowns',
                description: 'Turn rubrics into checklists and make long projects feel manageable.',
              },
              {
                icon: Timer,
                title: 'Exam preparation',
                description: 'Targeted practice with time-boxed strategy and review.',
              },
              {
                icon: GraduationCap,
                title: 'College-ready writing',
                description: 'Strengthen essays with clear structure and feedback loops.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-md shadow-slate-200/40"
              >
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-8 sm:p-10 shadow-lg shadow-slate-200/40">
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Support for college readiness</h2>
            <p className="text-slate-600 mb-4">
              We help students map out the next step, stay accountable, and build confidence with every session.
            </p>
            <div className="grid gap-3 text-sm text-slate-600">
              <div>Quick goal setting to prioritize what matters most.</div>
              <div>Guided practice with feedback prompts and reflection.</div>
              <div>Session recaps parents can review together.</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
