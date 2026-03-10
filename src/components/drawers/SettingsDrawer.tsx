'use client';

import { X, Mail, LogOut, Layout, Shield, Settings, RefreshCw, Link as LinkIcon } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useDensity } from '@/contexts/DensityContext';
import { getDensityTokens } from '@/lib/density-tokens';
import { useActiveProfile } from '@/contexts/ActiveProfileContext';
import { toast } from 'sonner';
import Link from 'next/link';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const router = useRouter();
  const { activeProfileId } = useActiveProfile();
  const [user, setUser] = useState<any>(null);
  const { density, setDensity } = useDensity();
  const tokens = getDensityTokens(density);
  const [hasCanvasConnection, setHasCanvasConnection] = useState(false);
  const [isCheckingConnection, setIsCheckingConnection] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  // Singleton Supabase client - only create once per component instance
  const supabase = useMemo(
    () => getSupabaseBrowser(),
    []
  );

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    if (isOpen) {
      loadProfile();
      checkLMSConnection();
    }
  }, [isOpen, supabase, activeProfileId]);

  const checkLMSConnection = async () => {
    if (!activeProfileId) {
      setHasCanvasConnection(false);
      return;
    }

    setIsCheckingConnection(true);
    try {
      const response = await fetch(`/api/parent/lms/status/${activeProfileId}`);
      if (response.ok) {
        const data = await response.json();
        const canvasConnection = data.connections?.find(
          (c: any) => c.provider === 'canvas' && c.status === 'active'
        );
        setHasCanvasConnection(!!canvasConnection);
      }
    } catch (error) {
      console.error('[SettingsDrawer] Error checking LMS connection:', error);
    } finally {
      setIsCheckingConnection(false);
    }
  };

  const handleSyncNow = async () => {
    setIsSyncing(true);

    try {
      const response = await fetch('/api/internal/sync/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Sync failed');
      }

      toast.success('Synced! Galaxy updating...');
      
      // Reset button after 3 seconds
      setTimeout(() => {
        setIsSyncing(false);
      }, 3000);
    } catch (error: any) {
      console.error('[SettingsDrawer] Sync error:', error);
      toast.error(error.message || 'Failed to trigger sync');
      setIsSyncing(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Settings Drawer */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-drawer-title"
        className={`fixed inset-y-0 right-0 z-50 w-full md:w-[450px] lg:w-[500px] 
                   bg-slate-950/95 backdrop-blur-2xl border-l border-slate-800 shadow-2xl
                   transition-transform duration-300 ease-in-out overflow-y-auto
                   ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header */}
        <div className="border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 bg-slate-950/95 backdrop-blur-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 rounded-lg">
              <Settings className="w-5 h-5 text-indigo-400" />
            </div>
            <h2 id="settings-drawer-title" className="text-lg font-semibold text-slate-200">
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-4 -m-4 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Parent Access */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-semibold text-slate-200">Parent Access</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Manage subscriptions and student profiles in a PIN-protected space.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/parent"
                onClick={onClose}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-500/30"
              >
                Open Parent Dashboard
              </Link>
              <Link
                href="/profiles"
                onClick={onClose}
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-slate-700 text-slate-200 font-semibold hover:border-indigo-500/30 hover:bg-indigo-600/10 transition-colors"
              >
                Switch Profile
              </Link>
            </div>
          </div>

          {/* Display Density */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Layout className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-semibold text-slate-200">Display Density</h3>
            </div>
            <p className="text-sm text-slate-400 mb-4">
              Choose how much space and text size you prefer. Comfort is larger and easier to read; Compact fits more on screen.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDensity('comfort')}
                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                  density === 'comfort'
                    ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-500/30'
                    : 'bg-slate-900/60 text-slate-200 border-slate-700 hover:border-indigo-500/30 hover:bg-indigo-600/10'
                } text-sm font-semibold`}
              >
                Comfort
              </button>
              <button
                onClick={() => setDensity('compact')}
                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                  density === 'compact'
                    ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-500/30'
                    : 'bg-slate-900/60 text-slate-200 border-slate-700 hover:border-indigo-500/30 hover:bg-indigo-600/10'
                } text-sm font-semibold`}
              >
                Compact
              </button>
            </div>
          </div>

          {/* School Integrations - Only show if Canvas is connected */}
          {hasCanvasConnection && (
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <LinkIcon className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-semibold text-slate-200">School Integrations</h3>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span className="text-sm font-medium text-slate-200">Canvas Connected</span>
                </div>
                <button
                  onClick={handleSyncNow}
                  disabled={isSyncing}
                  className="flex items-center gap-2 px-4 py-2 text-sm border border-indigo-500 text-indigo-400 hover:bg-indigo-500/10 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
                  {isSyncing ? 'Syncing...' : 'Sync Now'}
                </button>
              </div>
              <p className="text-xs text-slate-400 mt-3">
                Your Canvas assignments are automatically synced to your Galaxy.
              </p>
            </div>
          )}

          {/* Account */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl p-6">
            <h3 className="text-base font-semibold text-slate-200 mb-4">Account</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-indigo-400" />
                <div>
                  <p className="text-sm text-slate-400">Email</p>
                  <p className="text-sm font-medium text-slate-200">
                    {user?.email || 'Not available'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-red-900/40 to-rose-900/40 text-red-400 border-2 border-red-800/50 rounded-xl text-sm font-semibold hover:from-red-900/60 hover:to-rose-900/60 hover:border-red-700/50 transition-all duration-200 shadow-sm hover:shadow-md"
              >
                <LogOut className="w-4 h-4" />
                Log Out
              </button>
            </div>
          </div>

          {/* Support */}
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl shadow-xl p-6">
            <h3 className="text-base font-semibold text-slate-200 mb-4">Support</h3>
            <p className="text-sm text-slate-400">
              Need help? Email{' '}
              <a
                href="mailto:support@forgestudy.com"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                support@forgestudy.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
