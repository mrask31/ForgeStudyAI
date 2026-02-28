'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-center">
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
}

interface Link {
  source: string;
  target: string;
  isConstellation?: boolean; // Mark constellation threads
}

interface ConceptGalaxyProps {
  topics: Topic[];
  profileId?: string; // For lazy evaluation
  onTopicsRefresh?: () => void; // Callback to refresh topics after lazy eval
}

export function ConceptGalaxy({ topics, profileId, onTopicsRefresh }: ConceptGalaxyProps) {
  const router = useRouter();
  const graphRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  
  // Constellation state management
  const [selectedConstellation, setSelectedConstellation] = useState<string[]>([]);
  const [showLoomDock, setShowLoomDock] = useState(false);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  
  // Permanent edges state
  const [permanentEdges, setPermanentEdges] = useState<Array<{ source: string; target: string }>>([]);
  
  // Vault: Snap-back animation state
  const [justRescued, setJustRescued] = useState<string[]>([]);

  // Update dimensions on mount and resize
  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('galaxy-container');
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: 600,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
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
  }, [nodes, justRescued]);

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
    
    return {
      id: topic.id,
      name: topic.title,
      masteryScore: topic.mastery_score || 0,
      orbitState: topic.orbit_state || 1,
      val: 10 + (topic.mastery_score || 0) / 10, // Size based on mastery (10-20)
      color: getNodeColor(topic.orbit_state, justRescued.includes(topic.id)),
      physicsMode,
      isAnimating: justRescued.includes(topic.id),
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
    // Check if Shift key is pressed for constellation selection
    if (event.shiftKey) {
      handleConstellationSelection(node);
    } else {
      // Normal click: Navigate to tutor
      router.push(`/tutor?topicId=${node.id}&topicTitle=${encodeURIComponent(node.name)}`);
    }
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
    return (
      <div className="w-full h-[600px] bg-slate-950 rounded-lg border border-slate-800 flex flex-col items-center justify-center gap-4">
        <div className="text-slate-400 text-lg">Your galaxy is empty</div>
        <div className="text-slate-500 text-sm">Start studying to see your progress visualized here</div>
      </div>
    );
  }

  return (
    <div id="galaxy-container" className="w-full relative">
      <div className="w-full h-[600px] bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
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
            // Custom node rendering with glow effect for mastered topics
            const label = node.name;
            const fontSize = 12 / globalScale;
            const nodeSize = node.val;
            const isSelected = selectedConstellation.includes(node.id);
            const isGhost = node.orbitState === 3;
            const isSnapBack = node.isAnimating;
            
            // Calculate opacity
            let opacity = 1.0;
            if (isGhost && !isSnapBack) {
              opacity = 0.4; // 40% opacity for Ghost Nodes
            } else if (isSnapBack) {
              // Animate opacity from 0.4 to 1.0 over 1 second
              opacity = 1.0; // Simplified - full opacity during snap-back
            }
            
            // Draw glow for mastered topics, selected nodes, or snap-back
            if (node.masteryScore > 70 || isSelected || isSnapBack) {
              ctx.shadowBlur = isSelected ? 30 : (isSnapBack ? 40 : 20);
              ctx.shadowColor = isSelected ? '#f59e0b' : node.color; // Amber glow for selected
            } else {
              ctx.shadowBlur = 0;
            }
            
            // Apply opacity
            ctx.globalAlpha = opacity;
            
            // Draw circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
            ctx.fillStyle = isSelected ? '#f59e0b' : node.color; // Amber fill for selected
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
            ctx.fillText(label, node.x, node.y + nodeSize + fontSize + 2);
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
      </div>

      {/* Loom Dock - Bottom slide-up panel */}
      {showLoomDock && (
        <div className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 p-4 rounded-b-lg animate-slide-up">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <div className="flex items-center gap-3">
              <div className="text-amber-400 text-sm font-medium">
                {selectedConstellation.length} concept{selectedConstellation.length !== 1 ? 's' : ''} selected
              </div>
              <div className="text-slate-500 text-xs">
                Shift+Click to add or remove stars
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
