'use client'

interface DesmosEmbedProps {
  equation: string
}

/**
 * Renders a Desmos graphing calculator iframe pre-loaded with an equation.
 * Uses the free Desmos embed API (no key needed).
 */
export function DesmosEmbed({ equation }: DesmosEmbedProps) {
  // URL-encode the equation for the Desmos calculator URL
  const encodedEquation = encodeURIComponent(equation)
  const desmosUrl = `https://www.desmos.com/calculator?embed&lang=en&equations=${encodedEquation}`

  return (
    <div className="my-4 rounded-xl overflow-hidden border border-slate-200 shadow-md bg-white">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 border-b border-slate-200">
        <svg className="w-4 h-4 text-green-600" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3v18h18V3H3zm16 16H5V5h14v14zM7 7h2v2H7V7zm0 4h2v2H7v-2zm0 4h2v2H7v-2z"/>
        </svg>
        <span className="text-xs font-medium text-slate-600">Interactive Graph: {equation}</span>
      </div>
      <iframe
        src={desmosUrl}
        width="100%"
        height="300"
        className="border-0"
        title={`Desmos graph: ${equation}`}
        sandbox="allow-scripts allow-same-origin"
        loading="lazy"
      />
    </div>
  )
}

/**
 * Parses message content for [DESMOS: equation] markers and returns
 * segments of text and Desmos embeds.
 */
export function parseDesmosMarkers(content: string): Array<{ type: 'text' | 'desmos'; value: string }> {
  const regex = /\[DESMOS:\s*(.+?)\]/g
  const segments: Array<{ type: 'text' | 'desmos'; value: string }> = []
  let lastIndex = 0
  let match

  while ((match = regex.exec(content)) !== null) {
    // Add text before the marker
    if (match.index > lastIndex) {
      segments.push({ type: 'text', value: content.slice(lastIndex, match.index) })
    }
    // Add the Desmos embed
    segments.push({ type: 'desmos', value: match[1].trim() })
    lastIndex = regex.lastIndex
  }

  // Add remaining text
  if (lastIndex < content.length) {
    segments.push({ type: 'text', value: content.slice(lastIndex) })
  }

  return segments.length > 0 ? segments : [{ type: 'text', value: content }]
}
