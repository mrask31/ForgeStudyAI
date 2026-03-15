'use client'

import { Camera, Zap, CheckCircle } from 'lucide-react'

export function HomeworkPhotoDrop() {
  return (
    <section className="relative w-full py-20 md:py-32 px-4 bg-background overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-20" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Text content */}
          <div className="animate-fade-in-up">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 font-display">
              Homework Photo Drop
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Your student can photograph any worksheet, problem set, or homework assignment. ForgeStudy AI instantly recognizes it and provides step-by-step Socratic tutoring.
            </p>

            <div className="space-y-4">
              {[
                'Photo any homework problem',
                'AI instantly recognizes the content',
                'Get Socratic tutoring on the spot',
                'Works with any subject or format',
              ].map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                  <span className="text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Visual demo */}
          <div className="animate-fade-in-up md:animate-slide-in-left" style={{ animationDelay: '100ms' }}>
            <div className="relative">
              {/* Phone frame mockup */}
              <div className="relative mx-auto w-64 h-96 bg-black rounded-3xl shadow-2xl shadow-primary/20 overflow-hidden border-8 border-gray-900">
                {/* Screen */}
                <div className="absolute inset-0 bg-gradient-to-b from-card to-background p-4 flex flex-col items-center justify-center">
                  {/* Camera icon with animation */}
                  <div className="mb-6 relative">
                    <div className="absolute inset-0 bg-primary/30 rounded-full blur-2xl animate-pulse" />
                    <Camera className="w-16 h-16 text-primary relative z-10" />
                  </div>

                  {/* Text overlay */}
                  <div className="text-center">
                    <p className="text-white font-bold text-lg mb-2">Take a Photo</p>
                    <p className="text-muted-foreground text-sm mb-6">Photograph your homework</p>

                    {/* Button */}
                    <button className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold transition-all">
                      <Camera className="w-4 h-4" />
                      Upload Photo
                    </button>
                  </div>

                  {/* Bottom shine effect */}
                  <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-primary/10 to-transparent" />
                </div>

                {/* Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-7 bg-black rounded-b-3xl z-10" />
              </div>

              {/* Floating elements */}
              <div className="absolute -top-4 -right-4 w-24 h-24 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-float" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
