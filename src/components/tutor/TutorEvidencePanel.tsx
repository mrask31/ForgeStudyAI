'use client'

import { FileText, BookOpen, CheckCircle } from 'lucide-react'

export type TutorEvidenceItem = {
  id: string
  filename: string
  documentType?: string
  chapterOrSection?: string
  pageLabel?: string
  snippet: string
}

interface AttachedFile {
  id: string
  name: string
  document_type: string | null
}

interface TutorEvidencePanelProps {
  evidence?: TutorEvidenceItem[]
  attachedFiles?: AttachedFile[]
  detectedConcepts?: string[]
}

// Evidence Card Component
function EvidenceCard({ evidence }: { evidence?: TutorEvidenceItem[] }) {
  const hasEvidence = evidence && evidence.length > 0

  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
          Evidence from your binder
        </h3>
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px] text-slate-500">
          i
        </span>
      </div>

      {hasEvidence ? (
        <ul className="space-y-3">
          {evidence.slice(0, 4).map((item) => (
            <li
              key={item.id}
              className="rounded-xl bg-white border border-slate-200/80 px-3 py-2.5 shadow-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <p className="text-[11px] font-semibold text-slate-700 truncate">
                  {item.filename}
                </p>
                {item.documentType && (
                  <span className="ml-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium capitalize text-slate-500 flex-shrink-0">
                    {item.documentType}
                  </span>
                )}
              </div>
              {item.chapterOrSection && (
                <p className="text-[11px] text-slate-500 mb-0.5 truncate">
                  {item.chapterOrSection}
                </p>
              )}
              <p className="text-[11px] text-slate-600 leading-snug line-clamp-3">
                {item.snippet}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-slate-500 leading-relaxed">
          When the tutor uses your uploaded materials, you'll see the key
          lines and file names here.
        </p>
      )}
    </div>
  )
}

// Active Sources Card Component
function ActiveSourcesCard({ 
  attachedFiles = [], 
  detectedConcepts = [] 
}: { 
  attachedFiles?: AttachedFile[]
  detectedConcepts?: string[]
}) {
  // Hardcoded concepts for demo (can be replaced with actual detection later)
  const defaultConcepts = [
    'Heart Failure',
    'Diuretics',
    'Fluid Overload',
    'Cardiac Output',
    'ACE Inhibitors'
  ]
  
  const concepts = detectedConcepts.length > 0 ? detectedConcepts : defaultConcepts
  const hasFiles = attachedFiles.length > 0

  return (
    <div className="rounded-2xl bg-white border border-slate-200/70 shadow-sm p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold tracking-wide text-slate-600 uppercase">
          Active Sources
        </h3>
      </div>

      <div className="space-y-4">
        {/* Section 1: Files */}
        <div>
          <h4 className="text-xs font-semibold text-slate-600 mb-3">Attached Files</h4>
          {hasFiles ? (
            <div className="space-y-3">
              {attachedFiles.map((file) => (
                <div
                  key={file.id}
                  className="bg-slate-50 border border-slate-200 rounded-lg p-3 hover:bg-slate-100 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-teal-50 border border-teal-100 flex items-center justify-center">
                      <FileText className="w-4 h-4 text-teal-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-xs font-medium text-slate-900 truncate">
                          {file.name}
                        </p>
                        <span className="flex-shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100">
                          <CheckCircle className="w-2.5 h-2.5" />
                          Active
                        </span>
                      </div>
                      {file.document_type && (
                        <p className="text-[10px] text-slate-500 capitalize">
                          {file.document_type}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 text-center">
              <BookOpen className="w-6 h-6 text-slate-400 mx-auto mb-2" />
              <p className="text-xs text-slate-600 mb-1 font-medium">
                No sources active
              </p>
              <p className="text-[10px] text-slate-500">
                Attach a file to see the tutor's references here.
              </p>
            </div>
          )}
        </div>

        {/* Section 2: Key Concepts */}
        <div>
          <h4 className="text-xs font-semibold text-slate-600 mb-3">Detected Concepts</h4>
          {concepts.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {concepts.map((concept, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200"
                >
                  {concept}
                </span>
              ))}
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-center">
              <p className="text-[10px] text-slate-500">
                Concepts will appear as you chat
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function TutorEvidencePanel({
  evidence,
  attachedFiles = [],
  detectedConcepts = [],
}: TutorEvidencePanelProps) {
  return (
    <aside className="hidden xl:flex h-full w-[320px] flex-col">
      <div className="space-y-4">
        {/* Evidence card */}
        <EvidenceCard evidence={evidence} />

        {/* Active sources card */}
        <ActiveSourcesCard
          attachedFiles={attachedFiles}
          detectedConcepts={detectedConcepts}
        />
      </div>
    </aside>
  )
}

