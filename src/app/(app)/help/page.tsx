export default function HelpPage() {
  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-8 sm:p-10 shadow-xl">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-400">
              How to use ForgeStudy
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-200">
              Quick guide to get the most out of the app
            </h1>
            <p className="text-slate-400 text-base sm:text-lg">
              Use this page as a fast refresher on key tools, what they do, and how to
              keep your study sessions organized.
            </p>
          </div>

          <div className="mt-10 space-y-8">
            <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-2">Start a session</h2>
              <p className="text-sm text-slate-400">
                Type your question and hit send. We automatically guide you with a map,
                practice, and next steps based on your grade band.
              </p>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-4">Key actions</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <p className="text-sm font-semibold text-slate-200 mb-1">New Chat</p>
                  <p className="text-sm text-slate-400">
                    Starts a fresh session and saves the current one to History. Use this
                    when you switch topics or classes.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <p className="text-sm font-semibold text-slate-200 mb-1">Save</p>
                  <p className="text-sm text-slate-400">
                    Stores a helpful explanation in your learning library so you can
                    revisit it later.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <p className="text-sm font-semibold text-slate-200 mb-1">Flagged</p>
                  <p className="text-sm text-slate-400">
                    Marks a response for review. Flagged items show up in your dashboard
                    so you can revisit weak spots.
                  </p>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
                  <p className="text-sm font-semibold text-slate-200 mb-1">Topic</p>
                  <p className="text-sm text-slate-400">
                    Save a response into a Study Topic to group maps, practice, and notes
                    for one unit.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-2">Study tools</h2>
              <p className="text-sm text-slate-400 mb-4">
                These tools are available from the Study Hub and inside chat.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-sm font-semibold text-slate-200">Study Map</p>
                  <p className="text-sm text-slate-400">
                    Turn a unit into a clear plan with dependencies and first steps.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Practice Mode</p>
                  <p className="text-sm text-slate-400">
                    Practice questions that build from easy to challenge.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Exam Sheets</p>
                  <p className="text-sm text-slate-400">
                    One-page review sheets you can print or download.
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">Essay Architect</p>
                  <p className="text-sm text-slate-400">
                    Thesis, outline, and evidence support without rewriting.
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
              <h2 className="text-lg font-semibold text-slate-200 mb-2">Uploads</h2>
              <p className="text-sm text-slate-400">
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
