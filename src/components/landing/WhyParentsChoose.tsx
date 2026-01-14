import { MessageSquare, TrendingUp, BookOpen, Users, Shield } from 'lucide-react'

interface WhyParentsChooseProps {
  className?: string
  showCloser?: boolean
}

export default function WhyParentsChoose({ className = '', showCloser = true }: WhyParentsChooseProps) {
  return (
    <section className={`max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 ${className}`}>
      <div className="text-center mb-8 sm:mb-12">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-slate-900 mb-4 tracking-tight">
          Why parents choose ForgeStudy
        </h2>
        <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          ForgeStudy isn't about shortcuts or answer-dumping.
          It's about helping students understand their work — and helping parents reclaim calmer evenings.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 mb-8 sm:mb-12">
        {/* Teaches step-by-step */}
        <div className="flex items-start gap-3 text-left">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm sm:text-base mb-1">
              Teaches step-by-step — so students actually learn
            </div>
          </div>
        </div>

        {/* Builds confidence */}
        <div className="flex items-start gap-3 text-left">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm sm:text-base mb-1">
              Builds confidence and independence — not dependency
            </div>
          </div>
        </div>

        {/* Designed for real schoolwork */}
        <div className="flex items-start gap-3 text-left">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm sm:text-base mb-1">
              Designed for real schoolwork — Grades 3–12
            </div>
          </div>
        </div>

        {/* One account for families */}
        <div className="flex items-start gap-3 text-left">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Users className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm sm:text-base mb-1">
              One account for families — up to 4 student profiles
            </div>
          </div>
        </div>

        {/* Less stress at home */}
        <div className="flex items-start gap-3 text-left">
          <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center flex-shrink-0">
            <Shield className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <div className="font-semibold text-slate-900 text-sm sm:text-base mb-1">
              Less stress at home — better study habits over time
            </div>
          </div>
        </div>
      </div>

      {showCloser && (
        <div className="text-center">
          <p className="text-lg sm:text-xl text-slate-700 font-medium italic">
            Homework doesn't have to be a nightly battle.
          </p>
        </div>
      )}
    </section>
  )
}
