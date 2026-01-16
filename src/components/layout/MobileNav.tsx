'use client'

import { X } from 'lucide-react'
import Sidebar from '@/components/layout/Sidebar'

interface MobileNavProps {
  open: boolean
  onClose: () => void
}

export default function MobileNav({ open, onClose }: MobileNavProps) {
  return (
    <>
      {/* Backdrop - Only visible when drawer is open */}
      <div
        className={`
          fixed inset-0 z-50 bg-black/50 backdrop-blur-sm
          transition-opacity duration-300 ease-in-out
          ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        onClick={onClose}
        aria-hidden={!open}
      />

      {/* Drawer - Slides in from left */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] 
          bg-gradient-to-br from-slate-950 via-teal-900 to-emerald-950
          border-r border-teal-900/50
          transform transition-transform duration-300 ease-in-out
          overflow-y-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
        aria-label="Navigation menu"
        aria-hidden={!open}
      >
        {/* Close Button */}
        <div className="flex justify-end p-4 border-b border-teal-900/50">
          <button
            onClick={onClose}
            className="p-2 text-teal-100 hover:text-white hover:bg-teal-900/50 rounded-lg transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Sidebar Content */}
        <div className="pt-2">
          <Sidebar onNavigate={onClose} />
        </div>
      </aside>
    </>
  )
}

