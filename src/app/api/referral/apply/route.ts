/**
 * POST /api/referral/apply
 *
 * Client-side endpoint to apply a referral code stored in localStorage.
 * Called after signup completes to extend trial to 30 days.
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    // Find referrer
    const { data: referrer } = await supabase
      .from('profiles')
      .select('id, referral_code')
      .eq('referral_code', code.toUpperCase().trim())
      .single();

    if (!referrer) {
      return NextResponse.json({ error: 'Invalid referral code' }, { status: 404 });
    }

    if (referrer.id === user.id) {
      return NextResponse.json({ error: 'Cannot use your own code' }, { status: 400 });
    }

    // Check duplicate
    const { data: existing } = await supabase
      .from('referral_events')
      .select('id')
      .eq('referred_id', user.id)
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, message: 'Already applied' });
    }

    // Extend trial to 30 days
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    await supabase
      .from('profiles')
      .update({
        trial_ends_at: trialEnd.toISOString(),
        referred_by: referrer.id,
      })
      .eq('id', user.id);

    await supabase.from('referral_events').insert({
      referrer_id: referrer.id,
      referred_id: user.id,
      referral_code: referrer.referral_code,
      bonus_days: 30,
    });

    return NextResponse.json({ success: true, trialDays: 30 });
  } catch (error: any) {
    console.error('[Referral] Error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
