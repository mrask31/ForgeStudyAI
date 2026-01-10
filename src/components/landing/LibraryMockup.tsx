'use client'

import { Bookmark, Folder, Tag, ArrowRight } from 'lucide-react'

export default function LibraryMockup() {
  return (
    <div className="w-full h-full bg-slate-100 p-3 sm:p-4 overflow-y-auto scale-90 sm:scale-100 origin-top">
      {/* Header */}
      <div className="mb-3 sm:mb-4">
        <h1 className="text-lg sm:text-xl font-semibold text-slate-900 mb-1">My Learning Library</h1>
        <p className="text-[10px] sm:text-xs text-slate-600">Saved learning moments from your tutoring sessions</p>
      </div>

      {/* Search Bar */}
      <div className="mb-3 sm:mb-4">
        <div className="relative">
          <input
            type="text"
            placeholder="Search clips..."
            className="w-full pl-8 pr-3 py-1.5 sm:py-2 border border-slate-300 rounded-lg text-[10px] sm:text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="absolute left-2.5 top-1/2 transform -translate-y-1/2">
            <div className="w-3 h-3 sm:w-3.5 sm:h-3.5 bg-slate-400 rounded-full"></div>
          </div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-3 sm:mb-4">
        <button className="px-2 py-1 bg-indigo-600 text-white rounded-lg text-[9px] sm:text-[10px] font-medium">
          All
        </button>
        <button className="px-2 py-1 bg-white text-slate-700 border border-slate-300 rounded-lg text-[9px] sm:text-[10px] font-medium flex items-center gap-1">
          <Folder className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          Med-Surg
        </button>
        <button className="px-2 py-1 bg-white text-slate-700 border border-slate-300 rounded-lg text-[9px] sm:text-[10px] font-medium flex items-center gap-1">
          <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          Heart Failure
        </button>
      </div>

      {/* Clips Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
        {/* Clip 1 */}
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 shadow-sm">
          <div className="mb-2">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-1 line-clamp-1">
              Heart Failure Priority Interventions
            </h3>
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-500">
              <Folder className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>Med-Surg</span>
              <span>•</span>
              <span>1/2/2026</span>
            </div>
          </div>
          <p className="text-[9px] sm:text-[10px] text-slate-600 mb-2 line-clamp-2">
            Step 1 — Assess ABCs. Check airway, breathing, and circulation first. In heart failure, look for signs of respiratory distress...
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[8px] sm:text-[9px]">
              Priority
            </span>
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[8px] sm:text-[9px]">
              Cardiac
            </span>
          </div>
          <button className="w-full flex items-center justify-center gap-1 bg-indigo-600 text-white px-2 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-medium hover:bg-indigo-700 transition-colors">
            Continue Chat
            <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </button>
        </div>

        {/* Clip 2 */}
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 shadow-sm">
          <div className="mb-2">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-1 line-clamp-1">
              Diuretic Management
            </h3>
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-500">
              <Folder className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>Med-Surg</span>
              <span>•</span>
              <span>12/30/2025</span>
            </div>
          </div>
          <p className="text-[9px] sm:text-[10px] text-slate-600 mb-2 line-clamp-2">
            Monitor electrolytes, especially potassium. Administer diuretics as ordered and assess for signs of dehydration...
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[8px] sm:text-[9px]">
              Medications
            </span>
          </div>
          <button className="w-full flex items-center justify-center gap-1 bg-indigo-600 text-white px-2 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-medium hover:bg-indigo-700 transition-colors">
            Review
            <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </button>
        </div>

        {/* Clip 3 */}
        <div className="bg-white border border-slate-200 rounded-lg p-2.5 sm:p-3 shadow-sm">
          <div className="mb-2">
            <h3 className="text-xs sm:text-sm font-semibold text-slate-900 mb-1 line-clamp-1">
              Fluid Overload Assessment
            </h3>
            <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-slate-500">
              <Folder className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              <span>Med-Surg</span>
              <span>•</span>
              <span>12/28/2025</span>
            </div>
          </div>
          <p className="text-[9px] sm:text-[10px] text-slate-600 mb-2 line-clamp-2">
            Daily weights, I&O monitoring, and assess for peripheral edema. Track fluid status to prevent complications...
          </p>
          <div className="flex flex-wrap gap-1 mb-2">
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[8px] sm:text-[9px]">
              Assessment
            </span>
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[8px] sm:text-[9px]">
              Monitoring
            </span>
          </div>
          <button className="w-full flex items-center justify-center gap-1 bg-indigo-600 text-white px-2 py-1.5 rounded-lg text-[9px] sm:text-[10px] font-medium hover:bg-indigo-700 transition-colors">
            Review
            <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
          </button>
        </div>
      </div>
    </div>
  )
}

