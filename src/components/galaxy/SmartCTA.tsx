'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Sparkles, Clock, Target, RefreshCw, Star, PackageOpen } from 'lucide-react';
import { updateOrbitState } from '@/app/actions/study-topics';

interface SmartCTAProps {
  label: string;
  action: string;
  reason: 'deadline' | 'low_mastery' | 'decay' | 'new' | 'quarantine';
  topicId?: string;
  orbitState?: number;
}

const reasonConfig = {
  deadline: {
    icon: Clock,
    label: '⏰ Deadline approaching',
    color: 'from-red-600 to-orange-600',
    hoverColor: 'hover:shadow-red-500/50',
  },
  low_mastery: {
    icon: Target,
    label: '🎯 Needs practice',
    color: 'from-amber-600 to-yellow-600',
    hoverColor: 'hover:shadow-amber-500/50',
  },
  decay: {
    icon: RefreshCw,
    label: '🔄 Time to review',
    color: 'from-blue-600 to-cyan-600',
    hoverColor: 'hover:shadow-blue-500/50',
  },
  new: {
    icon: Star,
    label: '✨ Ready to learn',
    color: 'from-indigo-600 to-purple-600',
    hoverColor: 'hover:shadow-indigo-500/50',
  },
  quarantine: {
    icon: PackageOpen,
    label: '✨ New Mission Available',
    color: 'from-teal-600 to-cyan-600', // Soothing teal-to-cyan gradient
    hoverColor: 'hover:shadow-teal-500/50',
  },
};

/**
 * SmartCTA Component with Airlock Release Choreography
 * 
 * For quarantined topics (orbit_state = 0), implements the 4-step airlock sequence:
 * 1. Intercept click (don't route immediately)
 * 2. Update CTA text to "Materializing to Galaxy..." (subtle pulse)
 * 3. Execute server action: UPDATE orbit_state = 1
 * 4. Pause 800ms (let student watch dot appear in Galaxy)
 * 5. Navigate to tutor session
 * 
 * For active topics (orbit_state >= 1), navigates immediately (no airlock sequence).
 * 
 * Requirements: 3.4, 3.5
 */
export function SmartCTA({ label, action, reason, topicId, orbitState }: SmartCTAProps) {
  const router = useRouter();
  const [isAirlocking, setIsAirlocking] = useState(false);
  const config = reasonConfig[reason];
  const Icon = config.icon;
  
  const handleClick = async () => {
    // Check if this is a quarantined topic (orbit_state = 0)
    if (orbitState === 0 && topicId) {
      // AIRLOCK RELEASE SEQUENCE
      
      // Step 1: Intercept (don't route yet)
      setIsAirlocking(true);
      
      // Step 2: State change (CTA text updates via isAirlocking state)
      // "Materializing to Galaxy..." with subtle pulse
      
      // Step 3: Database fire (UPDATE orbit_state = 1)
      const success = await updateOrbitState(topicId, 1);
      
      if (!success) {
        console.error('[SmartCTA] Failed to update orbit_state');
        setIsAirlocking(false);
        return;
      }
      
      // Step 4: The Visual Pop + Pause (800ms)
      // The react-force-graph-2d will detect the state change
      // The new grey node will pop/scale into the center of the graph
      // Let the student watch the single grey dot stabilize
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Step 5: Navigate (now execute router.push)
      router.push(action);
    } else {
      // Active topic (orbit_state >= 1) - navigate immediately
      // No airlock sequence for already-active topics
      router.push(action);
    }
  };
  
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <p className="text-sm text-slate-400 font-medium">
        {config.label}
      </p>
      <button
        onClick={handleClick}
        disabled={isAirlocking}
        className={`
          group relative px-12 py-6 
          bg-gradient-to-r ${config.color} 
          text-white rounded-2xl text-2xl font-bold 
          shadow-2xl ${config.hoverColor} 
          transition-all duration-300 
          ${isAirlocking ? 'animate-pulse' : 'hover:scale-105'}
          disabled:opacity-80 disabled:cursor-wait
        `}
      >
        <Icon className="inline-block mr-3 h-8 w-8" />
        {isAirlocking ? 'Materializing to Galaxy...' : label}
      </button>
    </div>
  );
}
