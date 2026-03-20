'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, LogOut } from 'lucide-react';
import { startStripeCheckout } from '@/lib/stripeClient';
import { getSupabaseBrowser } from '@/lib/supabase/client';

interface PaywallModalProps {
  isOpen: boolean;
}

export function PaywallModal({ isOpen }: PaywallModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleUpgrade = async () => {
    setLoading(true);
    setError(null);
    try {
      await startStripeCheckout('individual_monthly');
    } catch (err: any) {
      console.error('[PaywallModal] Checkout error:', err);
      setError(err.message || 'Failed to start checkout. Please try again.');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getSupabaseBrowser();
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center space-y-6">
        <div className="w-16 h-16 mx-auto bg-indigo-600/20 border border-indigo-500/30 rounded-full flex items-center justify-center">
          <Lock className="w-8 h-8 text-indigo-400" />
        </div>

        <div>
          <h2 className="text-xl font-bold text-slate-100">
            Your free trial has ended
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Upgrade to continue studying with your AI tutor, Galaxy progress tracking, and Canvas sync.
          </p>
        </div>

        {error && (
          <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl font-semibold transition-colors text-base"
        >
          {loading ? 'Loading...' : 'Upgrade Now'}
        </button>

        <button
          onClick={handleLogout}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Log out
        </button>
      </div>
    </div>
  );
}
