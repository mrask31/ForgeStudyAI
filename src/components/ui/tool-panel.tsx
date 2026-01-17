'use client'

import type { ReactNode } from 'react'
import { X } from 'lucide-react'

export const TOOL_PANEL_WIDTH_CLASS = 'w-[420px]'

interface ToolPanelProps {
  isOpen: boolean
  onClose: () => void
  title: string
  icon: ReactNode
  children: ReactNode
  panelWidthClassName?: string
  contentClassName?: string
}

export default function ToolPanel({
  isOpen,
  onClose,
  title,
  icon,
  children,
  panelWidthClassName,
  contentClassName,
}: ToolPanelProps) {
  if (!isOpen) return null

  const widthClass = panelWidthClassName || TOOL_PANEL_WIDTH_CLASS
  const contentClass = contentClassName || 'p-5'

  return (
    <>
      {/* Mobile: Bottom Sheet */}
      <div className="md:hidden fixed inset-0 z-50">
        <div className="absolute inset-0 bg-black/50" onClick={onClose} />
        <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-lg shadow-xl max-h-[85vh] overflow-hidden flex flex-col">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 shrink-0">
            <div className="flex items-center gap-2">
              {icon}
              <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-1 text-slate-500 hover:text-slate-700 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div className={contentClass}>{children}</div>
          </div>
        </div>
      </div>

      {/* Desktop: Side Panel */}
      <div className={`hidden md:block fixed right-0 top-0 bottom-0 ${widthClass} bg-white border-l border-slate-200 shadow-xl z-40`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-500 hover:text-slate-700 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-y-auto h-[calc(100dvh-4rem)]">
          <div className={contentClass}>{children}</div>
        </div>
      </div>
    </>
  )
}
