'use client';

/**
 * Loading skeleton for the Tutor page.
 * Shows chat interface placeholder with pulsing message bubbles.
 */
export function TutorSkeleton() {
  return (
    <div className="flex flex-col h-full bg-slate-950">
      {/* Header skeleton */}
      <div className="border-b border-slate-700/50 bg-slate-900 px-4 py-3.5 rounded-xl mb-4">
        <div className="flex items-center gap-3">
          <div className="h-8 w-24 rounded-lg bg-slate-800/40 animate-pulse" />
          <div className="h-8 w-20 rounded-lg bg-slate-800/40 animate-pulse" />
        </div>
      </div>

      {/* Chat area skeleton */}
      <div className="flex-1 px-4 space-y-4 overflow-hidden">
        {/* Assistant message */}
        <div className="flex gap-3 max-w-[80%]">
          <div className="w-8 h-8 rounded-full bg-indigo-900/40 animate-pulse flex-shrink-0" />
          <div className="space-y-2 flex-1">
            <div className="h-4 w-3/4 rounded bg-slate-800/40 animate-pulse" />
            <div className="h-4 w-1/2 rounded bg-slate-800/40 animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-slate-800/40 animate-pulse" />
          </div>
        </div>

        {/* User message */}
        <div className="flex gap-3 max-w-[60%] ml-auto">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-full rounded bg-indigo-900/30 animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-indigo-900/30 animate-pulse" />
          </div>
        </div>

        {/* Typing indicator */}
        <div className="flex gap-3 max-w-[40%]">
          <div className="w-8 h-8 rounded-full bg-indigo-900/40 animate-pulse flex-shrink-0" />
          <div className="flex items-center gap-1 py-3 px-4 bg-slate-800/30 rounded-xl">
            <div className="w-2 h-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-slate-600 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>

      {/* Input skeleton */}
      <div className="border-t border-slate-700/50 px-4 py-3">
        <div className="h-12 rounded-xl bg-slate-800/40 animate-pulse" />
      </div>
    </div>
  );
}
