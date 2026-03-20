'use client';

import { useEffect, useState } from 'react';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { PaywallModal } from './PaywallModal';

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const [showPaywall, setShowPaywall] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    async function checkSubscription() {
      try {
        const supabase = getSupabaseBrowser();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setChecked(true);
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, trial_ends_at')
          .eq('id', user.id)
          .single();

        if (!profile) {
          setChecked(true);
          return;
        }

        const { subscription_status, trial_ends_at } = profile;

        // Check if trial is still active
        const isTrialActive = trial_ends_at && new Date(trial_ends_at) > new Date();

        // Allow access if active subscription or active trial
        if (subscription_status === 'active' || (subscription_status === 'trialing' && isTrialActive)) {
          setShowPaywall(false);
        } else {
          // expired, canceled, past_due, pending_payment with no active trial
          setShowPaywall(true);
        }
      } catch (error) {
        console.error('[SubscriptionGuard] Error checking subscription:', error);
      } finally {
        setChecked(true);
      }
    }

    checkSubscription();
  }, []);

  return (
    <>
      {children}
      {checked && <PaywallModal isOpen={showPaywall} />}
    </>
  );
}
