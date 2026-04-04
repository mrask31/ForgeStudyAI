'use client'

import { useState } from 'react'
import { Loader2, CheckCircle, XCircle, ArrowRight, Brain } from 'lucide-react'

interface MasteryCheckProps {
  sessionId: string
  classId: string
  profileId: string
  className?: string
  onComplete: () => void
  onSkip: () => void
}

type Phase = 'intro' | 'loading-questions' | 'answering' | 'evaluating' | 'results'

interface Evaluation {
  questionIndex: number
  correct: boolean
  feedback: string
  score_delta: number
}

export function MasteryCheck({
  sessionId, classId, profileId, className, onComplete, onSkip,
}: MasteryCheckProps) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [questions, setQuestions] = useState<string[]>([])
  const [answers, setAnswers] = useState<string[]>(['', '', ''])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [evaluations, setEvaluations] = useState<Evaluation[]>([])
  const [previousScore, setPreviousScore] = useState(0)
  const [newScore, setNewScore] = useState(0)
  const [totalDelta, setTotalDelta] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const startCheck = async () => {
    setPhase('loading-questions')
    setError(null)
    try {
      const res = await fetch('/api/mastery/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ sessionId, classId, profileId }),
      })
      if (!res.ok) throw new Error('Failed to generate questions')
      const data = await res.json()
      setQuestions(data.questions)
      setAnswers(new Array(data.questions.length).fill(''))
      setPhase('answering')
    } catch (err: any) {
      setError(err.message)
      setPhase('intro')
    }
  }

  const submitAnswers = async () => {
    setPhase('evaluating')
    setError(null)
    try {
      const res = await fetch('/api/mastery/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          sessionId, classId, profileId,
          answers: questions.map((q, i) => ({ question: q, answer: answers[i] })),
        }),
      })
      if (!res.ok) throw new Error('Failed to evaluate answers')
      const data = await res.json()
      setEvaluations(data.evaluations || [])
      setPreviousScore(data.previousScore)
      setNewScore(data.newScore)
      setTotalDelta(data.totalDelta)
      setPhase('results')
    } catch (err: any) {
      setError(err.message)
      setPhase('answering')
    }
  }

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      submitAnswers()
    }
  }

  return (
    <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 max-w-lg mx-auto shadow-2xl">
      {phase === 'intro' && (
        <div className="text-center space-y-4">
          <div className="w-14 h-14 mx-auto bg-indigo-600/20 rounded-2xl flex items-center justify-center">
            <Brain className="w-7 h-7 text-indigo-400" />
          </div>
          <h3 className="text-lg font-bold text-white">Quick Check</h3>
          <p className="text-sm text-slate-400">3 quick questions to see what stuck from this session.</p>
          <div className="flex gap-3">
            <button onClick={onSkip} className="flex-1 px-4 py-2.5 border border-slate-700 text-slate-400 rounded-xl text-sm font-medium hover:bg-slate-800 transition-colors">Skip</button>
            <button onClick={startCheck} className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors">Let's go</button>
          </div>
        </div>
      )}

      {(phase === 'loading-questions' || phase === 'evaluating') && (
        <div className="flex flex-col items-center gap-3 py-8">
          <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
          <p className="text-sm text-slate-400">{phase === 'loading-questions' ? 'Generating questions...' : 'Evaluating your answers...'}</p>
        </div>
      )}

      {phase === 'answering' && questions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-400">Question {currentQuestion + 1} of {questions.length}</h3>
            <div className="flex gap-1">
              {questions.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i === currentQuestion ? 'bg-indigo-400' : i < currentQuestion ? 'bg-indigo-600' : 'bg-slate-700'}`} />
              ))}
            </div>
          </div>
          <p className="text-white font-medium">{questions[currentQuestion]}</p>
          <textarea
            value={answers[currentQuestion]}
            onChange={(e) => { const a = [...answers]; a[currentQuestion] = e.target.value; setAnswers(a) }}
            placeholder="Type your answer..."
            className="w-full h-24 px-4 py-3 bg-slate-800/60 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <button onClick={handleNext} disabled={!answers[currentQuestion].trim()} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40">
            {currentQuestion < questions.length - 1 ? 'Next' : 'Submit'} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {phase === 'results' && (
        <div className="space-y-5">
          <div className="text-center">
            <h3 className="text-lg font-bold text-white mb-1">{className || 'Subject'} Mastery</h3>
            <p className="text-3xl font-bold text-indigo-400">
              {previousScore} → {newScore}
              <span className={`ml-2 text-lg ${totalDelta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {totalDelta >= 0 ? '+' : ''}{totalDelta}
              </span>
            </p>
          </div>
          <div className="space-y-3">
            {evaluations.map((ev, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-slate-800/40 rounded-xl">
                {ev.correct ? <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />}
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Q{i + 1}</p>
                  <p className="text-sm text-slate-300">{ev.feedback}</p>
                  <p className={`text-xs mt-1 font-medium ${ev.score_delta >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {ev.score_delta >= 0 ? '+' : ''}{ev.score_delta} points
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onComplete} className="w-full px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors">Done</button>
        </div>
      )}

      {error && <p className="text-sm text-red-400 text-center mt-3">{error}</p>}
    </div>
  )
}
