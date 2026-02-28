'use client';

import { X, Mail, LogOut, Layout, Shield } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { useRouter } from 'next/navigation';
import { useDensity } from '@/contexts/DensityContext';
import { getDensityTokens } from '@/lib/density-tokens';
import Link from 'next/link';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const { density, setDensity } = useDensity();
  const tokens = getDensityTokens(density);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    
    if (isOpen) {
      loadProfile();
    }
  }, [isOpen]);

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    
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
