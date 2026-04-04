import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/portfolio?profileId=xxx
 * Returns all portfolio entries for a student profile.
 */
export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const profileId = searchParams.get('profileId')
    if (!profileId) {
      return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
    }

    const { data: entries, error } = await supabase
      .from('portfolio_entries')
      .select('*, student_classes(name, code)')
      .eq('profile_id', profileId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Portfolio] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch portfolio' }, { status: 500 })
    }

    return NextResponse.json({ entries: entries || [] })
  } catch (error: any) {
    console.error('[Portfolio] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/portfolio
 * Update a portfolio entry (pin, edit, etc.)
 * Body: { id, is_pinned?, title?, content? }
 */
export async function PATCH(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id, ...updates } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Missing entry id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('portfolio_entries')
      .update(updates)
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to update entry' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/portfolio
 * Delete a portfolio entry.
 * Body: { id }
 */
export async function DELETE(req: Request) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await req.json()
    if (!id) {
      return NextResponse.json({ error: 'Missing entry id' }, { status: 400 })
    }

    const { error } = await supabase
      .from('portfolio_entries')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: 'Failed to delete entry' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
