'use client'

import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { useActiveProfileSummary } from '@/hooks/useActiveProfileSummary'
import { useUser } from '@/contexts/UserContext'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BookOpen, Upload, GraduationCap, Share2, Settings, LogOut,
  ChevronRight, Loader2, Copy, Check, Pencil, Trash2, Plus
} from 'lucide-react'
import { getSupabaseBrowser } from '@/lib/supabase/client'
import { clearAuthStorage } from '@/lib/auth-cleanup'
import { getReferralStats } from '@/app/actions/referrals'
import { toast } from 'sonner'

interface StudentClass {
  id: string
  name: string
}

export default function MePage() {
  const { activeProfileId } = useActiveProfile()
  const { user } = useUser()
  const profileSummary = useActiveProfileSummary()
  const router = useRouter()
  const supabase = useMemo(() => getSupabaseBrowser(), [])

  const [classes, setClasses] = useState<StudentClass[]>([])
  const [loading, setLoading] = useState(true)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [referralCount, setReferralCount] = useState(0)
  const [referralCopied, setReferralCopied] = useState(false)
  const [showAddClass, setShowAddClass] = useState(false)
  const [newClassName, setNewClassName] = useState('')

  const studentName = profileSummary.summary?.displayName || 'Student'
  const gradeBand = profileSummary.summary?.gradeBand
  const grade = profileSummary.summary?.grade
  const isHighSchool = gradeBand === 'high'

  useEffect(() => {
    if (!user) { setLoading(false); return }

    async function loadData() {
      setLoading(true)
      try {
        const { data: classData } = await supabase
          .from('student_classes')
          .select('id, name')
          .eq('user_id', user!.id)
          .order('name')
        setClasses(classData || [])
      } catch {}

      getReferralStats().then(stats => {
        setReferralCode(stats.code)
        setReferralCount(stats.referralCount)
      }).catch(() => {})

      setLoading(false)
    }

    loadData()
  }, [user, supabase])

  const handleAddClass = async () => {
    if (!newClassName.trim() || !user) return
    const { data } = await supabase
      .from('student_classes')
      .insert({ user_id: user.id, name: newClassName.trim(), code: '', type: 'other' })
      .select()
      .single()
    if (data) setClasses(prev => [...prev, { id: data.id, name: data.name }])
    setNewClassName('')
    setShowAddClass(false)
  }

  const handleDeleteClass = async (classId: string) => {
    await supabase.from('student_classes').delete().eq('id', classId)
    setClasses(prev => prev.filter(c => c.id !== classId))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    clearAuthStorage()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-[#08080F]">
        <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-[#08080F] pb-20 lg:pb-4">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Profile Header */}
        <div className="text-center">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-bold text-white">{studentName.charAt(0).toUpperCase()}</span>
          </div>
          <h1 className="text-xl font-bold text-white">{studentName}</h1>
          <p className="text-sm text-slate-400">
            {grade ? `Grade ${grade}` : isHighSchool ? 'High School' : gradeBand === 'middle' ? 'Middle School' : ''}
          </p>
        </div>

        {/* My Classes */}
        <div>
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">My Classes</h2>
          <div className="space-y-2">
            {classes.map(cls => (
              <div key={cls.id} className="flex items-center justify-between p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                <span className="text-sm text-white font-medium">{cls.name}</span>
                <button onClick={() => handleDeleteClass(cls.id)} className="p-1.5 text-slate-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            {showAddClass ? (
              <div className="flex gap-2">
                <input type="text" value={newClassName} onChange={e => setNewClassName(e.target.value)} placeholder="Class name" autoFocus
                  onKeyDown={e => { if (e.key === 'Enter') handleAddClass() }}
                  className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm placeholder-slate-500 focus:outline-none focus:border-indigo-500" />
                <button onClick={handleAddClass} disabled={!newClassName.trim()} className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">Add</button>
                <button onClick={() => { setShowAddClass(false); setNewClassName('') }} className="px-2 text-slate-500 text-sm">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setShowAddClass(true)} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-400 transition-colors">
                <Plus className="w-4 h-4" /> Add a class
              </button>
            )}
          </div>
        </div>

        {/* Navigation Links */}
        <div className="space-y-1.5">
          <Link href="/vault" className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all">
            <div className="flex items-center gap-3">
              <Upload className="w-5 h-5 text-indigo-400" />
              <span className="text-sm font-medium text-white">Study Vault</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </Link>

          <Link href="/portfolio" className="flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all">
            <div className="flex items-center gap-3">
              <GraduationCap className="w-5 h-5 text-indigo-400" />
              <div>
                <span className="text-sm font-medium text-white">My Portfolio</span>
                {isHighSchool && <span className="ml-2 text-[10px] text-indigo-400 bg-indigo-600/20 px-1.5 py-0.5 rounded">College Prep</span>}
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </Link>
        </div>

        {/* Invite a Friend */}
        {referralCode && (
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
            <p className="text-sm font-medium text-white mb-1">Invite a Friend</p>
            <p className="text-xs text-slate-400 mb-3">You both get one month free.</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const url = `${window.location.origin}/signup?ref=${referralCode}`
                  navigator.clipboard.writeText(url).then(() => {
                    setReferralCopied(true)
                    setTimeout(() => setReferralCopied(false), 2000)
                  })
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors"
              >
                {referralCopied ? <><Check className="w-3.5 h-3.5" /> Copied!</> : <><Copy className="w-3.5 h-3.5" /> Copy invite link</>}
              </button>
              {referralCount > 0 && (
                <span className="text-xs text-slate-500">{referralCount} referred</span>
              )}
            </div>
          </div>
        )}

        {/* Settings */}
        <div className="space-y-1.5">
          <button
            onClick={() => window.dispatchEvent(new Event('open-settings-drawer'))}
            className="w-full flex items-center justify-between p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl hover:border-indigo-500/30 transition-all"
          >
            <div className="flex items-center gap-3">
              <Settings className="w-5 h-5 text-slate-400" />
              <span className="text-sm font-medium text-white">Settings</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600" />
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3.5 text-red-400 hover:bg-red-900/20 rounded-xl transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">Sign out</span>
          </button>
        </div>
      </div>
    </div>
  )
}
