import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'
import { hasSubscriptionAccess } from '@/lib/subscription-access'

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

    // ============================================
    // ROUTE CLASSIFICATION (Single Source of Truth)
    // ============================================
    
    // Public routes (no auth required)
    const publicRoutes = [
      '/',
      '/login',
      '/signup',
      '/reset',
      '/reset-password',
      '/auth/callback',
      '/auth/confirm',
      '/auth/reset',
      '/privacy',
      '/terms',
      '/middle',
      '/high',
      '/elementary',
    ]
    const isPublicRoute = publicRoutes.includes(pathname) || 
                         pathname.startsWith('/auth/') ||
                         pathname.startsWith('/billing/') ||
                         pathname.startsWith('/checkout')

    // Auth-only routes (auth required, NO subscription check, NO profile check)
    const authOnlyRoutes = [
      '/profiles',
      '/profiles/',
      '/post-login',
    ]
    const isAuthOnlyRoute = authOnlyRoutes.some(route => 
      route.endsWith('/') ? pathname.startsWith(route) : pathname === route
    )

    // Protected routes (auth + subscription + profile required)
    // Everything under /app/* is protected
    const isProtectedRoute = pathname.startsWith('/app/')

    // Redirect elementary to middle (grade band normalization)
    if (pathname.startsWith('/elementary') || pathname.startsWith('/app/elementary')) {
      const redirectPath = pathname.replace('/elementary', '/middle').replace('/app/elementary', '/app/middle')
      return NextResponse.redirect(new URL(redirectPath, request.url))
    }

    // ============================================
    // MIDDLEWARE ENFORCEMENT (Decision Tree)
    // ============================================
    
    // 1. If route is public → allow
    if (isPublicRoute) {
      // Redirect authenticated users away from auth pages
      if (user && (pathname === '/login' || pathname === '/signup')) {
        return NextResponse.redirect(new URL('/profiles', request.url))
      }
      // Allow public access
      return response
    }

    // 2. Require authenticated user for all non-public routes
    if (!user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // 3. If route is auth-only → allow (skip subscription and profile checks)
    if (isAuthOnlyRoute) {
      return response
    }

    // 4. Protected routes (/app/*) require auth + subscription + profile
    if (isProtectedRoute && supabase) {
      // 4a. Check subscription status and trial
      try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        let subscriptionStatus: string | undefined
        let trialEndsAt: string | null | undefined
        
        if (serviceRoleKey) {
          const adminClient = createClient(supabaseUrl, serviceRoleKey)
          const { data: profile, error } = await adminClient
            .from('profiles')
            .select('subscription_status, trial_ends_at')
            .eq('id', user.id)
            .single()
          
          if (error) {
            console.error('[Middleware] Error fetching subscription status:', error)
            return NextResponse.redirect(new URL('/checkout', request.url))
          }
          subscriptionStatus = profile?.subscription_status
          trialEndsAt = profile?.trial_ends_at
        } else {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('subscription_status, trial_ends_at')
            .eq('id', user.id)
            .single()
          
          if (error) {
            console.error('[Middleware] Error fetching subscription status:', error)
            return NextResponse.redirect(new URL('/checkout', request.url))
          }
          subscriptionStatus = profile?.subscription_status
          trialEndsAt = profile?.trial_ends_at
        }

        // Check if trial is active (trial_ends_at is in the future)
        const isTrialActive = trialEndsAt && new Date(trialEndsAt) > new Date()

        // Allow access if subscription is active OR trial is active
        if (!hasSubscriptionAccess(subscriptionStatus) && !isTrialActive) {
          return NextResponse.redirect(new URL('/checkout', request.url))
        }
      } catch (error) {
        console.error('[Middleware] Subscription check failed:', error)
        return NextResponse.redirect(new URL('/checkout', request.url))
      }

      // 4b. Check for active profile
      try {
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        let hasProfiles = false

        if (serviceRoleKey) {
          const adminClient = createClient(supabaseUrl, serviceRoleKey)
          const { count, error } = await adminClient
            .from('student_profiles')
            .select('id', { count: 'exact', head: true })
            .eq('owner_id', user.id)
          
          if (error) {
            console.error('[Middleware] Error checking profiles:', error)
            return NextResponse.redirect(new URL('/profiles', request.url))
          }
          hasProfiles = (count || 0) > 0
        } else {
          const { data, error } = await supabase
            .from('student_profiles')
            .select('id')
            .eq('owner_id', user.id)
            .limit(1)
          
          if (error) {
            console.error('[Middleware] Error checking profiles:', error)
            return NextResponse.redirect(new URL('/profiles', request.url))
          }
          hasProfiles = (data || []).length > 0
        }

        if (!hasProfiles) {
          return NextResponse.redirect(new URL('/profiles', request.url))
        }
      } catch (error) {
        console.error('[Middleware] Profile check failed:', error)
        return NextResponse.redirect(new URL('/profiles', request.url))
      }

      // All checks passed, allow access
      return response
    }

    // 5. All other routes (default allow for authenticated users)
    // Add cache control headers for login, signup, and landing pages
    if (pathname === '/login' || pathname === '/signup' || pathname === '/') {
      response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0')
      response.headers.set('Pragma', 'no-cache')
      response.headers.set('Expires', '0')
      response.headers.set('X-Cache-Control', 'no-cache')
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

