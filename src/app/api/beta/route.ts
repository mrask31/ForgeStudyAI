import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

/**
 * GET /api/beta
 * Returns beta spots remaining (public — no auth required).
 */
export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ spotsRemaining: 0, total: 20 })
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { count } = await supabase
      .from('beta_access')
      .select('*', { count: 'exact', head: true })
      .eq('is_beta', true)

    const spotsRemaining = Math.max(0, 20 - (count ?? 0))
    return NextResponse.json({ spotsRemaining, total: 20 })
  } catch {
    return NextResponse.json({ spotsRemaining: 0, total: 20 })
  }
}
