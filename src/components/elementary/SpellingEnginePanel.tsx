'use client'

import { useEffect, useMemo, useState } from 'react'

interface SpellingEnginePanelProps {
  profileId: string
  onStartSession: (prompt: string) => void
}

type SpellingWord = { id: string; word: string; pattern?: string | null; is_mastered?: boolean }
type SpellingList = { id: string; title: string; spelling_words: SpellingWord[] }

const PATTERNS = [
  { label: '-ight words', test: (word: string) => word.endsWith('ight') },
  { label: 'ee / ea words', test: (word: string) => /ee|ea/.test(word) },
  { label: 'silent-e words', test: (word: string) => /[aeiou][bcdfghjklmnpqrstvwxyz]e$/.test(word) },
  { label: 'tricky pairs', test: (word: string) => /(their|there|they|to|too|two)/.test(word) },
]

function groupWords(words: SpellingWord[]) {
  const groups: Record<string, SpellingWord[]> = {}
  words.forEach((word) => {
    const lower = word.word.toLowerCase()
    const pattern = PATTERNS.find((p) => p.test(lower))?.label || 'Other words'
    if (!groups[pattern]) {
      groups[pattern] = []
    }
    groups[pattern].push(word)
  })
  return groups
}

export default function SpellingEnginePanel({ profileId, onStartSession }: SpellingEnginePanelProps) {
  const [listInput, setListInput] = useState('')
  const [lists, setLists] = useState<SpellingList[]>([])
  const [isSaving, setIsSaving] = useState(false)
  const [isTestOpen, setIsTestOpen] = useState(false)
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({})
  const [revealedWords, setRevealedWords] = useState<Record<string, boolean>>({})
  const [speechSupported, setSpeechSupported] = useState(true)
  const [preferredVoice, setPreferredVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [speakingWords, setSpeakingWords] = useState<Record<string, boolean>>({})

  const activeList = lists[0]
  const wordGroups = useMemo(() => groupWords(activeList?.spelling_words || []), [activeList])

  useEffect(() => {
    const loadLists = async () => {
      const response = await fetch(`/api/elementary/spelling/lists?profileId=${profileId}`)
      if (!response.ok) return
      const payload = await response.json()
      setLists(payload?.lists || [])
    }
    loadLists()
  }, [profileId])

  const handleSaveList = async () => {
    if (!listInput.trim()) return
    setIsSaving(true)
    const words = listInput
      .split(/[\n,]+/)
      .map((word) => word.trim())
      .filter(Boolean)
    const response = await fetch('/api/elementary/spelling/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, words }),
    })
    setIsSaving(false)
    if (!response.ok) return
    setListInput('')
    const refreshed = await fetch(`/api/elementary/spelling/lists?profileId=${profileId}`)
    const payload = await refreshed.json()
    setLists(payload?.lists || [])
  }

  const handleStartWarmup = () => {
    const words = (activeList?.spelling_words || []).slice(0, 5).map((w) => w.word)
    if (words.length === 0) return
    onStartSession(`Let’s practice these words: ${words.join(', ')}. Then do a quick check.`)
  }

  const handleMissedOnly = async () => {
    const response = await fetch(`/api/elementary/spelling/missed?profileId=${profileId}&listId=${activeList?.id || ''}`)
    const payload = await response.json()
    const words = payload?.words || []
    if (words.length === 0) {
      onStartSession('I am ready for a quick spelling check with 5 new words.')
      return
    }
    onStartSession(`Practice only these missed words: ${words.join(', ')}. Then quiz me.`)
  }

  const handleSpeedRound = () => {
    const words = (activeList?.spelling_words || []).slice(0, 8).map((w) => w.word)
    if (words.length === 0) return
    onStartSession(`Speed round: quiz me on these words quickly: ${words.join(', ')}.`)
  }

  const handleFridayTest = () => {
    if (!activeList || activeList.spelling_words.length === 0) return
    setIsTestOpen(true)
  }

  const handleSubmitTest = async () => {
    if (!activeList) return
    const results = activeList.spelling_words.map((word) => {
      const answer = (testAnswers[word.id] || '').trim().toLowerCase()
      const correct = answer === word.word.toLowerCase()
      return { wordId: word.id, correct }
    })
    await fetch(`/api/elementary/spelling/lists/${activeList.id}/results`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profileId, results }),
    })
    setIsTestOpen(false)
    setTestAnswers({})
    setRevealedWords({})
  }

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('speechSynthesis' in window)) {
      setSpeechSupported(false)
      return
    }
    setSpeechSupported(true)

    const pickVoice = () => {
      const voices = window.speechSynthesis.getVoices()
      if (!voices.length) return
      const preferred = voices.find((voice) => /en-US/i.test(voice.lang) && /female|woman|zira|aria|samantha|jenny/i.test(voice.name))
        || voices.find((voice) => /en-US/i.test(voice.lang))
        || voices.find((voice) => /en/i.test(voice.lang))
        || voices[0]
      setPreferredVoice(preferred || null)
    }

    pickVoice()
    window.speechSynthesis.addEventListener('voiceschanged', pickVoice)
    return () => {
      window.speechSynthesis.removeEventListener('voiceschanged', pickVoice)
    }
  }, [])

  const speakWord = (wordId: string, word: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeechSupported(false)
      return
    }
    setSpeakingWords((prev) => ({ ...prev, [wordId]: true }))
    const utterance = new SpeechSynthesisUtterance(word)
    if (preferredVoice) {
      utterance.voice = preferredVoice
    }
    utterance.rate = 0.9
    utterance.pitch = 1.05
    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
    window.setTimeout(() => {
      setSpeakingWords((prev) => ({ ...prev, [wordId]: false }))
    }, 1500)
  }

  return (
    <div className="space-y-4">
      {activeList && (
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">Continue list</p>
              <p className="text-sm font-semibold text-slate-900">{activeList.title}</p>
              <p className="text-xs text-slate-500">{activeList.spelling_words.length} words</p>
            </div>
            <button
              type="button"
              onClick={handleStartWarmup}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              Continue
            </button>
          </div>
        </div>
      )}
      <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">Enter your list</h3>
        <p className="text-sm text-slate-600 mb-4">Paste words (one per line) or separate with commas.</p>
        <textarea
          value={listInput}
          onChange={(event) => setListInput(event.target.value)}
          placeholder="soccer, hockey, galaxy..."
          className="w-full min-h-[96px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={handleSaveList}
          disabled={isSaving}
          className="mt-3 px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
        >
          {isSaving ? 'Saving...' : 'Start practice'}
        </button>
      </div>

      <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">Word groups (the map)</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          {Object.keys(wordGroups).length === 0 ? (
            <p className="text-sm text-slate-500">Add a list to see patterns.</p>
          ) : (
            Object.entries(wordGroups).map(([group, words]) => (
              <div key={group} className="border border-slate-200 rounded-lg p-3">
                <p className="text-xs font-semibold text-slate-600 mb-2">{group}</p>
                <p className="text-sm text-slate-800">{words.map((w) => w.word).join(', ')}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
        <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3">Practice modes</h3>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleStartWarmup}
            className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          >
            5-word warmup
          </button>
          <button
            type="button"
            onClick={handleMissedOnly}
            className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          >
            Missed words only
          </button>
          <button
            type="button"
            onClick={handleFridayTest}
            className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          >
            Friday test mode
          </button>
          <button
            type="button"
            onClick={handleSpeedRound}
            className="px-3 py-2 rounded-lg text-xs sm:text-sm font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
          >
            Speed round (30s)
          </button>
        </div>
      </div>

      {isTestOpen && activeList && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-slate-900 mb-4">Friday Test Mode</h3>
            <p className="text-sm text-slate-600 mb-4">
              Listen or ask a parent to read each word. Type the spelling without looking.
            </p>
            {!speechSupported && (
              <p className="text-xs text-amber-600 mb-3">
                Text-to-speech isn’t supported in this browser. Use “Show word” or ask a parent to read it aloud.
              </p>
            )}
            <div className="space-y-3 max-h-[50vh] overflow-y-auto">
              {activeList.spelling_words.map((word, index) => (
                <div key={word.id} className="flex items-center gap-3">
                  <div className="w-24 text-sm font-medium text-slate-700 flex flex-col gap-1">
                    <span>Word {index + 1}</span>
                    {revealedWords[word.id] ? (
                      <span className="text-xs text-slate-500">{word.word}</span>
                    ) : (
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => speakWord(word.id, word.word)}
                          disabled={!!speakingWords[word.id]}
                          className="text-xs text-emerald-600 hover:underline disabled:text-slate-400"
                        >
                          {speakingWords[word.id] ? 'Say word...' : 'Say word'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setRevealedWords((prev) => ({ ...prev, [word.id]: true }))}
                          className="text-[10px] text-slate-400 hover:text-slate-500"
                        >
                          Show word
                        </button>
                      </div>
                    )}
                  </div>
                  <input
                    value={testAnswers[word.id] || ''}
                    onChange={(event) => setTestAnswers((prev) => ({ ...prev, [word.id]: event.target.value }))}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Type spelling"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsTestOpen(false)}
                className="px-4 py-2 rounded-lg text-sm border border-slate-200 text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmitTest}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white"
              >
                Grade test
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
