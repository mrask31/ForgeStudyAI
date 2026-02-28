'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

interface OutlineBoardProps {
  crystallizedThreads: string[];
  isThesisAchieved?: boolean;
  sessionId?: string;
}

const ROMAN_NUMERALS = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];

export function OutlineBoard({ crystallizedThreads, isThesisAchieved = false, sessionId }: OutlineBoardProps) {
  const lastThreadRef = useRef<HTMLDivElement>(null);
  const prevThreadCountRef = useRef(crystallizedThreads.length);
  const [isExporting, setIsExporting] = useState(false);

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
  
  const handleExport = async () => {
    if (!sessionId) return;
    
    setIsExporting(true);
    
    try {
      const response = await fetch(`/api/loom/export?sessionId=${sessionId}`);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to export proof');
      }
      
      // Trigger download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proof-of-original-thought-${sessionId.slice(0, 8)}.md`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Proof of Original Thought exported successfully!');
    } catch (error: any) {
      console.error('[OutlineBoard] Export failed:', error);
      toast.error(error.message || 'Failed to export proof');
    } finally {
      setIsExporting(false);
    }
  };

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
    <div className="w-full h-full bg-slate-900 rounded-lg border border-slate-800 p-6 flex flex-col">
      <div className="text-amber-400 text-lg font-medium mb-4">Synthesis Outline</div>
      <div className="space-y-3 flex-1 overflow-y-auto">
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
      
      {/* Export Button - Only show when thesis achieved */}
      {isThesisAchieved && sessionId && (
        <div className="mt-6 pt-4 border-t border-slate-700">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="w-full px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:from-indigo-800 disabled:to-purple-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            {isExporting ? (
              <>
                <span className="animate-spin">⏳</span>
                <span>Generating Proof...</span>
              </>
            ) : (
              <>
                <span>📄</span>
                <span>Export Proof of Original Thought</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
