'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, BookOpen, Bookmark, BookmarkCheck } from 'lucide-react'
import { VOCABULARY_TERMS } from '@/lib/medicalTerms'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { createBrowserClient } from '@supabase/ssr'

export default function DictionaryPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [savedFilter, setSavedFilter] = useState<'all' | 'saved' | 'not-saved'>('all')
  const [savedWords, setSavedWords] = useState<Set<string>>(() => new Set<string>())
  const [savedWordIds, setSavedWordIds] = useState<Map<string, string>>(() => new Map<string, string>())
  const [gradeBand, setGradeBand] = useState<'middle' | 'high' | null>(null)
  const { activeProfileId } = useActiveProfile()

  useEffect(() => {
    const loadGradeBand = async () => {
      if (!activeProfileId) {
        setGradeBand(null)
        return
      }
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setGradeBand(null)
          return
        }
        const { data: profile } = await supabase
          .from('student_profiles')
          .select('grade_band')
          .eq('id', activeProfileId)
          .eq('owner_id', user.id)
          .single()
          setGradeBand(profile?.grade_band === 'elementary' ? 'middle' : profile?.grade_band || null)
      } catch (error) {
        console.error('[Vocabulary Bank] Error loading grade band:', error)
        setGradeBand(null)
      }
    }

    loadGradeBand()
  }, [activeProfileId])

  const gradeFilteredTerms = useMemo(() => {
    if (!gradeBand) return VOCABULARY_TERMS
    return VOCABULARY_TERMS.filter(term => {
      if (!term.gradeBands || term.gradeBands.length === 0) return true
      return term.gradeBands.includes(gradeBand)
    })
  }, [gradeBand])

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set(gradeFilteredTerms.map(t => t.category).filter(Boolean))
    return Array.from(cats).sort()
  }, [gradeFilteredTerms])

  // Filter terms based on search, category, and saved status
  const filteredTerms = useMemo(() => {
    let filtered = gradeFilteredTerms

    // Filter by category
    if (selectedCategory) {
      filtered = filtered.filter(t => t.category === selectedCategory)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t => 
        t.term.toLowerCase().includes(query) ||
        t.definition.toLowerCase().includes(query)
      )
    }

    // Filter by saved status
    if (savedFilter === 'saved') {
      filtered = filtered.filter(t => savedWords.has(t.term.toLowerCase()))
    } else if (savedFilter === 'not-saved') {
      filtered = filtered.filter(t => !savedWords.has(t.term.toLowerCase()))
    }

    return filtered.sort((a, b) => a.term.localeCompare(b.term))
  }, [searchQuery, selectedCategory, savedFilter, savedWords, gradeFilteredTerms])

  // Load saved words on mount
  useEffect(() => {
    fetch('/api/wordbank')
      .then(res => res.json())
      .then(data => {
        if (data.words && Array.isArray(data.words)) {
          const saved = new Set<string>()
          const wordIds = new Map<string, string>()
          
          data.words.forEach((w: any) => {
            if (w?.term?.toLowerCase() && w?.id) {
              const termLower = w.term.toLowerCase()
              saved.add(termLower)
              wordIds.set(termLower, w.id)
            }
          })
          
          setSavedWords(saved)
          setSavedWordIds(wordIds)
        }
      })
      .catch(() => {}) // Silently fail if not authenticated
  }, [])

  const handleSaveWord = async (term: string, definition: string, category?: string) => {
    try {
      const response = await fetch('/api/wordbank', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ term, definition, category }),
      })

      if (response.ok) {
        const data = await response.json()
        const termLower = term.toLowerCase()
        setSavedWords(prev => {
          const arr = Array.from(prev)
          arr.push(termLower)
          return new Set<string>(arr)
        })
        if (data.word?.id) {
          setSavedWordIds(prev => {
            const newMap = new Map(prev)
            newMap.set(termLower, data.word.id)
            return newMap
          })
        }
      } else if (response.status === 409) {
        // Already saved, just update local state
        const termLower = term.toLowerCase()
        setSavedWords(prev => {
          const arr = Array.from(prev)
          if (!arr.includes(termLower)) {
            arr.push(termLower)
          }
          return new Set<string>(arr)
        })
      }
    } catch (error) {
      console.error('Failed to save word:', error)
    }
  }

  const handleUnsaveWord = async (term: string) => {
    try {
      const termLower = term.toLowerCase()
      const wordId = savedWordIds.get(termLower)
      
      if (!wordId) {
        console.error('Word ID not found for term:', term)
        return
      }

      const response = await fetch(`/api/wordbank?id=${wordId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        setSavedWords(prev => {
          const arr = Array.from(prev)
          const index = arr.indexOf(termLower)
          if (index > -1) {
            arr.splice(index, 1)
          }
          return new Set<string>(arr)
        })
        setSavedWordIds(prev => {
          const newMap = new Map(prev)
          newMap.delete(termLower)
          return newMap
        })
      }
    } catch (error) {
      console.error('Failed to unsave word:', error)
    }
  }

  return (
    <div className="h-full overflow-y-auto bg-gradient-to-br from-slate-50 via-emerald-50/20 to-slate-50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8 pt-safe-t">
        {/* Header - Enhanced with better spacing and visual weight */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-2.5 sm:gap-3 mb-2 sm:mb-3">
            <div className="p-2 sm:p-2.5 bg-gradient-to-br from-emerald-500 to-green-600 rounded-xl shadow-lg shadow-emerald-500/20 flex-shrink-0">
              <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-slate-900 via-emerald-900 to-slate-900 bg-clip-text text-transparent">
              Vocabulary Bank
            </h1>
          </div>
          <p className="text-sm sm:text-base text-slate-600 ml-11 sm:ml-14 max-w-2xl leading-relaxed">
            Save key terms from your classes, review definitions quickly, and build a personal study glossary.
          </p>
        </div>

        {/* Search and Filters - Enhanced card with better visual hierarchy */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-lg shadow-slate-200/50 p-4 sm:p-6 mb-6 sm:mb-8">
          {/* Search Bar - More prominent */}
          <div className="relative mb-4 sm:mb-5">
            <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search terms or definitions..."
              className="w-full pl-10 sm:pl-12 pr-3 sm:pr-4 py-2.5 sm:py-3.5 border-2 border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-400 bg-slate-50/50 text-slate-900 placeholder:text-slate-400 transition-all duration-200 hover:border-slate-300 text-sm sm:text-base"
            />
          </div>

          {/* Saved/Not Saved Filter - Better visual distinction */}
          <div className="mb-4 sm:mb-5">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 sm:mb-3">Filter by Status</p>
            <div className="flex flex-wrap gap-2 sm:gap-2.5">
              <button
                onClick={() => setSavedFilter('all')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  savedFilter === 'all'
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md shadow-emerald-500/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                All Terms
              </button>
              <button
                onClick={() => setSavedFilter('saved')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  savedFilter === 'saved'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-500/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span className="flex items-center gap-1 sm:gap-1.5">
                  <BookmarkCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                  Saved
                </span>
              </button>
              <button
                onClick={() => setSavedFilter('not-saved')}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  savedFilter === 'not-saved'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                Not Saved
              </button>
            </div>
          </div>

          {/* Category Filters - Enhanced with better spacing and visual design */}
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 sm:mb-3 mt-4 sm:mt-5">Categories</p>
            <div className="flex flex-wrap gap-2 sm:gap-2.5">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                  !selectedCategory
                    ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md shadow-emerald-500/30'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                All Categories
              </button>
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category || null)}
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 transform hover:scale-105 active:scale-95 ${
                    selectedCategory === category
                      ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md shadow-emerald-500/30'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Results - Enhanced card design */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-lg shadow-slate-200/50 overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-emerald-50/30 border-b border-slate-200/60">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-700">
                <span className="text-emerald-600 font-bold">{filteredTerms.length}</span> {filteredTerms.length === 1 ? 'term' : 'terms'} found
              </p>
              {savedFilter === 'saved' && savedWords.size > 0 && (
                <span className="text-xs text-emerald-600 font-medium flex items-center gap-1.5">
                  <BookmarkCheck className="w-3.5 h-3.5" />
                  {savedWords.size} saved
                </span>
              )}
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {filteredTerms.length > 0 ? (
              filteredTerms.map((term, index) => {
                const isSaved = savedWords.has(term.term.toLowerCase())
                return (
                  <div 
                    key={term.term} 
                  className="group p-6 hover:bg-gradient-to-r hover:from-emerald-50/50 hover:to-green-50/30 transition-all duration-300 hover:shadow-sm"
                    style={{ animationDelay: `${index * 20}ms` }}
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <h3 className="text-xl font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {term.term}
                          </h3>
                          {term.category && (
                          <span className="text-xs px-3 py-1 bg-gradient-to-r from-emerald-100 to-green-100 text-emerald-700 rounded-full font-semibold border border-emerald-200/50 shadow-sm">
                              {term.category}
                            </span>
                          )}
                        </div>
                        <p className="text-sm md:text-base text-slate-700 leading-relaxed max-w-3xl">
                          {term.definition}
                        </p>
                      </div>
                      <button
                        onClick={() => isSaved 
                          ? handleUnsaveWord(term.term)
                          : handleSaveWord(term.term, term.definition, term.category)
                        }
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 shrink-0 shadow-sm ${
                          isSaved
                            ? 'text-emerald-700 bg-gradient-to-r from-emerald-50 to-teal-50 hover:from-emerald-100 hover:to-teal-100 border border-emerald-200/50 hover:shadow-md hover:shadow-emerald-200/50'
                            : 'text-emerald-700 bg-gradient-to-r from-emerald-50 to-green-50 hover:from-emerald-100 hover:to-green-100 border border-emerald-200/50 hover:shadow-md hover:shadow-emerald-200/50'
                        }`}
                      >
                        {isSaved ? (
                          <>
                            <BookmarkCheck className="w-4 h-4" />
                            <span>Saved</span>
                          </>
                        ) : (
                          <>
                            <Bookmark className="w-4 h-4" />
                            <span>Save</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="p-16 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 mb-4">
                  <BookOpen className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-lg font-semibold text-slate-700 mb-2">No terms found</p>
                <p className="text-sm text-slate-500 max-w-md mx-auto">
                  Try adjusting your search query or selecting a different category filter
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

