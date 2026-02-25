'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

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
}

interface Node {
  id: string;
  name: string;
  masteryScore: number;
  val: number; // Node size
  color: string;
}

interface Link {
  source: string;
  target: string;
}

interface ConceptGalaxyProps {
  topics: Topic[];
}

export function ConceptGalaxy({ topics }: ConceptGalaxyProps) {
  const router = useRouter();
  const graphRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });

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

  // Transform topics into graph nodes
  const nodes: Node[] = topics.map(topic => ({
    id: topic.id,
    name: topic.title,
    masteryScore: topic.mastery_score || 0,
    val: 10 + (topic.mastery_score || 0) / 10, // Size based on mastery (10-20)
    color: getMasteryColor(topic.mastery_score || 0),
  }));

  // Create links (for now, no relationships - just isolated nodes)
  const links: Link[] = [];

  const handleNodeClick = (node: any) => {
    // Navigate to tutor with topic context
    router.push(`/tutor?topicId=${node.id}&topicTitle=${encodeURIComponent(node.name)}`);
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
    <div id="galaxy-container" className="w-full">
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
            
            // Draw glow for mastered topics (>70%)
            if (node.masteryScore > 70) {
              ctx.shadowBlur = 20;
              ctx.shadowColor = node.color;
            } else {
              ctx.shadowBlur = 0;
            }
            
            // Draw circle
            ctx.beginPath();
            ctx.arc(node.x, node.y, nodeSize, 0, 2 * Math.PI);
            ctx.fillStyle = node.color;
            ctx.fill();
            
            // Reset shadow
            ctx.shadowBlur = 0;
            
            // Draw label
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = '#fff';
            ctx.fillText(label, node.x, node.y + nodeSize + fontSize + 2);
          }}
          backgroundColor="#020617"
          linkColor={() => '#334155'}
          linkWidth={1}
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
    </div>
  );
}

function getMasteryColor(score: number): string {
  if (score < 30) return '#64748b'; // Grey (slate-500) - Learning
  if (score < 70) return '#f59e0b'; // Amber (amber-500) - Developing
  return '#6366f1'; // Indigo (indigo-500) - Mastered
}
