'use client';

import { useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-slate-900 rounded-lg flex items-center justify-center">
      <div className="text-slate-400">Loading constellation...</div>
    </div>
  ),
});

interface Topic {
  id: string;
  title: string;
  mastery_score: number;
  orbit_state: number;
}

interface Node {
  id: string;
  name: string;
  masteryScore: number;
  val: number;
  color: string;
}

interface Link {
  source: string;
  target: string;
  isConstellation: boolean;
}

interface LockedConstellationProps {
  topics: Topic[];
  selectedTopicIds: string[];
}

export function LockedConstellation({ topics, selectedTopicIds }: LockedConstellationProps) {
  const graphRef = useRef<any>();
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  useEffect(() => {
    const updateDimensions = () => {
      const container = document.getElementById('locked-constellation-container');
      if (container) {
        setDimensions({
          width: container.clientWidth,
          height: container.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Filter to only selected topics
  const selectedTopics = topics.filter(t => selectedTopicIds.includes(t.id));

  // Transform topics into graph nodes
  const nodes: Node[] = selectedTopics.map(topic => ({
    id: topic.id,
    name: topic.title,
    masteryScore: topic.mastery_score || 0,
    val: 10 + (topic.mastery_score || 0) / 10,
    color: '#6366f1', // Indigo for mastered nodes
  }));

  // Create constellation links (all pairs)
  const links: Link[] = [];
  for (let i = 0; i < selectedTopicIds.length; i++) {
    for (let j = i + 1; j < selectedTopicIds.length; j++) {
      links.push({
        source: selectedTopicIds[i],
        target: selectedTopicIds[j],
        isConstellation: true,
      });
    }
  }

  return (
    <div id="locked-constellation-container" className="w-full h-full bg-slate-900 rounded-lg border border-slate-800 overflow-hidden">
      <ForceGraph2D
        ref={graphRef}
        graphData={{ nodes, links }}
        width={dimensions.width}
        height={dimensions.height}
        nodeLabel="name"
        nodeColor="color"
        nodeVal="val"
        enableNodeDrag={false}
        enableZoomInteractions={false}
        enablePanInteractions={false}
        nodeCanvasObject={(node: any, ctx, globalScale) => {
          const label = node.name;
          const fontSize = 12 / globalScale;
          const nodeSize = node.val;
          
          // Draw glow for mastered topics
          ctx.shadowBlur = 20;
          ctx.shadowColor = node.color;
          
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
        backgroundColor="#0f172a"
        linkColor={() => 'rgba(251, 191, 36, 0.6)'}
        linkWidth={2}
        d3AlphaDecay={0.02}
        d3VelocityDecay={0.3}
        cooldownTicks={100}
        onEngineStop={() => {
          if (graphRef.current) {
            graphRef.current.zoomToFit(200, 30);
          }
        }}
      />
    </div>
  );
}
