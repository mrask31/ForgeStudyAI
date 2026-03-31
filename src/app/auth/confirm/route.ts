import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/reset-password'

  const baseUrl = process.env['NEXT_PUBLIC_APP_URL'] || 'https://www.forgestudyai.com'

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${baseUrl}/reset-password?error=invalid_link`)
  }

  // Exchange the token server-side — sets session cookies
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

  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: type as any,
  })

  if (error) {
    console.error('[Auth Confirm] Error verifying token:', error.message)
    // For recovery type, redirect to reset page with error
    if (type === 'recovery') {
      return NextResponse.redirect(`${baseUrl}/reset-password?error=expired_link`)
    }
    return NextResponse.redirect(`${baseUrl}/login?error=auth-code-error`)
  }

  console.log('[Auth Confirm] Token verified, type:', type, 'redirecting to:', next)

  // For recovery: redirect to reset-password (session is now set via cookies)
  if (type === 'recovery') {
    return NextResponse.redirect(`${baseUrl}/reset-password?verified=true`)
  }

  // For other types (signup confirmation, etc): use the next param
  return NextResponse.redirect(`${baseUrl}${next}`)
}
