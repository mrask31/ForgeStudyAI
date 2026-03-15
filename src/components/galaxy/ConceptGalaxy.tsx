'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Settings, Link as LinkIcon, Sparkles } from 'lucide-react';
import { FocusPanel } from './FocusPanel';
import { DueSoonTray } from './DueSoonTray';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-950 flex items-center justify-center">
      <div className="text-slate-400">Loading galaxy...</div>
    </div>
  ),
});

interface Topic {
  id: string;
  title: string;
  mastery_score: number;
  orbit_state: number; // 0=Quarantine, 1=Active, 2=Mastered, 3=Ghost Node
  next_review_date?: string | null; // For Ghost Nodes
  updated_at?: string | null;
  last_studied_at?: string | null;
}

interface Node {
  id: string;
  name: string;
  masteryScore: number;
  orbitState: number;
  val: number; // Node size
  color: string;
  physicsMode: 'mastered' | 'ghost' | 'snapBack'; // Physics state
  isAnimating: boolean; // Animation state
  isDueSoon: boolean; // Due within 48 hours
}

interface Link {
  source: string;
  target: string;
  isConstellation?: boolean; // Mark constellation threads
}

interface ConceptGalaxyProps {
  topics: Topic[];
  profileId?: string; // For lazy evaluation
  lmsStatus?: 'no_connection' | 'connected' | null;
  totalTopicCount?: number; // Includes quarantined — if > 0, sync already ran
  onDueSoonChange?: (hasDueSoon: boolean) => void;
  onTopicsRefresh?: () => void; // Callback to refresh topics after lazy eval
}

