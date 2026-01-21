'use client'

import Link from 'next/link'
import { Map, Sparkles, ClipboardList, BookOpen, PenLine } from 'lucide-react'
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
                  Your study hub for Grades 6–8
                </h1>
                <p className="text-slate-600 text-base sm:text-lg max-w-2xl">
                  Build a Study Map, practice what matters, and keep homework on track.
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  If you’re not sure, start a Study Map.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-cyan-100 bg-cyan-50/70 px-5 py-4">
                  <p className="text-xs font-semibold text-cyan-800 uppercase tracking-wide mb-2">Start here</p>
                  <Link
                    href="/tutor?tool=study-map"
                    className="inline-flex items-center justify-center w-full px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 text-white font-semibold shadow-lg hover:from-cyan-700 hover:to-teal-700 transition-all"
                  >
                    Open a study map
                  </Link>
                </div>
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
                  Upload class materials
                </Link>
              </div>
            </div>
            {!activeProfileId && (
              <div className="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Choose a student profile to personalize examples and pacing.
              </div>
            )}
          </section>

          <section className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: Map,
                title: 'Study Map',
                description: 'Turn assignments into a step-by-step plan.',
                href: '/tutor?tool=study-map',
                action: 'Build my map',
              },
              {
                icon: Sparkles,
                title: 'Practice Mode',
                description: 'Go from easy to challenge with guided practice.',
                href: '/tutor?tool=practice',
                action: 'Start practice',
              },
              {
                icon: ClipboardList,
                title: 'Homework Helper',
                description: 'Break tonight’s homework into quick steps.',
                href: '/tutor?mode=homework',
                action: 'Plan homework',
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
                <Link
                  href={item.href}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                >
                  {item.action}
                </Link>
              </div>
            ))}
          </section>

          <section className="grid gap-6 md:grid-cols-2">
            {[
              {
                icon: PenLine,
                title: 'Paragraph Builder',
                description: 'Structure strong paragraphs with clear topic + evidence.',
                href: '/tutor?tool=writing',
                action: 'Build a paragraph',
              },
              {
                icon: BookOpen,
                title: 'Reading Coach',
                description: 'Get help understanding passages and questions.',
                href: '/tutor?mode=reading',
                action: 'Start reading',
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
                <Link
                  href={item.href}
                  className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-700 hover:text-cyan-800"
                >
                  {item.action}
                </Link>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  )
}
