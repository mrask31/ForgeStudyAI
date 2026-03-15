'use client'

import { Check, ArrowRight } from 'lucide-react'

const plans = [
  {
    name: 'Individual',
    subtitle: 'Perfect for one student',
    price: 9.99,
    period: '/month',
    description: 'Everything your student needs to succeed',
    features: [
      'Unlimited AI tutoring',
      'Canvas LMS integration',
      'Photo homework analysis',
      'Galaxy constellation view',
      'Socratic guidance',
      'Progress tracking',
    ],
    cta: 'Start Free Trial',
    highlighted: false,
  },
  {
    name: 'Family',
    subtitle: 'For multiple students',
    price: 24.99,
    period: '/month',
    description: 'Support up to 4 students at a time',
    features: [
      'All Individual features',
      'Up to 4 student accounts',
      'Family dashboard',
      'Progress sync across students',
      'Shared materials library',
      'Priority support',
      'Advanced analytics',
    ],
    cta: 'Start Free Trial',
    highlighted: true,
  },
]

export function Pricing() {
  return (
    <section className="relative w-full py-20 md:py-32 px-4 bg-background overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-20" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl opacity-10" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 font-display">
            Simple, Transparent Pricing
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            7-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`relative p-8 rounded-2xl border transition-all duration-300 animate-fade-in-up ${
                plan.highlighted
                  ? 'md:scale-105 bg-primary/10 border-primary/50 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30'
                  : 'bg-card/40 border-border/30 hover:border-primary/50 hover:bg-card/60 hover:shadow-lg hover:shadow-primary/10'
              } backdrop-blur`}
              style={{ animationDelay: `${idx * 100}ms` }}
            >
              {/* Popular badge */}
              {plan.highlighted && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 bg-primary text-primary-foreground rounded-full text-xs font-bold">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan header */}
              <div className="mb-6">
                <h3 className="text-2xl font-bold text-white mb-1">{plan.name}</h3>
                <p className="text-muted-foreground text-sm">{plan.subtitle}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-white">${plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              {/* CTA Button */}
              <button
                className={`w-full py-3 px-6 rounded-lg font-semibold transition-all duration-300 flex items-center justify-center gap-2 mb-8 ${
                  plan.highlighted
                    ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg hover:shadow-xl'
                    : 'bg-secondary/30 hover:bg-secondary/50 text-foreground border border-border/50 hover:border-primary/50'
                }`}
              >
                {plan.cta}
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Features list */}
              <div className="space-y-3 border-t border-border/30 pt-8">
                {plan.features.map((feature, fidx) => (
                  <div key={fidx} className="flex items-start gap-3">
                    <Check className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-foreground">{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Trust statement */}
        <div className="mt-16 text-center text-muted-foreground">
          <p>
            All plans include a <span className="text-primary font-semibold">7-day free trial</span>. No credit card required to start.
          </p>
        </div>
      </div>
    </section>
  )
}
