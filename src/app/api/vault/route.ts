import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/vault
 * Returns the authenticated user's vault documents (source='vault'),
 * grouped by file_key, with status derived from chunk presence.
 */
export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: rows, error } = await supabase
      .from('documents')
      .select('id, file_key, metadata, created_at, document_type')
      .eq('user_id', user.id)
      .eq('metadata->>source', 'vault')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Vault API] Query error:', error)
      return NextResponse.json({ error: 'Failed to load vault documents' }, { status: 500 })
    }

    if (!rows || rows.length === 0) {
      return NextResponse.json({ documents: [] })
    }

    // Group by file_key
    const byKey = new Map<string, any>()
    for (const row of rows) {
      const key = row.file_key
      if (!key) continue
      const existing = byKey.get(key)
      const filename =
        row.metadata?.filename ??
        existing?.filename ??
        (key.split(':').length > 1 ? key.split(':')[1] : 'Untitled')
      const createdAt =
        existing?.created_at && new Date(existing.created_at) < new Date(row.created_at)
          ? existing.created_at
          : row.created_at
      byKey.set(key, {
        file_key: key,
        filename,
        created_at: createdAt,
        chunk_count: (existing?.chunk_count ?? 0) + 1,
      })
    }

    const documents = Array.from(byKey.values()).map((doc) => ({
      ...doc,
      status: 'ready' as const,
    }))

    return NextResponse.json({ documents })
  } catch (error: any) {
    console.error('[Vault API] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/vault
 * Body: { filename: string }
 * Deletes all document chunks for the given filename (source='vault').
 */
export async function DELETE(req: Request) {
  try {
    const { filename } = await req.json()
    if (!filename) {
      return NextResponse.json({ error: 'filename is required' }, { status: 400 })
    }

    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('user_id', user.id)
      .eq('metadata->>filename', filename)
      .eq('metadata->>source', 'vault')

    if (error) {
      console.error('[Vault API] Delete error:', error)
      return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('[Vault API] Delete error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
