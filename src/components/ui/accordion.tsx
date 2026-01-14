'use client'

import * as React from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AccordionItem {
  question: string
  answer: string
}

interface AccordionProps {
  items: AccordionItem[]
  className?: string
}

export function Accordion({ items, className }: AccordionProps) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(null)

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div className={cn('space-y-4', className)}>
      {items.map((item, index) => (
        <div
          key={index}
          className="border border-slate-200 rounded-xl overflow-hidden bg-white hover:border-teal-300 transition-colors shadow-sm hover:shadow-md"
        >
          <button
            onClick={() => toggle(index)}
            className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
          >
            <span className="font-semibold text-slate-900 pr-8">{item.question}</span>
            <ChevronDown
              className={cn(
                'w-5 h-5 text-teal-600 flex-shrink-0 transition-transform',
                openIndex === index && 'transform rotate-180'
              )}
            />
          </button>
          {openIndex === index && (
            <div className="px-6 pb-4 text-slate-700 leading-relaxed border-t border-slate-100 pt-4">
              {item.answer}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
