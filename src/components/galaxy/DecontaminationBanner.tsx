'use client';

import { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';

interface DecontaminationBannerProps {
  quarantinedCount: number;
}

/**
 * Decontamination Banner - The "Whisper", Not the "Shout"
 * 
 * Displays a passive, non-intrusive notification that confirms
 * automated email ingestion without visual clutter.
 * 
 * Design Specifications:
 * - Translucent frosted glass effect (bg-slate-900/80 backdrop-blur-md)
 * - Soft indigo accent border (border-indigo-500/30)
 * - NO RED, ORANGE, OR YELLOW (panic colors)
 * - Fade in → stay 6-8s → fade out
 * - Read-only, no close button
 * 
 * Requirements: 2.5
 */
export function DecontaminationBanner({ quarantinedCount }: DecontaminationBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (quarantinedCount > 0) {
      // Start rendering
      setShouldRender(true);
      
      // Fade in after a brief delay
      const fadeInTimer = setTimeout(() => {
        setIsVisible(true);
      }, 100);

      // Fade out after 6-8 seconds (using 7s as middle ground)
      const fadeOutTimer = setTimeout(() => {
        setIsVisible(false);
      }, 7000);

      // Remove from DOM after fade-out animation completes
      const removeTimer = setTimeout(() => {
        setShouldRender(false);
      }, 7300); // 7000ms + 300ms fade-out animation

      return () => {
        clearTimeout(fadeInTimer);
        clearTimeout(fadeOutTimer);
        clearTimeout(removeTimer);
      };
    }
  }, [quarantinedCount]);

  if (!shouldRender || quarantinedCount === 0) {
    return null;
  }

  return (
    <div
      className={`
        fixed top-8 left-1/2 -translate-x-1/2 z-50
        transition-opacity duration-300
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <div className="
        flex items-center gap-3
        px-6 py-3
        bg-slate-900/80 backdrop-blur-md
        border border-indigo-500/30
        rounded-full
        shadow-lg shadow-indigo-500/10
      ">
        <ShieldCheck className="w-5 h-5 text-indigo-400" />
        <p className="text-sm font-medium text-slate-200">
          📩 Forge Inbox intercepted {quarantinedCount} new {quarantinedCount === 1 ? 'item' : 'items'}. Fractured and safely tucked away.
        </p>
      </div>
    </div>
  );
}
