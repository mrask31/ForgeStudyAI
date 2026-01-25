export default function HelpPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200/70 rounded-2xl p-8 sm:p-10 shadow-lg">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
              How to use ForgeStudy
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900">
              Quick guide to get the most out of the app
            </h1>
            <p className="text-slate-600 text-base sm:text-lg">
              Use this page as a fast refresher on key tools, what they do, and how to
              keep your study sessions organized.
            </p>
          </div>

          <div className="mt-10 space-y-8">
            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Start a session</h2>
              <p className="text-sm text-slate-600">
                Type your question and hit send. We automatically guide you with a map,
                practice, and next steps based on your grade band.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Key actions</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900 mb-1">New Chat</p>
                  <p className="text-sm text-slate-600">
                    Starts a fresh session and saves the current one to History. Use this
                    when you switch topics or classes.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900 mb-1">Save</p>
                  <p className="text-sm text-slate-600">
                    Stores a helpful explanation in your learning library so you can
                    revisit it later.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900 mb-1">Flagged</p>
                  <p className="text-sm text-slate-600">
                    Marks a response for review. Flagged items show up in your dashboard
                    so you can revisit weak spots.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-semibold text-slate-900 mb-1">Topic</p>
                  <p className="text-sm text-slate-600">
                    Save a response into a Study Topic to group maps, practice, and notes
                    for one unit.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Study tools</h2>
              <p className="text-sm text-slate-600 mb-4">
                These tools are available from the Study Hub and inside chat.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Study Map</p>
                  <p className="text-sm text-slate-600">
                    Turn a unit into a clear plan with dependencies and first steps.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Practice Mode</p>
                  <p className="text-sm text-slate-600">
                    Practice questions that build from easy to challenge.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Exam Sheets</p>
                  <p className="text-sm text-slate-600">
                    One-page review sheets you can print or download.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Essay Architect</p>
                  <p className="text-sm text-slate-600">
                    Thesis, outline, and evidence support without rewriting.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Uploads</h2>
              <p className="text-sm text-slate-600">
                Add syllabi, notes, or handouts in Uploads. The tutor will prioritize your
                materials when answering questions.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
