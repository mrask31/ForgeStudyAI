'use client'

import { Shield, Lock, Zap } from 'lucide-react'

export function ParentTrust() {
  return (
    <section className="relative w-full py-20 md:py-32 px-4 bg-card/20 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 font-display">
            Built With Parent Trust
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your child's safety and privacy are non-negotiable
          </p>
        </div>

        {/* Trust badges grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: Shield,
              title: 'COPPA Compliant',
              description: 'Fully compliant with the Children\'s Online Privacy Protection Act. Safe for students under 13.',
            },
            {
              icon: Lock,
              title: 'No Data Selling',
              description: 'We never sell student data. Ever. Your child\'s information is theirs alone.',
            },
            {
              icon: Zap,
              title: 'No Ads',
              description: 'Zero advertisements. No distractions. Pure learning, powered by AI.',
            },
          ].map((item, idx) => {
            const Icon = item.icon
            return (
              <div
                key={idx}
                className="p-8 bg-card/40 backdrop-blur border border-border/30 rounded-2xl hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 text-center animate-fade-in-up"
                style={{ animationDelay: `${idx * 100}ms` }}
              >
                <div className="flex justify-center mb-4">
                  <div className="p-3 bg-primary/10 border border-primary/30 rounded-lg">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">{item.title}</h3>
                <p className="text-muted-foreground">{item.description}</p>
              </div>
            )
          })}
        </div>

        {/* Full-width trust statement */}
        <div className="mt-12 p-8 bg-primary/5 border border-primary/20 rounded-2xl text-center">
          <p className="text-foreground text-lg leading-relaxed">
            <span className="text-primary font-bold">ForgeStudy is dedicated to transparency.</span> We publish our privacy policies in plain English, respond to all COPPA concerns within 24 hours, and maintain strict data minimization practices.
          </p>
        </div>
      </div>
    </section>
  )
}
