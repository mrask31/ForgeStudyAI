'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { getSupabaseBrowser } from '@/lib/supabase/client';
import { useActiveProfile } from '@/contexts/ActiveProfileContext';
import { PaywallModal } from './PaywallModal';

export function SubscriptionGuard({ children }: { children: React.ReactNode }) {
  const [showPaywall, setShowPaywall] = useState(false);
  const [checked, setChecked] = useState(false);
  const { activeProfileId } = useActiveProfile();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    async function check() {
      try {
        const supabase = getSupabaseBrowser();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setChecked(true); return; }

        // Check subscription
        const { data: profile } = await supabase
          .from('profiles')
          .select('subscription_status, trial_ends_at')
          .eq('id', user.id)
          .single();

        if (!profile) { setChecked(true); return; }

        const isTrialActive = profile.trial_ends_at && new Date(profile.trial_ends_at) > new Date();
        if (profile.subscription_status === 'active' || (profile.subscription_status === 'trialing' && isTrialActive)) {
          setShowPaywall(false);
        } else {
          setShowPaywall(true);
        }

        // Check COPPA consent for active student profile
        if (activeProfileId && !pathname.startsWith('/consent-')) {
          const { data: studentProfile } = await supabase
            .from('student_profiles')
            .select('consent_status')
            .eq('id', activeProfileId)
            .single();

          if (studentProfile?.consent_status === 'pending') {
            router.replace('/consent-pending');
            return;
          }
          if (studentProfile?.consent_status === 'denied') {
            router.replace('/consent-denied');
            return;
          }
        }
      } catch (error) {
        console.error('[SubscriptionGuard] Error:', error);
      } finally {
        setChecked(true);
      }
    }

    check();
  }, [activeProfileId, router, pathname]);

  return (
    <>
      {children}
      {checked && <PaywallModal isOpen={showPaywall} />}
    </>
  );
}
