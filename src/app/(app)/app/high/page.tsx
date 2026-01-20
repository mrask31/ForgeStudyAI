'use client'

import Link from 'next/link'
import { GraduationCap, ClipboardList, Timer, FileText, BookOpenCheck, PenSquare } from 'lucide-react'
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
                  Performance + precision for serious study
                </h1>
                <p className="text-slate-600 text-base sm:text-lg max-w-2xl">
                  Fast, focused support for exams, essays, and mastery.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-5 py-4">
                  <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wide mb-2">Start here</p>
                  <Link
                    href="/study-topics"
                    className="inline-flex items-center justify-center w-full px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-lg hover:from-emerald-700 hover:to-teal-700 transition-all"
                  >
                    Build a study topic
                  </Link>
                </div>
                <Link
                  href="/tutor"
                  className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-lg hover:from-emerald-700 hover:to-teal-700 transition-all"
                >
                  Start a session
                </Link>
              </div>
            </div>
            {!activeProfileId && (
              <div className="mt-6 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                Choose a student profile to tailor pacing and assignments.
              </div>
            )}
          </section>

          <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                title: 'Build a study topic',
                description: 'Group maps, practice, and notes in one place.',
                href: '/study-topics',
                action: 'Open topics',
              },
              {
                title: 'Upload course materials',
                description: 'Add notes, slides, or PDFs to fuel your sessions.',
                href: '/sources',
                action: 'Upload files',
              },
              {
                title: 'Generate exam sheet',
                description: 'Create a one-page review from today’s work.',
                href: '/tutor',
                action: 'Generate sheet',
              },
              {
                title: 'Start mixed review',
                description: 'Quick practice to surface weak spots fast.',
                href: '/tutor',
                action: 'Start review',
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

          <section className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: FileText,
                title: 'Instant Study Map',
                description: 'Turn a topic into a fast, structured plan.',
              },
              {
                icon: BookOpenCheck,
                title: 'Exam Sheet Builder',
                description: 'Generate a printable sheet for test prep.',
              },
              {
                icon: Timer,
                title: 'Practice Tests',
                description: 'Timed review with common traps.',
              },
              {
                icon: PenSquare,
                title: 'Writing Lab',
                description: 'Thesis, outline, and revision maps.',
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
            <h2 className="text-2xl font-semibold text-slate-900 mb-3">Focus on fastest wins</h2>
            <p className="text-slate-600 mb-4">
              Prioritize what moves your grade the most with clear next steps.
            </p>
            <div className="grid gap-3 text-sm text-slate-600">
              <div>Keep topics tight and map the weakest areas first.</div>
              <div>Commit to answers before checking logic.</div>
              <div>Use exam sheets to consolidate midterm and final prep.</div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
