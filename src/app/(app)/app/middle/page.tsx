'use client'

import Link from 'next/link'
import { Compass, Target, Layers } from 'lucide-react'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'

export default function MiddleDashboardPage() {
  const { activeProfileId } = useActiveProfile()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-cyan-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="flex flex-col gap-10">
          <section className="rounded-3xl border border-slate-200/70 bg-white/90 shadow-xl shadow-slate-200/40 p-8 sm:p-10">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-cyan-100/80 text-cyan-700 text-xs font-semibold px-3 py-1 mb-4">
                  ForgeMiddle • Grades 6–8
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">
                  Clear structure for growing study skills
                </h1>
                <p className="text-slate-600 text-base sm:text-lg max-w-2xl">
                  Step-by-step guidance for tougher concepts, with coaching that builds independence.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <Link
                  href="/tutor"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow-lg hover:from-teal-700 hover:to-cyan-700 transition-all"
                >
                  Start a session
                </Link>
                <Link
                  href="/sources"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                >
                  Add class materials
                </Link>
              </div>
            </div>
            {!activeProfileId && (
              <div className="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Choose a student profile to personalize examples and pacing.
              </div>
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: 'Continue where you left off',
                description: 'Jump back into your last session with quick context.',
                href: '/tutor',
                action: 'Resume session',
              },
              {
                title: 'Start a new map',
                description: 'Open the tutor and build a map for today’s topic.',
                href: '/tutor',
                action: 'Start a new map',
              },
              {
                title: 'Tonight’s plan',
                description: 'Get a short, focused study plan for tonight.',
                href: '/tutor',
                action: 'Build a plan',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-cyan-100 bg-white/90 p-6 shadow-md shadow-slate-200/40"
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
                icon: Compass,
                title: 'Guided problem solving',
                description: 'Organize steps, highlight key clues, and build confidence on tricky topics.',
              },
              {
                icon: Target,
                title: 'Study habits',
                description: 'Create simple plans, checklists, and short practice to stay consistent.',
              },
              {
                icon: Layers,
                title: 'Concept connections',
                description: 'Show how ideas link across subjects so learning feels cohesive.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-200/70 bg-white/80 p-6 shadow-md shadow-slate-200/40"
              >
                <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center mb-4">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-2">{item.title}</h3>
                <p className="text-sm text-slate-600">{item.description}</p>
              </div>
            ))}
          </section>

          <section className="rounded-3xl border border-slate-200/70 bg-white/90 p-8 sm:p-10 shadow-lg shadow-slate-200/40">
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">A steady rhythm for middle school</h2>
            <p className="text-slate-600 mb-4">
              We keep students on track with a predictable flow: preview, guided practice, then quick checks.
            </p>
            <div className="grid gap-3 text-sm text-slate-600">
              <div>1. Preview the concept in a 2-minute overview.</div>
              <div>2. Work through examples with clear checkpoints.</div>
              <div>3. Finish with a short reflection or practice quiz.</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
