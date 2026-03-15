'use client'

import { Sparkles, Zap, Lightbulb } from 'lucide-react'

export function MagicMoment() {
  return (
    <section className="relative w-full py-20 md:py-32 px-4 bg-background overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 right-10 w-64 h-64 bg-primary/10 rounded-full blur-3xl opacity-20" />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto">
        <div className="text-center mb-16 animate-fade-in-up">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-4 font-display">
            The Magic Moment
          </h2>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Connect Canvas. Your child's real assignments transform into a glowing galaxy constellation.
          </p>
        </div>

        {/* Galaxy visualization */}
        <div className="relative h-96 md:h-[500px] bg-card/30 backdrop-blur border border-border/30 rounded-2xl overflow-hidden flex items-center justify-center">
          {/* SVG Galaxy visualization */}
          <svg viewBox="0 0 800 500" className="w-full h-full max-w-4xl">
            {/* Background stars */}
            {[...Array(15)].map((_, i) => (
              <circle
                key={`star-${i}`}
                cx={Math.random() * 800}
                cy={Math.random() * 500}
                r="1"
                fill="white"
                opacity={Math.random() * 0.5 + 0.3}
              />
            ))}

            {/* Galaxy nodes - glowing constellation points */}
            {[
              { x: 200, y: 150, label: 'Algebra' },
              { x: 400, y: 100, label: 'Geometry' },
              { x: 600, y: 180, label: 'Calculus' },
              { x: 250, y: 350, label: 'Physics' },
              { x: 500, y: 350, label: 'Chemistry' },
              { x: 700, y: 300, label: 'Biology' },
            ].map((node, i) => (
              <g key={`node-${i}`}>
                {/* Glow effect */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="20"
                  fill="#6366f1"
                  opacity="0.2"
                  className="animate-pulse"
                />
                {/* Main node */}
                <circle
                  cx={node.x}
                  cy={node.y}
                  r="8"
                  fill="#6366f1"
                  className="animate-pulse-glow"
                  style={{ filter: 'drop-shadow(0 0 8px rgba(99, 102, 241, 0.8))' }}
                />
              </g>
            ))}

            {/* Constellation lines */}
            <line x1="200" y1="150" x2="400" y2="100" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
            <line x1="400" y1="100" x2="600" y2="180" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
            <line x1="250" y1="350" x2="500" y2="350" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
            <line x1="500" y1="350" x2="700" y2="300" stroke="#6366f1" strokeWidth="1" opacity="0.3" />
            <line x1="200" y1="150" x2="250" y2="350" stroke="#6366f1" strokeWidth="1" opacity="0.2" />
          </svg>

          {/* Labels overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <Sparkles className="w-12 h-12 text-primary mb-3 mx-auto animate-float" />
              <p className="text-white font-semibold">Each concept becomes a glowing node</p>
              <p className="text-muted-foreground text-sm mt-2">Click any subject to study</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
