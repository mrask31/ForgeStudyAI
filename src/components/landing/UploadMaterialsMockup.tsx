'use client'

import { FileText, Calendar, Upload, Sparkles, MessageSquare, CheckCircle2, Trash2, Edit } from 'lucide-react'

export default function UploadMaterialsMockup() {
  return (
    <div className="w-full h-full bg-slate-50 p-3 sm:p-4 overflow-y-auto scale-90 sm:scale-100 origin-top">
      {/* Header Section */}
      <div className="mb-3 sm:mb-4">
        <div className="flex items-start justify-between mb-1.5 sm:mb-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">NUR 221</h1>
            <span className="px-1.5 sm:px-2 py-0.5 bg-slate-200 rounded text-slate-700 text-[10px] sm:text-xs font-medium">Med-Surg</span>
          </div>
          <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-500" />
        </div>
        <p className="text-xs sm:text-sm text-slate-600 mb-1.5 sm:mb-2">Med-Surg I</p>
        <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs text-slate-500">
          <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>Next exam: 2/17/2026</span>
        </div>
      </div>

      {/* Material Summary */}
      <div className="mb-3 sm:mb-4 space-y-1.5 sm:space-y-2">
        <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-slate-600 flex-wrap">
          <FileText className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          <span>2 materials</span>
          <span className="px-1 sm:px-1.5 py-0.5 bg-slate-200 rounded text-slate-700">Syllabi: 1</span>
          <span className="px-1 sm:px-1.5 py-0.5 bg-slate-200 rounded text-slate-700">Textbooks: 1</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4 text-[10px] sm:text-xs text-slate-600">
          <div className="flex items-center gap-1 sm:gap-1.5">
            <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-500" />
            <span>2 active</span>
          </div>
          <div className="flex items-center gap-1 sm:gap-1.5">
            <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span>1 chat</span>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-3 sm:mb-4 space-y-1.5 sm:space-y-2">
        <button className="w-full flex items-center justify-center gap-1.5 sm:gap-2 bg-indigo-600 text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-medium hover:bg-indigo-700 transition-colors">
          <Sparkles className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Study with AI Tutor
        </button>
        <button className="w-full flex items-center justify-center gap-1.5 sm:gap-2 bg-slate-200 text-slate-700 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs font-medium hover:bg-slate-300 transition-colors">
          <Upload className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          Upload Materials
        </button>
      </div>

      {/* YOUR MATERIALS Section */}
      <div className="mb-3 sm:mb-4">
        <h2 className="text-[10px] sm:text-xs font-bold text-slate-900 uppercase tracking-wide mb-1.5 sm:mb-2">YOUR MATERIALS</h2>
        <div className="space-y-1.5 sm:space-y-2">
          {/* Material 1 */}
          <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-200">
            <div className="flex items-start gap-1.5 sm:gap-2">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-slate-900 truncate">Medical_Surgical_Unit_...</p>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                  <span className="px-1 sm:px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 text-[10px] sm:text-xs">Textbook</span>
                  <span className="text-[10px] sm:text-xs text-slate-500">12/30/2025</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <div className="w-7 h-3.5 sm:w-8 sm:h-4 bg-emerald-500 rounded-full relative">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </div>
                  <span className="text-[10px] sm:text-xs text-emerald-600 font-medium">Active</span>
                </div>
                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500 cursor-pointer" />
              </div>
            </div>
          </div>

          {/* Material 2 */}
          <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-200">
            <div className="flex items-start gap-1.5 sm:gap-2">
              <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] sm:text-xs font-medium text-slate-900 truncate">NURS201_Syllabus_Poli...</p>
                <div className="flex items-center gap-1.5 sm:gap-2 mt-0.5 sm:mt-1">
                  <span className="px-1 sm:px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 text-[10px] sm:text-xs">Syllabus</span>
                  <span className="text-[10px] sm:text-xs text-slate-500">12/30/2025</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
                <div className="flex items-center gap-1 sm:gap-1.5">
                  <div className="w-7 h-3.5 sm:w-8 sm:h-4 bg-emerald-500 rounded-full relative">
                    <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-white rounded-full absolute right-0.5 top-0.5"></div>
                  </div>
                  <span className="text-[10px] sm:text-xs text-emerald-600 font-medium">Active</span>
                </div>
                <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-rose-500 cursor-pointer" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* RECENT STUDY SESSIONS Section */}
      <div>
        <h2 className="text-[10px] sm:text-xs font-bold text-slate-900 uppercase tracking-wide mb-1.5 sm:mb-2">RECENT STUDY SESSIONS</h2>
        <div className="bg-white rounded-lg p-2 sm:p-3 border border-slate-200">
          <div className="flex items-start gap-1.5 sm:gap-2">
            <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs text-slate-700 line-clamp-2">Certainly! Here are the top two te...</p>
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0 text-[10px] sm:text-xs text-slate-500">
              <Calendar className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
              <span>1/2/2026</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

