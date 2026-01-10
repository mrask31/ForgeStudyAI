'use client'

import { FileText } from 'lucide-react'

interface AttachedFile {
  id: string
  name: string
  document_type: string | null
}

interface ContextPanelProps {
  attachedFiles?: AttachedFile[]
  detectedConcepts?: string[]
}

export default function ContextPanel({ 
  attachedFiles = [], 
  detectedConcepts = [] 
}: ContextPanelProps) {
  return (
    <div className="flex h-full flex-col bg-white">
      {/* Fixed Header */}
      <div className="shrink-0 h-14 flex items-center px-4 border-b border-slate-100 bg-white">
        <h3 className="font-semibold text-slate-700 text-sm">
          Context & Evidence
        </h3>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Section 1: Active Sources */}
        <div>
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Active Sources</h4>
          {attachedFiles.length > 0 ? (
            <div className="space-y-2">
              {attachedFiles.map((file) => (
                <div key={file.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3">
                  <FileText className="w-5 h-5 text-indigo-600 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-700">
                      {file.name}
                    </p>
                    {file.document_type && (
                      <p className="text-[10px] text-slate-500 mt-0.5 capitalize">
                        {file.document_type}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 border-dashed text-center">
              <FileText className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-500">No active files.</p>
            </div>
          )}
        </div>

        {/* Section 2: Key Concepts */}
        <div>
          <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">Key Concepts Detected</h4>
          <div className="flex flex-wrap gap-2">
            {['Heart Failure', 'Fluid Overload', 'Diuretics', 'Nursing Care'].map((tag) => (
              <span 
                key={tag} 
                className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 text-xs rounded-full border border-indigo-100 mb-2 mr-2"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

