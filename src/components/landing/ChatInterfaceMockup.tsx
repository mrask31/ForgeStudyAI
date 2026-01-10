'use client'

import { MessageSquare, ArrowUp, FileIcon, Bookmark, Map } from 'lucide-react'

export default function ChatInterfaceMockup() {
  return (
    <div className="w-full h-full bg-white flex flex-col scale-90 sm:scale-100 origin-top">
      {/* Chat Messages Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
        {/* User Message */}
        <div className="flex justify-end">
          <div className="max-w-[80%] bg-indigo-600 text-white rounded-lg px-3 py-2 text-[10px] sm:text-xs">
            What are the priority nursing interventions for a patient with heart failure?
          </div>
        </div>

        {/* Assistant Message */}
        <div className="flex justify-start">
          <div className="max-w-[85%] bg-slate-50 border border-slate-200 rounded-lg p-3 sm:p-4">
            {/* Header with grounding indicator */}
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
              <div className="flex items-center gap-1.5">
                <FileIcon className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-teal-600" />
                <span className="text-[9px] sm:text-[10px] text-teal-700 font-medium">
                  ✅ Using: your uploaded materials
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button className="p-1 hover:bg-indigo-50 rounded text-slate-500">
                  <Map className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
                <button className="p-1 hover:bg-indigo-50 rounded text-slate-500">
                  <Bookmark className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </button>
              </div>
            </div>

            {/* Step-by-step reasoning */}
            <div className="space-y-2 text-[10px] sm:text-xs text-slate-700">
              <div>
                <p className="font-semibold mb-1">Step 1 — Assess ABCs</p>
                <p className="text-slate-600">Check airway, breathing, and circulation first. In heart failure, look for signs of respiratory distress...</p>
              </div>
              <div>
                <p className="font-semibold mb-1">Step 2 — Monitor Fluid Status</p>
                <p className="text-slate-600">Daily weights, I&O, and assess for edema. This helps track fluid overload...</p>
              </div>
              <div>
                <p className="font-semibold mb-1">Step 3 — Medication Management</p>
                <p className="text-slate-600">Administer diuretics as ordered, monitor electrolytes, especially potassium...</p>
              </div>
            </div>
          </div>
        </div>

        {/* Follow-up prompt suggestions */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 px-1">
          <button className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] sm:text-[10px] font-medium hover:bg-indigo-100 transition-colors">
            Explain diuretics
          </button>
          <button className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] sm:text-[10px] font-medium hover:bg-indigo-100 transition-colors">
            What are the risks?
          </button>
          <button className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-lg text-[9px] sm:text-[10px] font-medium hover:bg-indigo-100 transition-colors">
            Priority assessment
          </button>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200 p-3 sm:p-4 bg-white">
        <div className="flex items-end gap-2">
          <div className="flex-1 relative">
            <textarea
              placeholder="Ask a clinical question or reference your binder materials…"
              className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-[10px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={1}
              style={{ minHeight: '36px', maxHeight: '96px' }}
            />
          </div>
          <button className="flex-shrink-0 w-8 h-8 sm:w-9 sm:h-9 bg-indigo-600 text-white rounded-lg flex items-center justify-center hover:bg-indigo-700 transition-colors">
            <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

