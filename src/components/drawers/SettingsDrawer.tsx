'use client';

import { X, Mail, LogOut, Layout, Shield, Settings, Sun, Moon, GraduationCap } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { useDensity } from '@/contexts/DensityContext';
import { getDensityTokens } from '@/lib/density-tokens';
import { clearAuthStorage } from '@/lib/auth-cleanup';
import { useTheme } from '@/components/providers/ThemeProvider';
import { toast } from 'sonner';
import Link from 'next/link';

interface SettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsDrawer({ isOpen, onClose }: SettingsDrawerProps) {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const { theme, toggleTheme } = useTheme();
  const { density, setDensity } = useDensity();
  const tokens = getDensityTokens(density);
  const [teacherEmail, setTeacherEmail] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [teacherSaved, setTeacherSaved] = useState(false);

  // Singleton Supabase client - only create once per component instance
  const supabase = useMemo(
    () => getSupabaseBrowser(),
    []
  );

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);

      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('teacher_email, teacher_name')
          .eq('id', user.id)
          .single();
        if (profile) {
          setTeacherEmail(profile.teacher_email || '');
          setTeacherName(profile.teacher_name || '');
        }
      }
    };

    if (isOpen) {
      loadProfile();
    }
  }, [isOpen, supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clearAuthStorage();
    router.push('/login');
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
        className={`fixed inset-0 bg-black/20 dark:bg-slate-950/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
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
                   bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl border-l-0 md:border-l border-gray-200 dark:border-slate-800 shadow-2xl
                   transition-transform duration-300 ease-in-out flex flex-col
                   ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        {/* Header — fixed at top */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-slate-800 p-4 flex items-center justify-between bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-600/20 rounded-lg">
              <Settings className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 id="settings-drawer-title" className="text-lg font-semibold text-gray-900 dark:text-slate-200">
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close settings"
            className="p-4 -m-4 text-gray-400 dark:text-slate-400 hover:text-gray-600 dark:hover:text-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-6 pb-8 space-y-6">
          {/* Appearance — first for easy access */}
          <div className="bg-gray-50 dark:bg-slate-900/60 backdrop-blur-md border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {theme === 'light' ? (
                  <Sun className="w-5 h-5 text-amber-500" />
                ) : (
                  <Moon className="w-5 h-5 text-indigo-400" />
                )}
                <div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-slate-200">Appearance</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">
                    {theme === 'light' ? 'Light mode' : 'Dark mode'}
                  </p>
                </div>
              </div>
              <button
                onClick={toggleTheme}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${
                  theme === 'dark'
                    ? 'bg-indigo-600'
                    : 'bg-gray-300 dark:bg-slate-600'
                }`}
                role="switch"
                aria-checked={theme === 'dark'}
                aria-label="Toggle dark mode"
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                    theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Parent Access */}
          <div className="bg-gray-50 dark:bg-slate-900/60 backdrop-blur-md border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-slate-200">Parent Access</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
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
                className="inline-flex items-center justify-center px-4 py-2 rounded-xl border border-gray-300 dark:border-slate-700 text-gray-700 dark:text-slate-200 font-semibold hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-600/10 transition-colors"
              >
                Switch Profile
              </Link>
            </div>
          </div>

          {/* Display Density */}
          <div className="bg-gray-50 dark:bg-slate-900/60 backdrop-blur-md border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Layout className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-slate-200">Display Density</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              Choose how much space and text size you prefer. Comfort is larger and easier to read; Compact fits more on screen.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDensity('comfort')}
                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                  density === 'comfort'
                    ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-500/30'
                    : 'bg-white dark:bg-slate-900/60 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-600/10'
                } text-sm font-semibold`}
              >
                Comfort
              </button>
              <button
                onClick={() => setDensity('compact')}
                className={`flex-1 px-4 py-3 rounded-xl border-2 transition-all duration-200 ${
                  density === 'compact'
                    ? 'bg-indigo-600 text-white border-transparent shadow-md shadow-indigo-500/30'
                    : 'bg-white dark:bg-slate-900/60 text-gray-700 dark:text-slate-200 border-gray-300 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-500/30 hover:bg-indigo-50 dark:hover:bg-indigo-600/10'
                } text-sm font-semibold`}
              >
                Compact
              </button>
            </div>
          </div>

          {/* Teacher Info */}
          <div className="bg-gray-50 dark:bg-slate-900/60 backdrop-blur-md border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-3">
              <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-slate-200">Teacher Info (optional)</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mb-4">
              We'll CC your child's teacher on weekly summaries so they can see their progress.
            </p>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Teacher's name"
                value={teacherName}
                onChange={(e) => { setTeacherName(e.target.value); setTeacherSaved(false) }}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <input
                type="email"
                placeholder="Teacher's email"
                value={teacherEmail}
                onChange={(e) => { setTeacherEmail(e.target.value); setTeacherSaved(false) }}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800/60 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />
              <button
                onClick={async () => {
                  if (!user) return
                  await supabase
                    .from('profiles')
                    .update({
                      teacher_email: teacherEmail.trim() || null,
                      teacher_name: teacherName.trim() || null,
                    })
                    .eq('id', user.id)
                  setTeacherSaved(true)
                  setTimeout(() => setTeacherSaved(false), 2000)
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors"
              >
                {teacherSaved ? 'Saved!' : 'Save'}
              </button>
            </div>
          </div>

          {/* Account */}
          <div className="bg-gray-50 dark:bg-slate-900/60 backdrop-blur-md border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-200 mb-4">Account</h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <div>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Email</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-200">
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

          {/* Privacy & COPPA */}
          <div className="bg-gray-50 dark:bg-slate-900/60 backdrop-blur-md border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <Shield className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
              <h3 className="text-base font-semibold text-gray-900 dark:text-slate-200">Privacy</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-slate-300 leading-relaxed">
              ForgeStudy AI is COPPA compliant. We never sell student data, show ads, or share information with third parties. All student conversations are private.
            </p>
          </div>

          {/* Support */}
          <div className="bg-gray-50 dark:bg-slate-900/60 backdrop-blur-md border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xl p-6">
            <h3 className="text-base font-semibold text-gray-900 dark:text-slate-200 mb-4">Support</h3>
            <p className="text-sm text-gray-500 dark:text-slate-400">
              Need help? Email{' '}
              <a
                href="mailto:support@forgestudyai.com"
                className="text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                support@forgestudyai.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
