import UploadMaterialsMockup from './UploadMaterialsMockup'
import ChatInterfaceMockup from './ChatInterfaceMockup'
import LibraryMockup from './LibraryMockup'

export default function HowItClicks() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 md:py-20 bg-gradient-to-br from-slate-50 via-indigo-50/20 to-slate-50">
      <div className="text-center mb-8 sm:mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200/60 rounded-full text-xs font-semibold text-indigo-700 mb-3 shadow-sm">
          Here's how ForgeStudy Platform works
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 via-indigo-900 to-slate-900 bg-clip-text text-transparent mb-3 sm:mb-4">
          <span className="hidden sm:inline">Your AI Study Companion — In Three Simple Steps</span>
          <span className="sm:hidden">3 Simple Steps</span>
        </h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 md:gap-12">
        {/* Step 1 */}
        <div className="text-center">
          <div className="mb-6">
            <div className="w-full max-w-[400px] mx-auto bg-white/90 backdrop-blur-sm border-2 border-indigo-200/60 rounded-xl shadow-xl shadow-indigo-500/10 overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
              <div className="h-8 bg-indigo-50 border-b border-indigo-200 flex items-center px-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                </div>
              </div>
              <div className="aspect-[4/3] bg-white relative overflow-hidden">
                <UploadMaterialsMockup />
              </div>
            </div>
          </div>
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-full text-xl font-bold mb-6 shadow-lg shadow-indigo-500/30">
            1
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            <span className="hidden sm:inline">1️⃣ Upload your class materials</span>
            <span className="sm:hidden">Upload</span>
          </h3>
          <p className="text-slate-700 leading-relaxed font-medium hidden sm:block">
            Lecture notes, PDFs, and textbook chapters.
          </p>
        </div>

        {/* Step 2 */}
        <div className="text-center">
          <div className="mb-6">
            <div className="w-full max-w-[400px] mx-auto bg-white/90 backdrop-blur-sm border-2 border-indigo-200/60 rounded-xl shadow-xl shadow-indigo-500/10 overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
              <div className="h-8 bg-indigo-50 border-b border-indigo-200 flex items-center px-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                </div>
              </div>
              <div className="aspect-[4/3] bg-white relative overflow-hidden">
                <ChatInterfaceMockup />
              </div>
            </div>
          </div>
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-full text-xl font-bold mb-6 shadow-lg shadow-indigo-500/30">
            2
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            <span className="hidden sm:inline">2️⃣ Chat with your AI tutor</span>
            <span className="sm:hidden">Chat</span>
          </h3>
          <p className="text-slate-700 leading-relaxed font-medium hidden sm:block">
            Ask questions and get step-by-step guidance.
          </p>
        </div>

        {/* Step 3 */}
        <div className="text-center">
          <div className="mb-6">
            <div className="w-full max-w-[400px] mx-auto bg-white/90 backdrop-blur-sm border-2 border-indigo-200/60 rounded-xl shadow-xl shadow-indigo-500/10 overflow-hidden transform hover:scale-[1.02] transition-all duration-300">
              <div className="h-8 bg-indigo-50 border-b border-indigo-200 flex items-center px-4">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-rose-400"></div>
                  <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                  <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                </div>
              </div>
              <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                <LibraryMockup />
              </div>
            </div>
          </div>
          <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-600 to-purple-600 text-white rounded-full text-xl font-bold mb-6 shadow-lg shadow-indigo-500/30">
            3
          </div>
          <h3 className="text-2xl font-bold text-slate-900 mb-4">
            <span className="hidden sm:inline">3️⃣ Save key insights</span>
            <span className="sm:hidden">Save</span>
          </h3>
          <p className="text-slate-700 leading-relaxed font-medium hidden sm:block">
            Build your own library of breakthroughs.
          </p>
        </div>
      </div>
    </section>
  )
}