export function ConceptGalaxy({ topics, profileId, lmsStatus, totalTopicCount = 0, onDueSoonChange, onTopicsRefresh }: ConceptGalaxyProps) {
  const router = useRouter();
  const graphRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  // Constellation state management
  const [selectedConstellation, setSelectedConstellation] = useState<string[]>([]);
  const [showLoomDock, setShowLoomDock] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  
  // Weave Mode for touch devices (replaces Shift+Click)
  const [isWeaveModeActive, setIsWeaveModeActive] = useState(false);
  
  // Focus Panel state management
  const [focusPanelState, setFocusPanelState] = useState({
    isOpen: false,
    selectedTopicId: null as string | null,
    selectedTopicTitle: null as string | null,
    masteryScore: 0,
    dueDate: null as string | null,
    lastStudied: null as string | null,
  });
  
  // Permanent edges state
  const [permanentEdges, setPermanentEdges] = useState<Array<{ source: string; target: string }>>([]);
  
  // Vault: Snap-back animation state
  const [justRescued, setJustRescued] = useState<string[]>([]);

  // Dynamic Canvas Observer - Auto-resize on window resize/rotation
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    
    // Use ResizeObserver for better performance
    const resizeObserver = new ResizeObserver(updateDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    
    // Fallback to window resize event
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  
  // Fetch permanent topic edges on mount
  useEffect(() => {
    async function fetchTopicEdges() {
      try {
        const response = await fetch('/api/loom/edges');
        if (response.ok) {
          const data = await response.json();
          setPermanentEdges(data.edges || []);
        }
      } catch (error) {
        console.error('[Galaxy] Failed to fetch topic edges:', error);
      }
    }
    
    fetchTopicEdges();
  }, []);
  
  // Vault: Lazy evaluation on mount
  useEffect(() => {
    async function evaluateDecay() {
      if (!profileId) return;
      
      try {
        const response = await fetch('/api/vault/lazy-eval', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profileId }),
        });
        
        if (response.ok) {
          const { updatedCount } = await response.json();
          
          if (updatedCount > 0) {
            console.log(`[Vault] ${updatedCount} topics decayed to Ghost Nodes`);
            // Refresh topics to show new Ghost Nodes
            if (onTopicsRefresh) {
              onTopicsRefresh();
            }
          }
        }
      } catch (error) {
        console.error('[Vault] Failed to evaluate decay:', error);
      }
    }
    
    evaluateDecay();
  }, [profileId, onTopicsRefresh]);
  
  // Vault: Snap-back event listener
  useEffect(() => {
    const handleSnapBack = (event: CustomEvent) => {
      const { topicId } = event.detail;
      
      console.log('[Vault] Snap-back triggered for topic:', topicId);
      
      // Add to justRescued array
      setJustRescued(prev => [...prev, topicId]);
      
      // Refresh topics to get updated orbit_state
      if (onTopicsRefresh) {
        onTopicsRefresh();
      }
    };
    
    window.addEventListener('vault:snap-back', handleSnapBack as EventListener);
    
    return () => {
      window.removeEventListener('vault:snap-back', handleSnapBack as EventListener);
    };
  }, [onTopicsRefresh]);
  
  // Vault: Clear snap-back state after 1 second
  useEffect(() => {
    if (justRescued.length === 0) return;
    
    const timer = setTimeout(() => {
      console.log('[Vault] Clearing snap-back animation');
      setJustRescued([]);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [justRescued]);
  
  // Apply custom D3 forces for Ghost Node physics
  useEffect(() => {
    if (!graphRef.current) return;
    
    const graph = graphRef.current;
    
    // Apply custom radial force based on node physics mode
    try {
      const d3 = require('d3-force');
      
      graph.d3Force('radial', d3.forceRadial((node: Node) => {
        if (node.physicsMode === 'snapBack') {
          return 2.0 * 100; // Very strong pull to center (snap-back)
        } else if (node.physicsMode === 'ghost') {
          return -0.3 * 100; // Weak push to rim (drift away)
        } else {
          return 0.5 * 100; // Normal pull to center
        }
      }));
      
      // Reheat simulation when physics mode changes
      if (justRescued.length > 0) {
        graph.d3ReheatSimulation();
      }
    } catch (error) {
      console.error('[Galaxy] Failed to apply custom forces:', error);
    }
  }, [justRescued]);

  // Continuous repaint for pulse animations (lightweight — only triggers canvas redraw)
  useEffect(() => {
    let animFrame: number;
    const tick = () => {
      if (graphRef.current) {
        // Nudge the graph's internal tick to trigger a canvas redraw
        // without restarting physics simulation
        graphRef.current.pauseAnimation?.();
        graphRef.current.resumeAnimation?.();
      }
      animFrame = requestAnimationFrame(tick);
    };
    animFrame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animFrame);
  }, []);

  // Update dock visibility when constellation changes
  useEffect(() => {
    setShowLoomDock(selectedConstellation.length >= 2);
  }, [selectedConstellation]);

  // Transform topics into graph nodes
  const nodes: Node[] = topics.map(topic => {
    // Determine physics mode
    let physicsMode: 'mastered' | 'ghost' | 'snapBack';
    
    if (justRescued.includes(topic.id)) {
      physicsMode = 'snapBack';
    } else if (topic.orbit_state === 3) {
      physicsMode = 'ghost';
    } else {
      physicsMode = 'mastered';
    }
    
    // Check if due within 48 hours
    let isDueSoon = false;
    if (topic.next_review_date) {
      const diff = new Date(topic.next_review_date).getTime() - Date.now();
      isDueSoon = diff > 0 && diff <= 48 * 60 * 60 * 1000;
    }

    return {
      id: topic.id,
      name: topic.title,
      masteryScore: topic.mastery_score || 0,
      orbitState: topic.orbit_state || 1,
      val: 10 + (topic.mastery_score || 0) / 10, // Size based on mastery (10-20)
      color: getNodeColor(topic.orbit_state, justRescued.includes(topic.id)),
      physicsMode,
      isAnimating: justRescued.includes(topic.id),
      isDueSoon,
    };
  });

  // Create constellation links (native canvas approach)
  const links: Link[] = [];
  
  // Add permanent edges (indigo threads between mastered nodes)
  const masteredTopicIds = topics.filter(t => t.orbit_state === 2).map(t => t.id);
  for (const edge of permanentEdges) {
    // Only render edges between mastered nodes
    if (masteredTopicIds.includes(edge.source) && masteredTopicIds.includes(edge.target)) {
      links.push({
        source: edge.source,
        target: edge.target,
        isConstellation: false, // Permanent edges are not constellation threads
      });
    }
  }
  
  // Generate all pairs of selected nodes as constellation threads
  for (let i = 0; i < selectedConstellation.length; i++) {
    for (let j = i + 1; j < selectedConstellation.length; j++) {
      links.push({
        source: selectedConstellation[i],
        target: selectedConstellation[j],
        isConstellation: true,
      });
    }
  }

  const handleNodeClick = (node: any, event: MouseEvent) => {
    // Check if Weave Mode is active OR Shift key is pressed for constellation selection
    if (isWeaveModeActive || event.shiftKey) {
      handleConstellationSelection(node);
    } else {
      // Open Focus Panel — look up full topic data
      const topic = topics.find(t => t.id === node.id);
      setFocusPanelState({
        isOpen: true,
        selectedTopicId: node.id,
        selectedTopicTitle: node.name,
        masteryScore: topic?.mastery_score ?? 0,
        dueDate: topic?.next_review_date ?? null,
        lastStudied: topic?.last_studied_at ?? topic?.updated_at ?? null,
      });
    }
  };

  const handleCloseFocusPanel = () => {
    setFocusPanelState({
      isOpen: false,
      selectedTopicId: null,
      selectedTopicTitle: null,
      masteryScore: 0,
      dueDate: null,
      lastStudied: null,
    });
  };

  const handleConstellationSelection = (node: Node) => {
    // Validation 1: Check orbit_state (The "Unearned Knowledge" Constraint)
    if (node.orbitState !== 2) {
      toast.error('Only Mastered stars can be woven.');
      return;
    }

    // Check if node is already selected (toggle behavior)
    if (selectedConstellation.includes(node.id)) {
      // Remove from constellation
      setSelectedConstellation(prev => prev.filter(id => id !== node.id));
      return;
    }

    // Validation 2: Check max nodes (The "Overload" Constraint)
    if (selectedConstellation.length >= 4) {
      toast.error('Maximum 4 concepts can be woven together.');
      return;
    }

    // Add to constellation
    setSelectedConstellation(prev => [...prev, node.id]);
  };

  const handleWeaveThesis = async () => {
    setIsCreatingSession(true);
    
    try {
      // POST to /api/loom/sessions with selected constellation
      const response = await fetch('/api/loom/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topicIds: selectedConstellation,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create synthesis session');
      }

      const data = await response.json();
      const sessionId = data.session.id;

      console.log('[Loom] Session created:', sessionId);

      // Navigate to /loom/[session_id]
      router.push(`/loom/${sessionId}`);

    } catch (error: any) {
      console.error('[Loom] Failed to create session:', error);
      toast.error(error.message || 'Failed to start synthesis session');
      setIsCreatingSession(false);
    }
  };

  if (topics.length === 0) {
    // Determine which empty state to show based on LMS connection status
    // Key insight: if totalTopicCount > 0, topics exist but are quarantined (orbit_state = 0).
    // That means sync already ran — don't show "Syncing..." spinner.
    const hasAnyTopicsInDb = totalTopicCount > 0;
    const showNoConnection = lmsStatus === 'no_connection' && !hasAnyTopicsInDb;
    const showSyncing = lmsStatus === 'connected' && !hasAnyTopicsInDb;
    const showLoading = lmsStatus === null && !hasAnyTopicsInDb;
    // If topics exist in DB (quarantined) but none are visible, show the quarantine guidance
    const showQuarantineWaiting = hasAnyTopicsInDb;

    return (
      <div className="w-full h-full bg-slate-950 flex flex-col items-center justify-center gap-6 px-4">
        <div className="flex flex-col items-center gap-6 max-w-md">
          {showQuarantineWaiting ? (
            <>
              <Sparkles className="w-12 h-12 text-indigo-400" />
              <h2 className="text-xl font-semibold text-slate-100 text-center">
                Your topics are ready to explore!
              </h2>
              <p className="text-sm text-slate-400 text-center">
                {totalTopicCount} topic{totalTopicCount !== 1 ? 's' : ''} synced from Canvas. Tap the button below to start studying.
              </p>
              <button
                onClick={() => router.push('/tutor')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 w-full font-medium transition-colors duration-200"
              >
                Start Studying
              </button>
            </>
          ) : showLoading ? (
            <>
              <Loader2 className="w-10 h-10 text-indigo-400 animate-spin" />
              <p className="text-sm text-slate-400">Loading your galaxy...</p>
            </>
          ) : showNoConnection ? (
            <>
              <LinkIcon className="w-12 h-12 text-indigo-400" />
              <h2 className="text-xl font-semibold text-slate-100 text-center">
                Your Galaxy is waiting.
              </h2>
              <p className="text-sm text-slate-400 text-center">
                Connect Canvas in Settings to load your assignments, or upload study materials to get started.
              </p>
              <div className="flex flex-col gap-3 w-full">
                <button
                  onClick={() => {
                    // Open settings drawer by dispatching a custom event
                    window.dispatchEvent(new CustomEvent('open-settings'));
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 w-full font-medium transition-colors duration-200 flex items-center justify-center gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Connect Canvas in Settings
                </button>
                <button
                  onClick={() => router.push('/sources')}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-indigo-500/40 text-slate-300 rounded-xl px-6 py-3 w-full font-medium transition-all duration-200"
                >
                  Upload Materials
                </button>
                <button
                  onClick={() => router.push('/tutor')}
                  className="bg-slate-800 hover:bg-slate-700 border border-slate-600 hover:border-indigo-500/40 text-slate-300 rounded-xl px-6 py-3 w-full font-medium transition-all duration-200"
                >
                  Ask Your Tutor
                </button>
              </div>
            </>
          ) : showSyncing ? (
            <>
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
              <h2 className="text-xl font-semibold text-slate-100 text-center">
                Syncing your assignments...
              </h2>
              <p className="text-sm text-slate-400 text-center">
                We're pulling in your Canvas assignments. This usually takes a few seconds.
              </p>
              <p className="text-xs text-slate-500 text-center mt-2">
                No assignments found? Check your Canvas connection in Settings.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-100 text-center">
                No assignments found.
              </h2>
              <p className="text-sm text-slate-400 text-center">
                Check your Canvas connection in Settings, or upload study materials to get started.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      <ForceGraph2D
        ref={graphRef}
        graphData={{ nodes, links }}
        width={dimensions.width}
        height={dimensions.height}
        nodeLabel="name"
        nodeColor="color"
        nodeVal="val"
        onNodeClick={handleNodeClick}
          nodeCanvasObject={(node: any, ctx, globalScale) => {
            // Custom node rendering with glow effect and pulse animations
            const label = node.name;
            const fontSize = 12 / globalScale;
            const nodeSize = node.val;
            const isSelected = selectedConstellation.includes(node.id);
            const isGhost = node.orbitState === 3;
            const isSnapBack = node.isAnimating;
            const mastery = node.masteryScore || 0;

            // Pulse animation based on mastery state
            const now = Date.now();
            let pulseScale = 1.0;
            let glowIntensity = 0;

            if (node.isDueSoon) {
              // Urgent: fast pulse, 1s period
              const phase = (now % 1000) / 1000;
              pulseScale = 1 + 0.15 * Math.sin(phase * Math.PI * 2);
              glowIntensity = 15 + 10 * Math.sin(phase * Math.PI * 2);
            } else if (mastery >= 70) {
              // Mastered: steady glow, no pulse
              glowIntensity = 20;
            } else if (mastery >= 30) {
              // Developing: medium pulse, 2s period
              const phase = (now % 2000) / 2000;
              pulseScale = 1 + 0.08 * Math.sin(phase * Math.PI * 2);
              glowIntensity = 8 + 6 * Math.sin(phase * Math.PI * 2);
            } else {
              // Learning: slow dim pulse, 3s period
              const phase = (now % 3000) / 3000;
              pulseScale = 1 + 0.05 * Math.sin(phase * Math.PI * 2);
              glowIntensity = 4 + 3 * Math.sin(phase * Math.PI * 2);
            }

            const animatedSize = nodeSize * pulseScale;

            // Calculate opacity
            let opacity = 1.0;
            if (isGhost && !isSnapBack) {
              opacity = 0.4;
            } else if (isSnapBack) {
              opacity = 1.0;
            }

            // Draw glow
            if (isSelected || isSnapBack || glowIntensity > 0) {
              ctx.shadowBlur = isSelected ? 30 : (isSnapBack ? 40 : glowIntensity);
              ctx.shadowColor = isSelected ? '#f59e0b' : (node.isDueSoon ? '#ef4444' : node.color);
            } else {
              ctx.shadowBlur = 0;
            }

            // Apply opacity
            ctx.globalAlpha = opacity;

            // Draw circle with animated size
            ctx.beginPath();
            ctx.arc(node.x, node.y, animatedSize, 0, 2 * Math.PI);
            ctx.fillStyle = isSelected ? '#f59e0b' : node.color;
            ctx.fill();

            // Draw selection ring for selected nodes
            if (isSelected) {
              ctx.strokeStyle = '#fbbf24';
              ctx.lineWidth = 2 / globalScale;
              ctx.stroke();
            }

            // Reset shadow and alpha
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;

            // Draw label
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText(label, node.x, node.y + animatedSize + fontSize + 2);
          }}
          backgroundColor="#020617"
          linkColor={(link: any) => {
            if (link.isConstellation) {
              return 'rgba(251, 191, 36, 0.6)'; // Amber for active constellation
            }
            return 'rgba(99, 102, 241, 0.4)'; // Indigo for permanent edges
          }}
          linkWidth={(link: any) => {
            if (link.isConstellation) {
              return 2; // Thicker for active constellation
            }
            return 1.5; // Subtle for permanent edges
          }}
          linkDirectionalParticles={0}
          d3AlphaDecay={0.02}
          d3VelocityDecay={0.3}
          cooldownTicks={100}
          onEngineStop={() => {
            // Center the graph after initial layout
            if (graphRef.current) {
              graphRef.current.zoomToFit(400, 50);
            }
          }}
        />
      
      {/* Weave Mode Toggle - Floating button for touch devices */}
      <button
        onClick={() => setIsWeaveModeActive(!isWeaveModeActive)}
        className={`absolute top-16 md:top-[4.5rem] right-4 md:right-6 z-50 px-4 py-2 rounded-xl font-medium transition-all shadow-2xl backdrop-blur-md border ${
          isWeaveModeActive
            ? 'bg-amber-600/90 border-amber-500/50 text-white'
            : 'bg-slate-900/60 border-slate-700/50 text-slate-300 hover:bg-slate-800/60'
        }`}
        title={isWeaveModeActive ? 'Weave Mode Active - Tap nodes to select' : 'Enable Weave Mode for touch selection'}
      >
        <span className="flex items-center gap-2">
          <span>🕸️</span>
          <span className="hidden sm:inline">Weave Mode</span>
          {isWeaveModeActive && <span className="text-xs">(Active)</span>}
        </span>
      </button>

      {/* Loom Dock - Bottom slide-up panel */}
      {showLoomDock && (
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-700 p-4 rounded-b-lg animate-slide-up">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="text-amber-400 text-sm font-medium">
                {selectedConstellation.length} concept{selectedConstellation.length !== 1 ? 's' : ''} selected
              </div>
              <div className="text-slate-500 text-xs hidden md:block">
                Shift+Click or Weave Mode to add/remove stars
              </div>
            </div>
            <button
              onClick={handleWeaveThesis}
              disabled={isCreatingSession}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              {isCreatingSession ? (
                <>
                  <span className="animate-spin">⏳</span>
                  <span>Initializing...</span>
                </>
              ) : (
                <>
                  <span>🕸️</span>
                  <span>Weave Thesis</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Due Soon Tray */}
      {profileId && (
        <DueSoonTray
          profileId={profileId}
          onItemsLoaded={(hasItems) => onDueSoonChange?.(hasItems)}
          onSelectTopic={(topicId, topicTitle) => {
            const topic = topics.find(t => t.id === topicId);
            setFocusPanelState({
              isOpen: true,
              selectedTopicId: topicId,
              selectedTopicTitle: topicTitle,
              masteryScore: topic?.mastery_score ?? 0,
              dueDate: topic?.next_review_date ?? null,
              lastStudied: topic?.last_studied_at ?? topic?.updated_at ?? null,
            });
          }}
        />
      )}

      {/* Focus Panel */}
      <FocusPanel
        isOpen={focusPanelState.isOpen}
        topicId={focusPanelState.selectedTopicId}
        topicTitle={focusPanelState.selectedTopicTitle}
        masteryScore={focusPanelState.masteryScore}
        masteryLevel={
          (focusPanelState.masteryScore >= 70 ? 'mastered' :
          focusPanelState.masteryScore >= 30 ? 'developing' : 'learning') as 'learning' | 'developing' | 'mastered'
        }
        dueDate={focusPanelState.dueDate}
        lastStudied={focusPanelState.lastStudied}
        onClose={handleCloseFocusPanel}
        onAction={(action: string) => {
          if (focusPanelState.selectedTopicId && focusPanelState.selectedTopicTitle) {
            router.push(`/tutor?topicId=${focusPanelState.selectedTopicId}&topicTitle=${encodeURIComponent(focusPanelState.selectedTopicTitle)}&action=${encodeURIComponent(action)}`);
          }
        }}
      />
    </div>
  );
}

function getMasteryColor(score: number): string {
  if (score < 30) return '#64748b'; // Grey (slate-500) - Learning
  if (score < 70) return '#f59e0b'; // Amber (amber-500) - Developing
  return '#6366f1'; // Indigo (indigo-500) - Mastered
}

function getNodeColor(orbitState: number, isSnapBack: boolean): string {
  if (isSnapBack) {
    return '#6366f1'; // Indigo (animating back to mastered)
  }
  
  if (orbitState === 3) {
    return '#94a3b8'; // Silver (slate-400) - Ghost Node
  }
  
  if (orbitState === 2) {
    return '#6366f1'; // Indigo (mastered)
  }
  
  if (orbitState === 1) {
    return '#f59e0b'; // Amber (active/developing)
  }
  
  return '#64748b'; // Grey (quarantine)
}
