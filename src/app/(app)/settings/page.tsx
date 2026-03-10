'use client'

import { useState, useEffect } from 'react'
import { useActiveProfile } from '@/contexts/ActiveProfileContext'
import { useUser } from '@/contexts/UserContext'
import { toast } from 'sonner'
import { Settings as SettingsIcon, RefreshCw } from 'lucide-react'

export default function SettingsPage() {
  const { activeProfileId } = useActiveProfile()
  const { user } = useUser()
  const [isSyncing, setIsSyncing] = useState(false)
  const [hasLMSConnection, setHasLMSConnection] = useState(false)
  const [isCheckingConnection, setIsCheckingConnection] = useState(true)

  useEffect(() => {
    checkLMSConnection()
  }, [activeProfileId])

  const checkLMSConnection = async () => {
    if (!activeProfileId) {
      setIsCheckingConnection(false)
      return
    }

    try {
      const response = await fetch(`/api/student/sync-status`)
      if (response.ok) {
        const data = await response.json()
        setHasLMSConnection(data.hasActiveConnection || false)
      }
    } catch (error) {
      console.error('[Settings] Error checking LMS connection:', error)
    } finally {
      setIsCheckingConnection(false)
    }
  }

  const handleSyncNow = async () => {
    setIsSyncing(true)

    try {
      const response = await fetch('/api/internal/sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Sync failed')
      }

      toast.success('Synced! Your Galaxy will update shortly.')
    } catch (error: any) {
      console.error('[Settings] Sync error:', error)
      toast.error(error.message || 'Failed to trigger sync')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 px-6 py-12">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-indigo-400" />
          <h1 className="text-3xl font-bold text-slate-100">Settings</h1>
        </div>

        {/* School Integrations Section */}
        <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-lg p-6 space-y-4">
          <h2 className="text-xl font-semibold text-slate-100">School Integrations</h2>
          
          {isCheckingConnection ? (
            <div className="text-slate-400 text-sm">Checking connection...</div>
          ) : hasLMSConnection ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-slate-200">Canvas Connected</span>
                </div>
                <button
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-indigo-500 text-indigo-400 hover:bg-indigo-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Your Canvas assignments are automatically synced to your Galaxy.
              </p>
            </div>
          ) : (
            <div className="text-sm text-slate-400">
              No school integrations connected. Ask your parent to connect Canvas in their profile.
            </div>
          )}
        </div>

        {/* Additional settings sections can go here */}
      </div>
    </div>
  )
}
