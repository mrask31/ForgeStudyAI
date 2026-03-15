'use client';

/**
 * Loading skeleton for the Galaxy page.
 * Shows a dark canvas with pulsing placeholder nodes
 * to reduce perceived load time.
 */
export function GalaxySkeleton() {
  return (
    <div className="w-full h-full bg-slate-950 relative overflow-hidden">
      {/* Simulated stars / nodes */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="relative w-[400px] h-[400px]">
          {/* Central glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full bg-indigo-500/5 animate-pulse" />

          {/* Placeholder nodes */}
          {[
            { x: '30%', y: '25%', size: 'w-4 h-4' },
            { x: '65%', y: '20%', size: 'w-3 h-3' },
            { x: '20%', y: '55%', size: 'w-5 h-5' },
            { x: '75%', y: '50%', size: 'w-3 h-3' },
            { x: '45%', y: '70%', size: 'w-4 h-4' },
            { x: '55%', y: '35%', size: 'w-6 h-6' },
            { x: '35%', y: '80%', size: 'w-3 h-3' },
          ].map((node, i) => (
            <div
              key={i}
              className={`absolute ${node.size} rounded-full bg-slate-700/40 animate-pulse`}
              style={{
                left: node.x,
                top: node.y,
                animationDelay: `${i * 200}ms`,
              }}
            />
          ))}

          {/* Label placeholders */}
          {[
            { x: '25%', y: '30%' },
            { x: '60%', y: '25%' },
            { x: '50%', y: '40%' },
          ].map((label, i) => (
            <div
              key={`label-${i}`}
              className="absolute h-2 w-16 rounded bg-slate-800/30 animate-pulse"
              style={{
                left: label.x,
                top: label.y,
                animationDelay: `${i * 300 + 100}ms`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Loading text */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <div className="w-2 h-2 rounded-full bg-indigo-500/50 animate-pulse" />
          Loading your galaxy...
        </div>
      </div>
    </div>
  );
}
