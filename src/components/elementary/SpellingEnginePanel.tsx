'use client'

import { useEffect, useMemo, useState } from 'react'

interface SpellingEnginePanelProps {
  profileId: string
  onStartSession: (prompt: string) => void
  onListStatusChange?: (info: { hasList: boolean; listId?: string; listTitle?: string; listCount?: number }) => void
  onAfterSave?: (list?: SpellingList) => void
  autoStartOnSave?: boolean
  autoStartCount?: number
  showListLibrary?: boolean
  listLibraryTitle?: string
  showContinueCard?: boolean
  showEnterList?: boolean
  showUseLastListButton?: boolean
  showWordGroups?: boolean
  showPracticeModes?: boolean
  startButtonLabel?: string
  practiceModesTitle?: string
  practiceModesDescription?: string
  wordGroupsLabel?: string
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

export default function SpellingEnginePanel({
  profileId,
  onStartSession,
  onListStatusChange,
  onAfterSave,
  autoStartOnSave = false,
  autoStartCount = 5,
  showListLibrary = false,
  listLibraryTitle = 'Your word lists',
  showContinueCard = true,
  showEnterList = true,
  showUseLastListButton = false,
  showWordGroups = true,
  showPracticeModes = true,
  startButtonLabel = 'Start practice',
  practiceModesTitle = 'Practice modes',
  practiceModesDescription,
  wordGroupsLabel = 'Word groups (the map)',
}: SpellingEnginePanelProps) {
  const [listInput, setListInput] = useState('')
  const [lists, setLists] = useState<SpellingList[]>([])
  const [selectedListId, setSelectedListId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isTestOpen, setIsTestOpen] = useState(false)
  const [testAnswers, setTestAnswers] = useState<Record<string, string>>({})
  const [revealedWords, setRevealedWords] = useState<Record<string, boolean>>({})
  const [speechSupported, setSpeechSupported] = useState(true)
  const [preferredVoice, setPreferredVoice] = useState<SpeechSynthesisVoice | null>(null)
  const [speakingWords, setSpeakingWords] = useState<Record<string, boolean>>({})
  const [gradedResults, setGradedResults] = useState<Record<string, boolean> | null>(null)

  const activeList = selectedListId
    ? lists.find((list) => list.id === selectedListId) || lists[0]
    : lists[0]
  const wordGroups = useMemo(() => groupWords(activeList?.spelling_words || []), [activeList])

  useEffect(() => {
    if (!onListStatusChange) return
    if (!activeList) {
      onListStatusChange({ hasList: false })
      return
    }
    onListStatusChange({
      hasList: true,
      listId: activeList.id,
      listTitle: activeList.title,
      listCount: activeList.spelling_words.length,
    })
  }, [activeList, onListStatusChange])

  useEffect(() => {
    const loadLists = async () => {
      const response = await fetch(`/api/elementary/spelling/lists?profileId=${profileId}`)
      if (!response.ok) return
      const payload = await response.json()
      const nextLists = payload?.lists || []
      setLists(nextLists)
      if (nextLists.length > 0) {
        setSelectedListId((current) => {
          if (!current) return nextLists[0].id
          const exists = nextLists.some((list: SpellingList) => list.id === current)
          return exists ? current : nextLists[0].id
        })
      }
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
    const nextLists = payload?.lists || []
    setLists(nextLists)
    const nextActive = nextLists?.[0]
    if (nextActive?.id) {
      setSelectedListId(nextActive.id)
    }
    if (autoStartOnSave && nextActive?.spelling_words?.length) {
      const startWords = nextActive.spelling_words.slice(0, autoStartCount).map((w: SpellingWord) => w.word)
      if (startWords.length > 0) {
        onStartSession(`Let’s practice these words: ${startWords.join(', ')}. Then do a quick check.`)
      }
    }
    if (onAfterSave) {
      onAfterSave(nextActive)
    }
  }

  const handleStartWarmup = (list: SpellingList | undefined = activeList) => {
    const words = (list?.spelling_words || []).slice(0, 5).map((w) => w.word)
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
    setGradedResults(null)
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
    const resultMap = results.reduce<Record<string, boolean>>((acc, result) => {
      acc[result.wordId] = result.correct
      return acc
    }, {})
    setGradedResults(resultMap)
  }

  const handleCloseTest = () => {
    setIsTestOpen(false)
    setTestAnswers({})
    setRevealedWords({})
    setGradedResults(null)
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
      {showListLibrary && (
        <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">{listLibraryTitle}</h3>
            <span className="text-xs text-slate-500">{lists.length} lists</span>
          </div>
          {lists.length === 0 ? (
            <p className="text-sm text-slate-500">No lists yet. Create one below.</p>
          ) : (
            <div className="grid gap-2">
              {lists.map((list) => {
                const isActive = list.id === activeList?.id
                return (
                  <div
                    key={list.id}
                    className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 ${
                      isActive ? 'border-emerald-300 bg-emerald-50/40' : 'border-slate-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedListId(list.id)}
                      className="text-left flex-1"
                    >
                      <p className="text-sm font-semibold text-slate-900">{list.title}</p>
                      <p className="text-xs text-slate-500">{list.spelling_words.length} words</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedListId(list.id)
                        handleStartWarmup(list)
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      Study
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
      {showContinueCard && activeList && (
        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase text-slate-500 font-semibold">Continue list</p>
              <p className="text-sm font-semibold text-slate-900">{activeList.title}</p>
              <p className="text-xs text-slate-500">{activeList.spelling_words.length} words</p>
            </div>
            <button
              type="button"
              onClick={() => handleStartWarmup()}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
            >
              Continue
            </button>
          </div>
        </div>
      )}
      {showEnterList && (
        <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">Enter your list</h3>
          <p className="text-sm text-slate-600 mb-4">Paste words (one per line) or separate with commas.</p>
          <textarea
            value={listInput}
            onChange={(event) => setListInput(event.target.value)}
            placeholder="soccer, hockey, galaxy..."
            className="w-full min-h-[96px] rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSaveList}
              disabled={isSaving}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : startButtonLabel}
            </button>
            {showUseLastListButton && activeList && (
              <button
                type="button"
                onClick={handleStartWarmup}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-emerald-200 text-emerald-700 hover:bg-emerald-50"
              >
                Use last list
              </button>
            )}
          </div>
        </div>
      )}

      {showWordGroups && (
        <details className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
          <summary className="text-base sm:text-lg font-semibold text-slate-900 cursor-pointer list-none">
            {wordGroupsLabel}
          </summary>
          <div className="grid gap-3 sm:grid-cols-2 mt-4">
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
        </details>
      )}

      {showPracticeModes && (
        <div className="p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-2">{practiceModesTitle}</h3>
          {practiceModesDescription && (
            <p className="text-sm text-slate-600 mb-3">{practiceModesDescription}</p>
          )}
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
      )}

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
            {gradedResults && (
              <div className="mb-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                You got {Object.values(gradedResults).filter(Boolean).length} of {activeList.spelling_words.length} correct.
              </div>
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
                    className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                      gradedResults
                        ? gradedResults[word.id]
                          ? 'border-emerald-200 bg-emerald-50'
                          : 'border-rose-200 bg-rose-50'
                        : 'border-slate-200'
                    }`}
                    placeholder="Type spelling"
                  />
                </div>
              ))}
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={handleCloseTest}
                className="px-4 py-2 rounded-lg text-sm border border-slate-200 text-slate-600"
              >
                Done
              </button>
              {!gradedResults && (
                <button
                  type="button"
                  onClick={handleSubmitTest}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-emerald-600 text-white"
                >
                  Grade test
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
