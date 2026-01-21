import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { FAMILY_MAX_PROFILES } from '@/lib/constants'

export async function middleware(request: NextRequest) {
  // Wrap entire middleware in try/catch to prevent ANY crash
  try {
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    })

    const { pathname } = request.nextUrl
    const searchParams = request.nextUrl.searchParams

    // Force production traffic onto the canonical app URL to avoid cross-domain auth issues.
    const appUrlEnv = process.env.NEXT_PUBLIC_APP_URL
    if (process.env.NODE_ENV === 'production' && appUrlEnv) {
      const normalizedAppUrl = appUrlEnv.startsWith('http')
        ? appUrlEnv
        : appUrlEnv.includes('localhost') || appUrlEnv.includes('127.0.0.1')
          ? `http://${appUrlEnv}`
          : `https://${appUrlEnv}`
      if (normalizedAppUrl && request.nextUrl.origin !== normalizedAppUrl) {
        const redirectUrl = new URL(pathname, normalizedAppUrl)
        redirectUrl.search = request.nextUrl.search
        return NextResponse.redirect(redirectUrl)
      }
    }

    // If Supabase verification code lands on "/", route it to /auth/callback
    if (pathname === '/' && searchParams.has('code')) {
      const callbackUrl = new URL('/auth/callback', request.url)
      callbackUrl.search = searchParams.toString()
      return NextResponse.redirect(callbackUrl)
    }

    // Early return for public routes if Supabase is not configured
    // This prevents the entire site from breaking if env vars are missing
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // If Supabase is not configured, allow public routes to pass through
    // This ensures the landing page and other public pages still work
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('[Middleware] Supabase environment variables are missing!')
      // For public routes, allow access even without Supabase
      const publicRoutes = ['/', '/login', '/signup', '/reset', '/reset-password', '/auth/callback', '/privacy', '/terms', '/billing/payment-required', '/checkout', '/middle', '/high']
      const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/auth/')
      
      if (isPublicRoute) {
        // Add cache control headers for login and signup pages
        if (pathname === '/login' || pathname === '/signup') {
          response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
          response.headers.set('Pragma', 'no-cache')
          response.headers.set('Expires', '0')
        }
        return response
      }
      
      // For protected routes without Supabase, redirect to login
      // But don't crash the site
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Create Supabase client with error handling
    let supabase
    let user = null
    
    try {
      supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
          cookies: {
            get(name: string) {
              return request.cookies.get(name)?.value
            },
            set(name: string, value: string, options: CookieOptions) {
              request.cookies.set({
                name,
                value,
                ...options,
              })
              response.cookies.set({
                name,
                value,
                ...options,
              })
            },
            remove(name: string, options: CookieOptions) {
              request.cookies.set({
                name,
                value: '',
                ...options,
              })
              response.cookies.set({
                name,
                value: '',
                ...options,
              })
            },
          },
        }
      )

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser()
      user = authUser
    } catch (error) {
      // If Supabase client creation or auth check fails, log error but don't crash
      console.error('[Middleware] Error initializing Supabase:', error)
      // Allow public routes to continue
      const publicRoutes = ['/', '/login', '/signup', '/auth/callback', '/privacy', '/terms', '/billing/payment-required', '/checkout', '/middle', '/high']
      const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/auth/')
      if (isPublicRoute) {
        return response
      }
      // For protected routes, redirect to login
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Public routes (also include billing routes for access)
    const publicRoutes = ['/', '/login', '/signup', '/reset', '/reset-password', '/auth/callback', '/privacy', '/terms', '/billing/payment-required', '/checkout', '/middle', '/high']
    const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/auth/')

    // Protected routes (require authentication)
    const protectedRoutes = ['/clinical-desk', '/tutor', '/binder', '/readiness', '/settings', '/classes', '/profiles', '/post-login', '/p/', '/sources', '/app/middle', '/app/high']
    const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
    
    // Routes that require auth but bypass subscription check (onboarding/profile management)
    // Check exact matches first, then prefix matches for /p/ (profile-scoped routes)
    const isAuthOnlyRoute = pathname === '/profiles' || 
                           pathname.startsWith('/profiles/') || 
                           pathname === '/post-login' ||
                           pathname.startsWith('/p/')

    // Allow access to billing pages (success, cancel, payment-required) and checkout
    const billingRoutes = ['/billing', '/checkout']
    const isBillingRoute = billingRoutes.some(route => pathname.startsWith(route))

    // Redirect unauthenticated users away from protected routes
    if (pathname.startsWith('/elementary')) {
      return NextResponse.redirect(new URL('/middle', request.url))
    }

    if (pathname.startsWith('/app/elementary')) {
      return NextResponse.redirect(new URL('/app/middle', request.url))
    }

    if (isProtectedRoute && !user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // Enforce profile creation guardrails for /profiles/new
    if (user && pathname.startsWith('/profiles/new') && supabase) {
      try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        let profileCount = 0
        let parentPinHash: string | null = null

        if (serviceRoleKey) {
          const adminClient = createClient(supabaseUrl, serviceRoleKey)
          const { count } = await adminClient
            .from('student_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', user.id)
          profileCount = count || 0

          const { data: parentProfile } = await adminClient
            .from('profiles')
            .select('parent_pin_hash')
            .eq('id', user.id)
            .single()
          parentPinHash = parentProfile?.parent_pin_hash || null
        } else {
          const { data } = await supabase
            .from('student_profiles')
            .select('id')
            .eq('owner_id', user.id)
          profileCount = (data || []).length

          const { data: parentProfile } = await supabase
            .from('profiles')
            .select('parent_pin_hash')
            .eq('id', user.id)
            .single()
          parentPinHash = parentProfile?.parent_pin_hash || null
        }

        if (profileCount >= 1) {
          if (profileCount >= FAMILY_MAX_PROFILES) {
            return NextResponse.redirect(new URL('/parent', request.url))
          }

          const subscriptionUrl = new URL('/api/stripe/subscription', request.url)
          const subscriptionRes = await fetch(subscriptionUrl, {
            headers: {
              cookie: request.headers.get('cookie') || '',
            },
          })
          if (subscriptionRes.ok) {
            const data = await subscriptionRes.json()
            const planType = data?.planType || 'individual'
            if (planType !== 'family') {
              return NextResponse.redirect(new URL('/profiles', request.url))
            }
          } else {
            return NextResponse.redirect(new URL('/profiles', request.url))
          }

          if (!parentPinHash) {
            return NextResponse.redirect(new URL('/parent', request.url))
          }
        }
      } catch (error) {
        console.error('[Middleware] Error enforcing profile creation guardrails:', error)
        return NextResponse.redirect(new URL('/profiles', request.url))
      }
    }

    // Check subscription status for authenticated users accessing protected routes
    // Skip subscription check for auth-only routes (profiles, post-login, etc.)
    if (user && isProtectedRoute && !isBillingRoute && !isAuthOnlyRoute && supabase) {
      try {
        // Use service role key to bypass RLS for subscription status check
        // This is safe because we're only reading subscription_status, not sensitive data
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        let subscriptionStatus: string | undefined
        let profileError: any = null
        
        if (serviceRoleKey) {
          // Use service role key to bypass RLS
          const adminClient = createClient(
            supabaseUrl,
            serviceRoleKey
          )
          const { data: profile, error } = await adminClient
            .from('profiles')
            .select('subscription_status')
            .eq('id', user.id)
            .single()
          
          if (error) {
            console.error('[Middleware] Error fetching profile with service role:', error)
            profileError = error
          } else {
            subscriptionStatus = profile?.subscription_status
          }
        } else {
          // Fallback to anon key (may be blocked by RLS)
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('subscription_status')
            .eq('id', user.id)
            .single()
          
          if (error) {
            console.error('[Middleware] Error fetching profile with anon key:', error)
            profileError = error
          } else {
            subscriptionStatus = profile?.subscription_status
          }
        }

        // If we couldn't fetch the profile, default to blocking access (fail secure)
        if (profileError || subscriptionStatus === undefined) {
          console.warn('[Middleware] Could not determine subscription status, blocking access', {
            userId: user.id,
            error: profileError?.message,
            hasServiceRoleKey: !!serviceRoleKey
          })
          return NextResponse.redirect(new URL('/billing/payment-required', request.url))
        }

        const hasActiveSubscription = subscriptionStatus === 'active' || subscriptionStatus === 'trialing'

        if (!hasActiveSubscription) {
          // User doesn't have active subscription, redirect to payment required page
          return NextResponse.redirect(new URL('/billing/payment-required', request.url))
        }
      } catch (error) {
        // If subscription check fails, log error but allow access to prevent site breakage
        console.error('[Middleware] Error checking subscription status:', error)
        // Fail secure: redirect to payment required
        return NextResponse.redirect(new URL('/billing/payment-required', request.url))
      }
    }

    // Require at least one student profile before accessing app features
    if (user && isProtectedRoute && !isAuthOnlyRoute && supabase) {
      try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        let hasProfiles = false
        let profilesError: any = null

        if (serviceRoleKey) {
          const adminClient = createClient(
            supabaseUrl,
            serviceRoleKey
          )
          const { count, error } = await adminClient
            .from('student_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', user.id)
          if (error) {
            profilesError = error
          } else {
            hasProfiles = (count || 0) > 0
          }
        } else {
          const { data, error } = await supabase
            .from('student_profiles')
            .select('id')
            .eq('owner_id', user.id)
            .limit(1)
          if (error) {
            profilesError = error
          } else {
            hasProfiles = (data || []).length > 0
          }
        }

        if (profilesError) {
          console.error('[Middleware] Error checking student profiles:', profilesError)
          return NextResponse.redirect(new URL('/profiles/new', request.url))
        }

        if (!hasProfiles && !pathname.startsWith('/profiles')) {
          return NextResponse.redirect(new URL('/profiles/new', request.url))
        }
      } catch (error) {
        console.error('[Middleware] Error enforcing profile gate:', error)
        return NextResponse.redirect(new URL('/profiles/new', request.url))
      }
    }

    // Redirect authenticated users away from auth pages
    if (user && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/profiles', request.url))
    }

    // Add aggressive cache control headers for login, signup, and landing pages to prevent 304 issues
    if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      response.headers.set('X-Cache-Control', 'no-cache')
      // Add a unique header to force fresh requests
      response.headers.set('X-Timestamp', Date.now().toString())
    }

    return response
  } catch (error) {
    // CRITICAL: If middleware crashes, log error but ALWAYS return a response
    // This prevents the entire site from going down
    console.error('[Middleware] CRITICAL ERROR - Middleware crashed:', error)
    
    // For any route, return a basic response to prevent site crash
    // Public routes should work, protected routes will redirect on client side
    const pathname = request.nextUrl.pathname
    const publicRoutes = ['/', '/login', '/signup', '/auth/callback', '/privacy', '/terms', '/billing/payment-required', '/checkout']
    const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith('/auth/')
    
    if (isPublicRoute) {
      // Allow public routes to load even if middleware crashes
      return NextResponse.next({
        request: {
          headers: request.headers,
        },
      })
    }
    
    // For protected routes, try to redirect to login (but don't crash if this fails)
    try {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    } catch {
      // If even redirect fails, return basic response
      return NextResponse.next({
        request: {
          headers: request.headers,
        },
      })
    }
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}

