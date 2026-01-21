'use client'

import { useState, useEffect, useMemo } from 'react'
import { Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { getStudentProfiles } from '@/app/actions/student-profiles'
import ToolPanel from '@/components/ui/tool-panel'

type CalculatorLevel = 'middle' | 'high'

interface MedicalMathCalculatorProps {
  isOpen: boolean
  onClose: () => void
}

export default function MedicalMathCalculator({ isOpen, onClose }: MedicalMathCalculatorProps) {
  const { activeProfileId } = useActiveProfile()
  const [activeLevel, setActiveLevel] = useState<CalculatorLevel>('middle')
  const [expression, setExpression] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!activeProfileId) return
    let isMounted = true

    const loadProfile = async () => {
      try {
        const profiles = await getStudentProfiles()
        const match = profiles.find((profile) => profile.id === activeProfileId)
        if (!match || !isMounted) return
        setActiveLevel(match.grade_band)
      } catch (err) {
        console.warn('[Calculator] Failed to load profile, defaulting to middle.', err)
      }
    }

    loadProfile()
    return () => {
      isMounted = false
    }
  }, [activeProfileId])

  useEffect(() => {
    setResult(null)
    setError(null)
  }, [activeLevel])

  const levelLabel = useMemo(() => {
    if (activeLevel === 'middle') return 'Middle (6–8)'
    return 'High (9–12)'
  }, [activeLevel])

  const buildExpression = (value: string, level: CalculatorLevel) => {
    let cleaned = value.trim().toLowerCase()
    cleaned = cleaned.replace(/×/g, '*').replace(/÷/g, '/')

    const tokens = cleaned.match(/[a-z]+/g) || []
    const allowedTokens = level === 'high'
      ? ['sin', 'cos', 'tan', 'log', 'ln', 'sqrt', 'pi', 'e']
      : ['sqrt', 'pi', 'e']

    if (tokens.some((token) => !allowedTokens.includes(token))) {
      return null
    }

    cleaned = cleaned.replace(/\^/g, '**')
    cleaned = cleaned.replace(/\bsqrt\s*\(/g, 'Math.sqrt(')
    cleaned = cleaned.replace(/\bsin\s*\(/g, 'Math.sin(')
    cleaned = cleaned.replace(/\bcos\s*\(/g, 'Math.cos(')
    cleaned = cleaned.replace(/\btan\s*\(/g, 'Math.tan(')
    cleaned = cleaned.replace(/\blog\s*\(/g, 'Math.log10(')
    cleaned = cleaned.replace(/\bln\s*\(/g, 'Math.log(')
    cleaned = cleaned.replace(/\bpi\b/g, 'Math.PI')
    cleaned = cleaned.replace(/\be\b/g, 'Math.E')

    if (!/^[0-9+\-*/().\sMathPIElogtansincosqrt]+$/.test(cleaned)) {
      return null
    }

    return cleaned
  }

  const handleCompute = () => {
    setError(null)
    setResult(null)
    if (!expression.trim()) return

    const computed = buildExpression(expression, activeLevel)
    if (!computed) {
      setError('Use only the allowed symbols for this level.')
      return
    }

    try {
      const value = Function(`"use strict"; return (${computed});`)()
      if (Number.isFinite(value)) {
        setResult(String(Math.round(value * 100000) / 100000))
      } else {
        setError('That expression did not evaluate to a number.')
      }
    } catch (err) {
      setError('Check the expression format and try again.')
    }
  }

  if (!isOpen) return null

  return (
    <ToolPanel
      isOpen={isOpen}
      onClose={onClose}
      title={`Calculator — ${levelLabel}`}
      icon={<Calculator className="w-5 h-5 text-emerald-600" />}
      contentClassName="p-0"
      panelWidthClassName="w-[420px]"
    >
      <div className="border-b border-slate-200 px-5 py-3">
        <p className="text-xs text-slate-600">For learning and practice</p>
      </div>

      <div className="px-3 pt-3 border-b border-slate-200">
        <div className="flex gap-1 overflow-x-auto">
          {([
            { id: 'elementary', label: 'Elementary' },
            { id: 'middle', label: 'Middle' },
            { id: 'high', label: 'High' },
          ] as Array<{ id: CalculatorLevel; label: string }>).map((level) => (
            <button
              key={level.id}
              onClick={() => setActiveLevel(level.id)}
              className={`
                px-3 py-2 text-xs font-medium rounded-t-lg whitespace-nowrap transition-colors
                ${activeLevel === level.id
                  ? 'bg-emerald-50 text-emerald-700 border-b-2 border-emerald-600'
                  : 'text-slate-600 hover:bg-slate-50'
                }
              `}
            >
              {level.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-slate-600">Expression</label>
          <Input
            value={expression}
            onChange={(e) => setExpression(e.target.value)}
            placeholder={activeLevel === 'middle'
              ? 'Example: (5^2) + sqrt(81)'
              : 'Example: sin(0.5) + log(100)'}
          />
          <div className="text-[11px] text-slate-500">
            {activeLevel === 'middle' && 'Allowed: + − × ÷ ( ) ^ sqrt()'}
            {activeLevel === 'high' && 'Allowed: + − × ÷ ( ) ^ sqrt() sin() cos() tan() log() ln() pi e'}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            className="bg-emerald-600 text-white hover:bg-emerald-700"
            onClick={handleCompute}
          >
            Calculate
          </Button>
          {error && <span className="text-xs text-rose-600">{error}</span>}
        </div>

        <div className="bg-emerald-50 rounded-lg p-3 space-y-1">
          <p className="text-xs text-slate-600">Result:</p>
          <p className="text-lg font-semibold text-emerald-700">
            {result ?? '—'}
          </p>
        </div>
      </div>
    </ToolPanel>
  )
}
