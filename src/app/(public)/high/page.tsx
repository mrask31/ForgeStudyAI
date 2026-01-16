import Link from 'next/link'
import { GraduationCap, ClipboardList, Timer, BookOpen } from 'lucide-react'

export default function HighSchoolPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-emerald-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <section className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/80 text-emerald-700 text-xs font-semibold px-3 py-1 mb-5">
            ForgeHigh • Grades 9–12
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Focused support for high school success
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Study smarter with clear explanations, structured practice, and college-ready coaching.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/signup"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-semibold shadow-lg hover:from-emerald-700 hover:to-teal-700 transition-all"
            >
              Get started
            </Link>
            <Link
              href="/checkout"
              className="px-6 py-3 rounded-xl border-2 border-slate-200 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
            >
              See plans
            </Link>
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-3 mb-16">
          {[
            {
              icon: ClipboardList,
              title: 'Assignment breakdowns',
              description: 'Turn rubrics into action plans and manage long projects.',
            },
            {
              icon: Timer,
              title: 'Exam readiness',
              description: 'Targeted practice and review strategies for tests.',
            },
            {
              icon: GraduationCap,
              title: 'College-level writing',
              description: 'Stronger structure, clearer arguments, better feedback.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-md shadow-slate-200/40"
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
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                A smarter weekly study flow
              </h2>
              <p className="text-slate-600 mb-4">
                We help students plan, practice, and refine — without feeling overwhelmed.
              </p>
              <ul className="grid gap-3 text-sm text-slate-600">
                <li>Quick planning to prioritize the highest-impact tasks.</li>
                <li>Guided practice with explanations and review prompts.</li>
                <li>Progress snapshots to stay on track for goals.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
