'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, Loader2, Mail, Lock, Eye, EyeOff, Share2 } from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { toast } from 'sonner'

type ParentStep = 'account' | 'child-info' | 'classes' | 'done'
type StudentStep = 'grade-gate' | 'account' | 'classes'

interface FlowSignupProps {
  flow: 'parent' | 'student'
}

export default function FlowSignup({ flow }: FlowSignupProps) {
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowser(), [])

  // Shared state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Parent flow state
  const [parentStep, setParentStep] = useState<ParentStep>('account')
  const [childName, setChildName] = useState('')
  const [childGrade, setChildGrade] = useState('')

  // Student flow state
  const [studentStep, setStudentStep] = useState<StudentStep>('grade-gate')
  const [studentName, setStudentName] = useState('')
  const [studentGrade, setStudentGrade] = useState('')
  const [showMiddleSchoolMessage, setShowMiddleSchoolMessage] = useState(false)

  // Class entry state (shared)
  const [classes, setClasses] = useState<string[]>([])
  const [classInput, setClassInput] = useState('')
  const [classPromptIndex, setClassPromptIndex] = useState(0)

  const displayName = flow === 'parent' ? childName : studentName
  const grade = flow === 'parent' ? childGrade : studentGrade

  const grades6to8 = ['6', '7', '8']
  const grades9to12 = ['9', '10', '11', '12']
  const allGrades = flow === 'parent' ? [...grades6to8, ...grades9to12] : grades9to12

  const handleGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) setError(error.message)
  }

  const handleEmailSignup = async () => {
    if (!email.trim() || !password.trim()) return
    setLoading(true)
    setError(null)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        setError(signUpError.message)
        setLoading(false)
        return
      }

      // If email confirmation required, wait for it
      if (data.user && !data.session) {
        toast.info('Check your email to confirm your account, then come back here.')
        // Poll for session
        const interval = setInterval(async () => {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            clearInterval(interval)
            if (flow === 'parent') {
              setParentStep('child-info')
            } else {
              setStudentStep('classes')
            }
            setLoading(false)
          }
        }, 2000)
        return
      }

      // Auto-confirmed (dev mode or instant)
      if (flow === 'parent') {
        setParentStep('child-info')
      } else {
        setStudentStep('classes')
      }
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const addClass = () => {
    const trimmed = classInput.trim()
    if (trimmed && !classes.includes(trimmed)) {
      setClasses([...classes, trimmed])
      setClassPromptIndex(classPromptIndex + 1)
    }
    setClassInput('')
  }

  const handleClassesDone = async () => {
    // Parse any remaining input
    if (classInput.trim()) {
      addClass()
    }

    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setError('Session expired. Please sign in again.')
        setLoading(false)
        return
      }

      // Create student profile
      const isMinor = grades6to8.includes(grade)
      const gradeBand = grades6to8.includes(grade) ? 'middle' : 'high'

      const { data: profile, error: profileError } = await supabase
        .from('student_profiles')
        .insert({
          owner_id: user.id,
          display_name: displayName.trim(),
          grade_band: gradeBand,
          grade: grade,
          is_minor: isMinor,
        })
        .select()
        .single()

      if (profileError) {
        console.error('[Signup] Profile creation error:', profileError)
        // Profile may already exist — proceed anyway
      }

      const profileId = profile?.id

      // Create classes (fire-and-forget)
      if (profileId && classes.length > 0) {
        for (const className of classes) {
          await supabase.from('student_classes').insert({
            user_id: user.id,
            name: className,
            code: '',
            type: 'other',
          }).catch(() => {})
        }
      }

      // Set active profile
      if (profileId) {
        localStorage.setItem('active_profile_id', profileId)
      }

      if (flow === 'parent') {
        setParentStep('done')
      } else {
        // Student goes straight to app
        router.push('/app')
      }
    } catch (err: any) {
      console.error('[Signup] Error:', err)
      setError('Something went wrong creating your profile.')
    } finally {
      setLoading(false)
    }
  }

  // Share message for middle school students
  const shareParentLink = () => {
    const url = `${window.location.origin}/signup?flow=parent`
    const text = `Hey! I want to use ForgeStudy AI for school. Can you set it up for me? Here's the link: ${url}`
    if (navigator.share) {
      navigator.share({ title: 'ForgeStudy AI', text, url }).catch(() => {})
    } else {
      navigator.clipboard.writeText(text).then(() => toast.success('Link copied!'))
    }
  }

  const classPrompts = [
    `What's ${displayName || 'your'} first class?`,
    `Got it! Does ${displayName || 'the student'} have any other classes?`,
    `Nice! Any other classes?`,
    `Any more?`,
  ]

  // =============================
  // PARENT FLOW
  // =============================
  if (flow === 'parent') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <Link href="/" className="text-indigo-400 text-sm font-medium">← Back to ForgeStudy</Link>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
            {/* Step 1: Account */}
            {parentStep === 'account' && (
              <>
                <h1 className="text-2xl font-bold text-white mb-1">Create your parent account</h1>
                <p className="text-sm text-slate-400 mb-6">You'll manage your child's learning from here.</p>

                {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-3 mb-4">{error}</p>}

                <button onClick={handleGoogleAuth} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-xl transition-colors border border-gray-300 mb-4">
                  <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 mb-4">
                  <div className="flex-1 h-px bg-slate-800" /><span className="text-xs text-slate-500">or</span><div className="flex-1 h-px bg-slate-800" />
                </div>

                <div className="space-y-3">
                  <input type="email" placeholder="Your email" value={email} onChange={e => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                      className="w-full px-4 py-3 pr-12 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <button onClick={handleEmailSignup} disabled={loading || !email.trim() || !password.trim()}
                    className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </div>

                <p className="text-xs text-slate-500 text-center mt-4">
                  Already have an account? <Link href="/login" className="text-indigo-400">Sign in</Link>
                </p>
              </>
            )}

            {/* Step 2: Child Info */}
            {parentStep === 'child-info' && (
              <>
                <h1 className="text-2xl font-bold text-white mb-1">Tell us about your child</h1>
                <p className="text-sm text-slate-400 mb-6">We'll set up their learning space.</p>

                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-2 block">What's your child's first name?</label>
                    <input type="text" placeholder="First name" value={childName} onChange={e => setChildName(e.target.value)} autoFocus
                      className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-300 mb-3 block">What grade are they in?</label>
                    <div className="grid grid-cols-4 gap-2">
                      {allGrades.map(g => (
                        <button key={g} onClick={() => setChildGrade(g)}
                          className={`px-3 py-3 rounded-xl text-sm font-semibold transition-all ${
                            childGrade === g ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}>
                          {g}th
                        </button>
                      ))}
                    </div>
                  </div>
                  <button onClick={() => setParentStep('classes')} disabled={!childName.trim() || !childGrade}
                    className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    Continue <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}

            {/* Step 3: Classes */}
            {parentStep === 'classes' && (
              <>
                <p className="text-lg text-white font-medium mb-4">
                  {classPrompts[Math.min(classPromptIndex, classPrompts.length - 1)]}
                </p>

                {classes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {classes.map(c => (
                      <span key={c} className="px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 rounded-full text-sm text-indigo-300 flex items-center gap-1">
                        {c}
                        <button onClick={() => setClasses(classes.filter(x => x !== c))} className="text-indigo-400/70 hover:text-white ml-1">×</button>
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex gap-2 mb-4">
                  <input type="text" value={classInput} onChange={e => setClassInput(e.target.value)} placeholder="e.g. Biology" autoFocus
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addClass() } }}
                    className="flex-1 px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                  <button onClick={addClass} disabled={!classInput.trim()}
                    className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50">
                    {classes.length === 0 ? 'Add class' : 'Add another'}
                  </button>
                </div>

                <button onClick={handleClassesDone} disabled={loading}
                  className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>All done <ArrowRight className="w-4 h-4" /></>}
                </button>
              </>
            )}

            {/* Step 4: Done */}
            {parentStep === 'done' && (
              <div className="text-center">
                <p className="text-4xl mb-4">🎉</p>
                <h1 className="text-2xl font-bold text-white mb-2">{childName} is all set!</h1>
                <p className="text-sm text-slate-400 mb-6">
                  Share this link with them to get started:<br />
                  <span className="text-indigo-400 font-medium">forgestudyai.com/app</span>
                </p>
                <p className="text-xs text-slate-500 mb-6">You'll get weekly progress updates by email.</p>
                <button onClick={() => router.push('/parent')}
                  className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2">
                  Go to your parent dashboard <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // =============================
  // STUDENT FLOW
  // =============================
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="text-indigo-400 text-sm font-medium">← Back to ForgeStudy</Link>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 sm:p-8">
          {/* Grade Gate */}
          {studentStep === 'grade-gate' && !showMiddleSchoolMessage && (
            <>
              <h1 className="text-2xl font-bold text-white mb-6">What grade are you in?</h1>
              <div className="grid grid-cols-4 gap-3 mb-4">
                {grades9to12.map(g => (
                  <button key={g} onClick={() => { setStudentGrade(g); setStudentStep('account') }}
                    className="px-3 py-4 bg-slate-800 hover:bg-indigo-600 text-white rounded-xl text-lg font-bold transition-colors">
                    {g}th
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-800" /><span className="text-xs text-slate-500">or</span><div className="flex-1 h-px bg-slate-800" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                {grades6to8.map(g => (
                  <button key={g} onClick={() => { setStudentGrade(g); setShowMiddleSchoolMessage(true) }}
                    className="px-3 py-3 bg-slate-800/50 hover:bg-slate-700 text-slate-400 rounded-xl text-sm font-medium transition-colors">
                    {g}th
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Middle School Redirect */}
          {studentStep === 'grade-gate' && showMiddleSchoolMessage && (
            <>
              <h1 className="text-xl font-bold text-white mb-2">You'll need a parent to set up your account</h1>
              <p className="text-sm text-slate-400 mb-6">
                Students in grades 6-8 need a parent or guardian to create their account. Here's what to show them:
              </p>
              <button onClick={shareParentLink}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors">
                <Share2 className="w-4 h-4" />
                Send this to my parent
              </button>
              <button onClick={() => setShowMiddleSchoolMessage(false)}
                className="w-full mt-3 px-4 py-2 text-sm text-slate-400 hover:text-white transition-colors">
                ← Back
              </button>
            </>
          )}

          {/* Step 1: Account */}
          {studentStep === 'account' && (
            <>
              <h1 className="text-2xl font-bold text-white mb-1">Let's get you set up</h1>
              <p className="text-sm text-slate-400 mb-6">Quick — this takes 30 seconds.</p>

              {error && <p className="text-sm text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg p-3 mb-4">{error}</p>}

              <button onClick={handleGoogleAuth} className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-900 font-medium rounded-xl transition-colors border border-gray-300 mb-4">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                Continue with Google
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="flex-1 h-px bg-slate-800" /><span className="text-xs text-slate-500">or</span><div className="flex-1 h-px bg-slate-800" />
              </div>

              <div className="space-y-3">
                <input type="text" placeholder="First name" value={studentName} onChange={e => setStudentName(e.target.value)} autoFocus
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}
                    className="w-full px-4 py-3 pr-12 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button onClick={handleEmailSignup} disabled={loading || !email.trim() || !password.trim() || !studentName.trim()}
                  className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
                </button>
              </div>

              <p className="text-xs text-slate-500 text-center mt-4">
                Already have an account? <Link href="/login" className="text-indigo-400">Sign in</Link>
              </p>
            </>
          )}

          {/* Step 2: Classes */}
          {studentStep === 'classes' && (
            <>
              <p className="text-lg text-white font-medium mb-4">
                {classPrompts[Math.min(classPromptIndex, classPrompts.length - 1)]}
              </p>

              {classes.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {classes.map(c => (
                    <span key={c} className="px-3 py-1.5 bg-indigo-600/20 border border-indigo-500/30 rounded-full text-sm text-indigo-300 flex items-center gap-1">
                      {c}
                      <button onClick={() => setClasses(classes.filter(x => x !== c))} className="text-indigo-400/70 hover:text-white ml-1">×</button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex gap-2 mb-4">
                <input type="text" value={classInput} onChange={e => setClassInput(e.target.value)} placeholder="e.g. AP Biology" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addClass() } }}
                  className="flex-1 px-4 py-3 bg-slate-950 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                <button onClick={addClass} disabled={!classInput.trim()}
                  className="px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50">
                  {classes.length === 0 ? 'Add class' : 'Add'}
                </button>
              </div>

              <button onClick={handleClassesDone} disabled={loading}
                className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Let's go <ArrowRight className="w-4 h-4" /></>}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
