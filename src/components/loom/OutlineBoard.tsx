'use client';

import { useEffect, useRef } from 'react';

interface OutlineBoardProps {
  crystallizedThreads: string[];
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function OutlineBoard({ crystallizedThreads }: OutlineBoardProps) {
  const lastThreadRef = useRef<HTMLDivElement>(null);
  const prevThreadCountRef = useRef(crystallizedThreads.length);

  // Trigger gold pulse animation when new thread is added
  useEffect(() => {
    if (crystallizedThreads.length > prevThreadCountRef.current) {
      // New thread added - trigger animation
      if (lastThreadRef.current) {
        lastThreadRef.current.classList.remove('gold-pulse');
        // Force reflow to restart animation
        void lastThreadRef.current.offsetWidth;
        lastThreadRef.current.classList.add('gold-pulse');
      }
    }
    prevThreadCountRef.current = crystallizedThreads.length;
  }, [crystallizedThreads]);

  if (crystallizedThreads.length === 0) {
    return (
      <div className="w-full h-full bg-slate-900 rounded-lg border border-slate-800 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="text-amber-400 text-lg font-medium mb-2">Synthesis Outline</div>
          <div className="text-slate-500 text-sm">
            Your synthesis outline will appear here as you discover connections
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-900 rounded-lg border border-slate-800 p-6">
      <div className="text-amber-400 text-lg font-medium mb-4">Synthesis Outline</div>
      <div className="space-y-3">
        {crystallizedThreads.map((thread, index) => (
          <div
            key={index}
            ref={index === crystallizedThreads.length - 1 ? lastThreadRef : null}
            className="flex gap-3 text-slate-300"
          >
            <div className="text-amber-500 font-semibold min-w-[2rem]">
              {ROMAN_NUMERALS[index] || `${index + 1}.`}
            </div>
            <div className="flex-1">{thread}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
