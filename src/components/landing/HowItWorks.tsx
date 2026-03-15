'use client'

import { Cable, Sparkles, Zap } from 'lucide-react'

const steps = [
  {
    number: 1,
    icon: Cable,
    title: 'Connect Canvas',
    description: 'Link your Canvas account in seconds. Your child\'s real assignments sync instantly.',
  },
  {
    number: 2,
    icon: Sparkles,
    title: 'Galaxy Appears',
    description: 'Assignments transform into a glowing constellation. Each concept is a node to master.',
  },
  {
    number: 3,
    icon: Zap,
    title: 'AI Tutors Instantly',
    description: 'Click any assignment. Get Socratic tutoring on the exact material your child is studying.',
  },
]

export function HowItWorks() {
  return (
    <section className="relative w-full py-20 md:py-32 px-4 bg-card/20 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 font-display">
            How It Works
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Three simple steps to unlock AI tutoring on real homework
          </p>
        </div>

        {/* Steps grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {steps.map((step, idx) => {
            const Icon = step.icon
            return (
              <div
                key={idx}
                className="relative group animate-fade-in-up"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                {/* Card */}
                <div className="h-full p-8 bg-card/40 backdrop-blur border border-border/30 rounded-2xl hover:border-primary/50 hover:bg-card/60 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10">
                  {/* Step number with glow */}
                  <div className="relative w-12 h-12 mb-6">
                    <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg" />
                    <div className="relative flex items-center justify-center w-12 h-12 bg-primary/10 border border-primary/30 rounded-full">
                      <span className="text-primary font-bold text-lg">{step.number}</span>
                    </div>
                  </div>

                  {/* Icon */}
                  <Icon className="w-8 h-8 text-primary mb-4" />

                  {/* Content */}
                  <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>

                  {/* Connector line for desktop */}
                  {idx < steps.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-8 w-4 h-1 bg-gradient-to-r from-primary to-transparent" />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
