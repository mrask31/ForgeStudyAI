import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const plan = searchParams.get('plan')
  const next = searchParams.get('next') ?? '/tutor'
  
  // Confirm redirectTo / callbackUrl matches production domain
  // Use NEXT_PUBLIC_APP_URL if available, otherwise use request origin
  const appUrl = process.env.NEXT_PUBLIC_APP_URL 
    ? (process.env.NEXT_PUBLIC_APP_URL.startsWith('http') 
        ? process.env.NEXT_PUBLIC_APP_URL 
        : `https://${process.env.NEXT_PUBLIC_APP_URL}`)
    : origin

  if (code) {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )
    
    // Exchange the code for a session (Log them in!)
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('[Auth Callback] Error exchanging code for session:', error)
      // Use appUrl for consistent redirects (already declared at top of function)
      return NextResponse.redirect(`${appUrl}/login?error=auth-code-error`)
    }
    
    if (!error) {
      // Ensure profile exists with correct subscription status
      const { data: { user } } = await supabase.auth.getUser()
      let subscriptionStatus = 'pending_payment'
      
      if (user) {
        // Use service role key to bypass RLS for profile operations
        // This is necessary because RLS might block the anon key
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        let profileClient = supabase
        
        if (serviceRoleKey) {
          // Use service role key to bypass RLS
          profileClient = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            serviceRoleKey
          ) as any
        }
        
        // Check if profile exists, create/update if needed
        const { data: profile, error: profileError } = await profileClient
          .from('profiles')
          .select('id, subscription_status')
          .eq('id', user.id)
          .single()

        if (profileError || !profile) {
          // Profile doesn't exist or query failed, create it with pending_payment status
          const { error: insertError } = await profileClient
            .from('profiles')
            .insert({
              id: user.id,
              subscription_status: 'pending_payment',
            })
          
          if (insertError) {
            console.error('[Auth Callback] Error creating profile:', insertError)
            // Continue with default pending_payment status
          }
        } else {
          // Store the current subscription status
          subscriptionStatus = profile.subscription_status || 'pending_payment'
          
          // Update existing profile to set status if missing
          if (!profile.subscription_status) {
            const { error: updateError } = await profileClient
              .from('profiles')
              .update({ subscription_status: 'pending_payment' })
              .eq('id', user.id)
            
            if (updateError) {
              console.error('[Auth Callback] Error updating profile:', updateError)
            }
          }
        }
      }

      // If there's a plan parameter, redirect to checkout initiation page
      // This will trigger the Stripe checkout flow
      if (plan && (plan === 'monthly' || plan === 'semester' || plan === 'annual')) {
        return NextResponse.redirect(`${appUrl}/checkout?plan=${plan}`)
      }
      
      // If user needs to pay (pending_payment, canceled, past_due, unpaid), redirect to checkout
      // This handles cases where they verified via an old email link without a plan parameter
      if (subscriptionStatus === 'pending_payment' || 
          subscriptionStatus === 'canceled' || 
          subscriptionStatus === 'past_due' || 
          subscriptionStatus === 'unpaid') {
        // Redirect to checkout without plan so user can choose
        return NextResponse.redirect(`${appUrl}/checkout`)
      }
      
      // Redirect to a valid route (e.g. /tutor), not a non-existent path
      return NextResponse.redirect(`${appUrl}${next}`)
    }
  }

  // If something breaks, send them to the login page
  // Use appUrl for consistent redirects (already declared at top of function)
  return NextResponse.redirect(`${appUrl}/login?error=auth-code-error`)
}