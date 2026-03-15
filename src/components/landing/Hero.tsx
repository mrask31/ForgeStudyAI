'use client'

import Link from 'next/link'
import { ArrowRight, Star, Zap, Shield, Camera, Lock, Users } from 'lucide-react'

interface HeroProps {
  user?: any
}

export default function Hero({ user }: HeroProps) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-background flex flex-col items-center justify-center px-4 py-20 md:py-0">
      {/* Animated background stars */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(30)].map((_, i) => (
          <div
            key={i}
            className={`absolute w-0.5 h-0.5 bg-white rounded-full animate-twinkle`}
            style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: Math.random() * 0.7 + 0.3,
            }}
          />
        ))}
      </div>

      {/* Gradient orb background effect */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-20 pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl opacity-10 pointer-events-none" />

      {/* Main content */}
      <div className="relative z-10 text-center max-w-4xl animate-fade-in-up">
        <div className="mb-8 inline-block">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/30 rounded-full text-sm font-medium text-primary hover:bg-primary/20 transition-colors">
            <Shield className="w-4 h-4" />
            COPPA-Compliant • Built for Parents & Students
          </span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 text-balance font-display leading-tight">
          Your Child's Homework,
          <br />
          <span className="text-gradient">Instantly Tutored</span>
        </h1>

        <p className="text-lg md:text-2xl text-muted-foreground mb-4 text-balance leading-relaxed">
          Connect Canvas. Watch assignments appear as a glowing galaxy.
        </p>
        <p className="text-base md:text-xl text-muted-foreground mb-12 text-balance">
          Get Socratic AI tutoring on real homework — instantly.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
          <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg font-semibold transition-all hover:shadow-lg hover:shadow-primary/50 hover:scale-105 active:scale-95 duration-200">
            Start Free Trial
            <ArrowRight className="w-5 h-5" />
          </button>
          <button className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-secondary/30 hover:bg-secondary/50 text-foreground rounded-lg font-semibold transition-all border border-border/50 hover:border-primary/50 duration-200">
            Watch Demo
          </button>
        </div>

        {/* Features preview grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          <div className="p-4 bg-card/40 backdrop-blur border border-border/30 rounded-lg hover:border-primary/50 transition-colors">
            <Camera className="w-6 h-6 text-primary mb-2 mx-auto" />
            <div className="text-sm font-medium text-foreground">Photo Your Homework</div>
            <div className="text-xs text-muted-foreground mt-1">Instantly analyzed</div>
          </div>
          <div className="p-4 bg-card/40 backdrop-blur border border-border/30 rounded-lg hover:border-primary/50 transition-colors">
            <Zap className="w-6 h-6 text-primary mb-2 mx-auto" />
            <div className="text-sm font-medium text-foreground">Instant Tutoring</div>
            <div className="text-xs text-muted-foreground mt-1">Socratic AI guidance</div>
          </div>
          <div className="p-4 bg-card/40 backdrop-blur border border-border/30 rounded-lg hover:border-primary/50 transition-colors">
            <Lock className="w-6 h-6 text-primary mb-2 mx-auto" />
            <div className="text-sm font-medium text-foreground">No Data Selling</div>
            <div className="text-xs text-muted-foreground mt-1">Privacy first</div>
          </div>
        </div>
      </div>
    </div>
  )
}
