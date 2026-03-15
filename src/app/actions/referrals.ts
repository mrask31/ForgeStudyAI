'use server';

import { createClient } from '@/lib/supabase/server';

/**
 * Get or generate the current user's referral code
 */
export async function getReferralCode(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('referral_code')
    .eq('id', user.id)
    .single();

  if (profile?.referral_code) return profile.referral_code;

  // Generate if missing
  const code = user.id.replace(/-/g, '').substring(0, 8).toUpperCase();
  await supabase
    .from('profiles')
    .update({ referral_code: code })
    .eq('id', user.id);

  return code;
}

/**
 * Apply a referral code during signup — extends trial to 30 days
 */
export async function applyReferralCode(code: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: 'Unauthorized' };

  // Find referrer by code
  const { data: referrer } = await supabase
    .from('profiles')
    .select('id, referral_code')
    .eq('referral_code', code.toUpperCase().trim())
    .single();

  if (!referrer) return { success: false, error: 'Invalid referral code' };
  if (referrer.id === user.id) return { success: false, error: 'Cannot use your own code' };

  // Check if already referred
  const { data: existing } = await supabase
    .from('referral_events')
    .select('id')
    .eq('referred_id', user.id)
    .limit(1)
    .maybeSingle();

  if (existing) return { success: false, error: 'Referral already applied' };

  // Extend trial to 30 days from now
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 30);

  await supabase
    .from('profiles')
    .update({
      trial_ends_at: trialEnd.toISOString(),
      referred_by: referrer.id,
    })
    .eq('id', user.id);

  // Record event
  await supabase.from('referral_events').insert({
    referrer_id: referrer.id,
    referred_id: user.id,
    referral_code: referrer.referral_code,
    bonus_days: 30,
  });

  return { success: true };
}

/**
 * Get referral stats for the current user
 */
export async function getReferralStats(): Promise<{ referralCount: number; code: string | null }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { referralCount: 0, code: null };

  const [codeResult, countResult] = await Promise.all([
    supabase.from('profiles').select('referral_code').eq('id', user.id).single(),
    supabase.from('referral_events').select('id', { count: 'exact', head: true }).eq('referrer_id', user.id),
  ]);

  return {
    referralCount: countResult.count || 0,
    code: codeResult.data?.referral_code || null,
  };
}
