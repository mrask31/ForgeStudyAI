import Link from 'next/link'
import { Sparkles, BookOpenCheck, PenLine, Shapes, HeartHandshake } from 'lucide-react'

export default function ElementaryPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
        <section className="text-center mb-16">
          <div className="inline-flex items-center gap-2 rounded-full bg-teal-100/80 text-teal-700 text-xs font-semibold px-3 py-1 mb-5">
            ForgeElementary • Grades 3–5
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-4">
            Gentle, joyful learning support for younger learners
          </h1>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Calm guidance that turns confusion into confidence — one small step at a time.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              href="/signup"
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white font-semibold shadow-lg hover:from-teal-700 hover:to-cyan-700 transition-all"
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
              icon: BookOpenCheck,
              title: 'Reading confidence',
              description: 'Short passages, clear prompts, and story-based questions.',
            },
            {
              icon: PenLine,
              title: 'Spelling & writing',
              description: 'Practice tricky words with supportive, kid-friendly tips.',
            },
            {
              icon: Shapes,
              title: 'Math foundations',
              description: 'Visual models and step-by-step thinking for word problems.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-slate-200/70 bg-white/90 p-6 shadow-md shadow-slate-200/40"
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
          <div className="flex flex-col md:flex-row gap-6">
            <div className="w-12 h-12 rounded-2xl bg-cyan-100 text-cyan-700 flex items-center justify-center">
              <HeartHandshake className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                A parent-first experience
              </h2>
              <p className="text-slate-600 mb-4">
                ForgeStudy is built to reduce nightly homework stress. You get short sessions, gentle tone,
                and clear next steps.
              </p>
              <ul className="grid gap-3 text-sm text-slate-600">
                <li>10–15 minute sessions that fit busy evenings.</li>
                <li>Positive feedback that keeps kids motivated.</li>
                <li>Progress snapshots you can review together.</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
