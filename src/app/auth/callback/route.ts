import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  
  // Confirm redirectTo / callbackUrl matches production domain
  // Use NEXT_PUBLIC_APP_URL if available, otherwise use request origin
  const appUrl = process.env.NEXT_PUBLIC_APP_URL 
    ? (process.env.NEXT_PUBLIC_APP_URL.startsWith('http') 
        ? process.env.NEXT_PUBLIC_APP_URL 
        : `https://${process.env.NEXT_PUBLIC_APP_URL}`)
    : origin

  if (code) {
    const clientCallbackUrl = new URL('/auth/client-callback', appUrl)
    clientCallbackUrl.searchParams.set('code', code)
    return NextResponse.redirect(clientCallbackUrl)
  }

  // If something breaks, send them to the login page
  // Use appUrl for consistent redirects (already declared at top of function)
  return NextResponse.redirect(`${appUrl}/login?error=auth-code-error`)
}