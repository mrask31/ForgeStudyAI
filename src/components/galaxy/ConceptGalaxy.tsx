'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Loader2, Settings, Link as LinkIcon, Sparkles, Maximize2 } from 'lucide-react';
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

interface CoursePlanet {
  courseId: string;
  courseName: string;
  topicCount: number;
  avgMastery: number;
  topics: { id: string; title: string; mastery_score: number; orbit_state: number; next_review_date: string | null; last_studied_at: string | null }[];
}

interface ConceptGalaxyProps {
  topics: Topic[];
  coursePlanets?: CoursePlanet[];
  profileId?: string; // For lazy evaluation
  lmsStatus?: 'no_connection' | 'connected' | null;
  totalTopicCount?: number; // Includes quarantined — if > 0, sync already ran
  onDueSoonChange?: (hasDueSoon: boolean) => void;
  onTopicsRefresh?: () => void; // Callback to refresh topics after lazy eval
  onDrillDownChange?: (isInDrillDown: boolean) => void; // Notify parent when drill-down state changes
}

export function ConceptGalaxy({ topics, coursePlanets, profileId, lmsStatus, totalTopicCount = 0, onDueSoonChange, onTopicsRefresh, onDrillDownChange }: ConceptGalaxyProps) {
  const router = useRouter();
  const graphRef = useRef<any>();
  const containerRef = useRef<HTMLDivElement>(null);
  // Initialize with conservative dimensions — ResizeObserver will correct to actual container size
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [canvasReady, setCanvasReady] = useState(false);

  // Course planet expansion — null = show planets, string = show that course's topics
  const [expandedCourseId, setExpandedCourseId] = useState<string | null>(null);
  const hasPlanets = (coursePlanets?.length ?? 0) > 0;

  // Notify parent when drill-down state changes (for hiding HelperChips etc.)
  useEffect(() => {
    onDrillDownChange?.(expandedCourseId !== null);
  }, [expandedCourseId, onDrillDownChange]);

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
    courseId: null as string | null,
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
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          setDimensions({ width: w, height: h });
          setCanvasReady(true);
        }
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
  
  // Center viewport and fit to nodes — runs on mount, view switches, dimension changes
  useEffect(() => {
    if (!graphRef.current || !canvasReady) return;
    const isMobile = dimensions.width < 768;
    const padding = isMobile ? 30 : 50;

    // Immediately center the camera on the canvas midpoint so nodes aren't off-screen
    graphRef.current.centerAt(dimensions.width / 2, dimensions.height / 2, 0);

    const timers: ReturnType<typeof setTimeout>[] = [];
    const fit = (delay: number, duration: number) => {
      timers.push(setTimeout(() => {
        if (!graphRef.current) return;
        graphRef.current.centerAt(dimensions.width / 2, dimensions.height / 2, 100);
        graphRef.current.zoomToFit(duration, padding);
      }, delay));
    };

    // Reheat then fit repeatedly as simulation converges
    timers.push(setTimeout(() => graphRef.current?.d3ReheatSimulation(), 30));
    fit(50, 200);
    fit(300, 300);
    fit(700, 400);
    fit(1200, 400);

    return () => timers.forEach(clearTimeout);
  }, [expandedCourseId, topics.length, canvasReady, dimensions.width, dimensions.height]);

  // Transform topics into graph nodes — planet view or solar system drill-down
  const showPlanetView = hasPlanets && !expandedCourseId;
  const expandedPlanet = expandedCourseId ? coursePlanets?.find(p => p.courseId === expandedCourseId) : null;
  const visibleTopics = expandedPlanet ? expandedPlanet.topics.map(t => ({
    id: t.id,
    title: t.title,
    mastery_score: t.mastery_score,
    orbit_state: t.orbit_state,
    next_review_date: t.next_review_date,
    updated_at: null as string | null,
    last_studied_at: t.last_studied_at,
  })) : topics;

  const isMobileCanvas = dimensions.width > 0 && dimensions.width < 768;
  const orbitRadius = isMobileCanvas ? 110 : 175;

  // Center point for positioning nodes
  const cx = dimensions.width / 2;
  const cy = dimensions.height / 2;

  const nodes: Node[] = showPlanetView
    ? (coursePlanets || []).map((planet, i, arr) => {
        // Distribute planets in a circle around center
        const angle = (2 * Math.PI * i) / arr.length - Math.PI / 2;
        const spread = Math.min(dimensions.width, dimensions.height) * 0.25;
        const r = arr.length === 1 ? 0 : spread;
        return {
          id: `planet_${planet.courseId}`,
          name: planet.courseName,
          masteryScore: planet.avgMastery,
          orbitState: 1,
          val: 12 + planet.topicCount * 3,
          color: planet.avgMastery >= 70 ? '#6366f1' : planet.avgMastery >= 30 ? '#f59e0b' : '#64748b',
          physicsMode: 'mastered' as const,
          isAnimating: false,
          isDueSoon: false,
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        };
      })
    : expandedPlanet
    ? // Solar system: center sun + orbiting assignment nodes
      // All nodes use fx/fy to pin to exact positions based on current container dimensions
      (() => {
        const cx = dimensions.width / 2;
        const cy = dimensions.height / 2;
        // Scale orbit radius to fit within the container (use smaller of width/height)
        const maxRadius = Math.min(dimensions.width, dimensions.height) * 0.3;
        const effectiveRadius = Math.min(orbitRadius, maxRadius);
        return [
          // Sun node — pinned to center
          {
            id: `sun_${expandedPlanet.courseId}`,
            name: expandedPlanet.courseName,
            masteryScore: expandedPlanet.avgMastery,
            orbitState: 1,
            val: 20 + expandedPlanet.topicCount * 2,
            color: expandedPlanet.avgMastery >= 70 ? '#6366f1' : expandedPlanet.avgMastery >= 30 ? '#f59e0b' : '#64748b',
            physicsMode: 'mastered' as const,
            isAnimating: false,
            isDueSoon: false,
            fx: cx,
            fy: cy,
          } as any,
          // Assignment nodes — pinned in orbit around center
          ...visibleTopics.map((topic, i) => {
            const angle = (2 * Math.PI * i) / visibleTopics.length - Math.PI / 2;
            return {
              id: topic.id,
              name: topic.title,
              masteryScore: topic.mastery_score || 0,
              orbitState: topic.orbit_state || 1,
              val: 10 + (topic.mastery_score || 0) / 10,
              color: getNodeColor(topic.orbit_state, justRescued.includes(topic.id)),
              physicsMode: 'mastered' as const,
              isAnimating: false,
              isDueSoon: topic.next_review_date ? (new Date(topic.next_review_date).getTime() - Date.now()) <= 48 * 60 * 60 * 1000 : false,
              fx: cx + Math.cos(angle) * effectiveRadius,
              fy: cy + Math.sin(angle) * effectiveRadius,
            };
          }),
        ];
      })()
    : visibleTopics.map((topic, i, arr) => {
        let physicsMode: 'mastered' | 'ghost' | 'snapBack';
        if (justRescued.includes(topic.id)) {
          physicsMode = 'snapBack';
        } else if (topic.orbit_state === 3) {
          physicsMode = 'ghost';
        } else {
          physicsMode = 'mastered';
        }

        let isDueSoon = false;
        if (topic.next_review_date) {
          const diff = new Date(topic.next_review_date).getTime() - Date.now();
          isDueSoon = diff > 0 && diff <= 48 * 60 * 60 * 1000;
        }

        // Start nodes near center in a circle — forces will adjust from here
        const angle = (2 * Math.PI * i) / arr.length - Math.PI / 2;
        const spread = Math.min(dimensions.width, dimensions.height) * 0.2;
        const r = arr.length === 1 ? 0 : spread;

        return {
          id: topic.id,
          name: topic.title,
          masteryScore: topic.mastery_score || 0,
          orbitState: topic.orbit_state || 1,
          val: 10 + (topic.mastery_score || 0) / 10,
          color: getNodeColor(topic.orbit_state, justRescued.includes(topic.id)),
          physicsMode,
          isAnimating: justRescued.includes(topic.id),
          isDueSoon,
          x: cx + Math.cos(angle) * r,
          y: cy + Math.sin(angle) * r,
        };
      });

  // Apply custom D3 forces — centering, bounds, Ghost Node physics, and solar system orbit
  useEffect(() => {
    if (!graphRef.current) return;

    const graph = graphRef.current;
    const { width, height } = dimensions;
    const nodeCount = nodes.length;
    const padding = 60;
    const isMobile = width < 768;

    try {
      const d3 = require('d3-force');

      if (expandedPlanet) {
        // Solar system mode: assignment nodes orbit around center
        const cx = width / 2;
        const cy = height / 2;
        // Strong centering so nodes converge quickly
        graph.d3Force('x', d3.forceX(cx).strength(0.3));
        graph.d3Force('y', d3.forceY(cy).strength(0.3));
        graph.d3Force('radial', d3.forceRadial(orbitRadius, cx, cy).strength((node: any) => {
          return node.id.startsWith('sun_') ? 0 : 0.8;
        }));
        // Keep nodes within viewport
        graph.d3Force('boundary', () => {
          const simNodes = graph.graphData().nodes;
          for (const n of simNodes) {
            if (n.fx !== undefined) continue; // Skip pinned sun node
            if (n.x !== undefined) n.x = Math.max(padding, Math.min(width - padding, n.x));
            if (n.y !== undefined) n.y = Math.max(padding, Math.min(height - padding, n.y));
          }
        });
      } else {
        // Normal galaxy mode — stronger centering for small graphs
        const centerStrength = nodeCount <= 3 ? 0.8 : nodeCount <= 6 ? 0.4 : isMobile ? 0.3 : 0.15;
        graph.d3Force('x', d3.forceX(width / 2).strength(centerStrength));
        graph.d3Force('y', d3.forceY(height / 2).strength(centerStrength));

        // Reduce charge repulsion for small graphs to prevent corner scatter
        if (nodeCount <= 5) {
          graph.d3Force('charge', d3.forceManyBody().strength(-30));
        }

        // Boundary force: hard clamp so no node escapes the visible canvas.
        graph.d3Force('boundary', () => {
          const simNodes = graph.graphData().nodes;
          for (const n of simNodes) {
            if (n.x !== undefined) n.x = Math.max(padding, Math.min(width - padding, n.x));
            if (n.y !== undefined) n.y = Math.max(padding, Math.min(height - padding, n.y));
          }
        });

        // Radial force for Ghost Node physics (drift / snap-back).
        graph.d3Force('radial', d3.forceRadial((node: Node) => {
          if (node.physicsMode === 'snapBack') {
            return 2.0 * 100;
          } else if (node.physicsMode === 'ghost') {
            return -0.3 * 100;
          } else {
            return 0.5 * 100;
          }
        }));
      }

      // Reheat simulation when physics mode changes or canvas resizes.
      if (justRescued.length > 0 || expandedPlanet) {
        graph.d3ReheatSimulation();
      }
    } catch (error) {
      console.error('[Galaxy] Failed to apply custom forces:', error);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [justRescued, dimensions.width, dimensions.height, nodes.length, expandedCourseId]);

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

  // Create links
  const links: Link[] = [];

  // Solar system orbital links (sun → each assignment)
  if (expandedPlanet) {
    const sunId = `sun_${expandedPlanet.courseId}`;
    for (const topic of visibleTopics) {
      links.push({ source: sunId, target: topic.id, isConstellation: false });
    }
  }

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
    // Course planet click → always drill down (never open FocusPanel)
    if (node.id.startsWith('planet_')) {
      const courseId = node.id.replace('planet_', '');
      setExpandedCourseId(courseId);
      return;
    }

    // Sun node in solar system view — ignore clicks (decorative center node)
    if (node.id.startsWith('sun_')) return;

    // Check if Weave Mode is active OR Shift key is pressed for constellation selection
    if (isWeaveModeActive || event.shiftKey) {
      handleConstellationSelection(node);
    } else {
      // Open Focus Panel for assignment/topic nodes only
      const topic = (expandedPlanet ? visibleTopics : topics).find(t => t.id === node.id);
      setFocusPanelState({
        isOpen: true,
        selectedTopicId: node.id,
        selectedTopicTitle: node.name,
        courseId: expandedCourseId,
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
      courseId: null,
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

  // Skip empty state if we have course planets to show (Level 1)
  if (topics.length === 0 && !hasPlanets) {
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

  // On mobile with 1-2 nodes, skip physics and place nodes manually in the center
  const isMobileView = dimensions.width > 0 && dimensions.width < 768;
  const useManualLayout = isMobileView && nodes.length <= 2 && dimensions.width > 0;
  const graphNodes = useManualLayout
    ? nodes.map((node, i) => ({
        ...node,
        fx: dimensions.width / 2 + (nodes.length === 2 ? (i === 0 ? -80 : 80) : 0),
        fy: dimensions.height / 2,
      }))
    : nodes;

  return (
    <div ref={containerRef} className="w-full h-full relative overflow-hidden">
      {/* Wait for canvas dimensions before rendering the force graph */}
      {!canvasReady && (
        <div className="absolute inset-0 bg-slate-950 flex items-center justify-center">
          <div className="text-slate-500 text-sm">Initializing galaxy...</div>
        </div>
      )}
      {/* Back to planets button — top-left on mobile, below legend panel on desktop */}
      {expandedCourseId && expandedPlanet && (
        <div className="absolute top-4 left-4 md:top-6 md:left-6 z-50">
          <button
            onClick={() => setExpandedCourseId(null)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl text-sm text-slate-200 hover:bg-slate-800/80 transition-colors"
          >
            &larr; {expandedPlanet.courseName}
          </button>
        </div>
      )}
      {canvasReady && <ForceGraph2D
        /* No key prop — avoid destroying/recreating simulation on drill-down */
        ref={graphRef}
        graphData={{ nodes: graphNodes, links }}
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
          d3AlphaDecay={0.05}
          d3VelocityDecay={0.4}
          cooldownTicks={60}
          onEngineStop={() => {
            if (graphRef.current) {
              const isMobile = dimensions.width < 768;
              const padding = isMobile ? 30 : 50;
              graphRef.current.centerAt(dimensions.width / 2, dimensions.height / 2, 200);
              graphRef.current.zoomToFit(400, padding);
            }
          }}
        />}
      
      {/* Reset View button — bottom-right to avoid top-right HUD overlap */}
      <button
        onClick={() => graphRef.current?.zoomToFit(400, dimensions.width < 768 ? 30 : 50)}
        className="absolute bottom-4 right-4 z-30 px-3 py-2 rounded-xl text-sm font-medium transition-all shadow-xl backdrop-blur-md border min-h-[44px] min-w-[44px] bg-slate-900/60 border-slate-700/50 text-slate-300 hover:bg-slate-800/60"
        title="Reset view to show all nodes"
      >
        <span className="flex items-center gap-1.5">
          <Maximize2 className="w-4 h-4" />
          <span className="hidden sm:inline">Reset View</span>
        </span>
      </button>

      {/* Weave Mode Toggle - Positioned below the page-level top-right HUD */}
      <button
        onClick={() => setIsWeaveModeActive(!isWeaveModeActive)}
        className={`absolute top-[4.5rem] md:top-24 right-2 md:right-6 z-30 px-3 md:px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-2xl backdrop-blur-md border min-h-[44px] min-w-[44px] ${
          isWeaveModeActive
            ? 'bg-amber-600/90 border-amber-500/50 text-white'
            : 'bg-slate-900/60 border-slate-700/50 text-slate-300 hover:bg-slate-800/60'
        }`}
        title={isWeaveModeActive ? 'Weave Mode Active - Tap nodes to select' : 'Enable Weave Mode for touch selection'}
      >
        <span className="flex items-center gap-1.5 md:gap-2">
          <span>🕸️</span>
          <span className="hidden sm:inline">Weave Mode</span>
          {isWeaveModeActive && <span className="text-xs">(Active)</span>}
        </span>
      </button>

      {/* Loom Dock - Bottom slide-up panel */}
      {showLoomDock && (
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-700 p-3 md:p-4 rounded-b-lg animate-slide-up safe-area-bottom">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 sm:gap-3 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="text-amber-400 text-sm font-medium truncate">
                {selectedConstellation.length} concept{selectedConstellation.length !== 1 ? 's' : ''} selected
              </div>
              <div className="text-slate-500 text-xs hidden md:block">
                Shift+Click or Weave Mode to add/remove stars
              </div>
            </div>
            <button
              onClick={handleWeaveThesis}
              disabled={isCreatingSession}
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
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
              courseId: expandedCourseId,
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
            const params = new URLSearchParams({
              topicId: focusPanelState.selectedTopicId,
              topicTitle: focusPanelState.selectedTopicTitle,
              action,
            });
            if (focusPanelState.courseId) {
              params.set('classId', focusPanelState.courseId);
            }
            router.push(`/tutor?${params.toString()}`);
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
