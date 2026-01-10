import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/binder
 * Returns authenticated user's documents grouped by filename
 * SECURITY: Enforced by RLS and user_id filtering
 * 
 * Query params:
 * - type: 'note' | 'reference' | 'syllabus' | 'textbook' | undefined (defaults to all)
 */
export async function GET(req: Request) {
  try {
    const supabase = createClient()
    const { searchParams } = new URL(req.url)
    const typeParam = searchParams.get('type') // 'syllabus' | 'textbook' | 'note' | 'all' | null

    console.log('[Binder API] Incoming query:', { type: typeParam ?? 'all' })

    // 1. Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // STEP 2: Raw dump query to debug - see what's actually in the table
    const { data: rawChunks, error: rawError } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)

    console.log('[Binder API] RAW CHUNKS SAMPLE:', { 
      count: rawChunks?.length ?? 0, 
      rows: rawChunks?.map(r => ({
        id: r.id,
        file_key: r.file_key,
        user_id: r.user_id,
        document_type: r.document_type,
        metadata: r.metadata,
        has_is_active_in_metadata: r.metadata?.is_active !== undefined,
        is_active_value: r.metadata?.is_active
      }))
    })

    if (rawError) {
      console.error('[Binder API] Raw chunks debug error:', rawError)
    }

    // 2. Load all chunks for this user from the SAME table that /api/process writes to
    // The 'documents' table stores ONE ROW PER CHUNK, grouped by file_key
    // NOTE: is_active is stored in metadata.is_active, NOT as a direct column
    const { data: chunkRows, error } = await supabase
      .from('documents')
      .select('id, file_key, metadata, created_at, document_type, user_id')
      .eq('user_id', user.id)
      // Remove .eq('is_active', true) - is_active is in metadata, not a column
      // If we need to filter by is_active, we'd need to filter client-side after fetching
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[Binder API] Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to load binder documents' },
        { status: 500 }
      )
    }

    if (!chunkRows || chunkRows.length === 0) {
      console.log('[Binder API] No chunks found for user:', user.id)
      console.log('[Binder API] Debug: Raw chunks count was:', rawChunks?.length ?? 0)
      if (rawChunks && rawChunks.length > 0) {
        console.log('[Binder API] Debug: Sample raw chunk user_id:', rawChunks[0]?.user_id)
        console.log('[Binder API] Debug: Query user_id:', user.id)
        console.log('[Binder API] Debug: User IDs match?', rawChunks[0]?.user_id === user.id)
      }
      return NextResponse.json({ files: [] })
    }

    console.log('[Binder API] Found chunks:', { count: chunkRows.length, sample: chunkRows[0] })
    
    // Filter by is_active if needed (stored in metadata.is_active)
    const activeChunks = chunkRows.filter((row: any) => {
      // Default to true if is_active is not set (backward compatibility)
      return row.metadata?.is_active !== false
    })
    
    console.log('[Binder API] Active chunks after filtering:', { 
      total: chunkRows.length, 
      active: activeChunks.length 
    })

    // 3. Group by file_key → one logical file per file_key
    const filesByKey = new Map<string, any>()

    for (const row of activeChunks) {
      const key = row.file_key
      if (!key) {
        console.warn('[Binder API] Skipping row with no file_key:', row.id)
        continue
      }

      const existing = filesByKey.get(key)

      // Extract filename from metadata or file_key
      const filename =
        row.metadata?.filename ??
        existing?.filename ??
        (key.split(':').length > 1 ? key.split(':')[1] : null) ??
        'Untitled file'

      // Prefer explicit document_type from row (if present), otherwise use existing
      const documentType =
        row.document_type ??
        row.metadata?.document_type ??
        existing?.document_type ??
        null

      // Use earliest created_at (first chunk uploaded)
      const createdAt =
        existing?.created_at && new Date(existing.created_at) < new Date(row.created_at)
          ? existing.created_at
          : row.created_at

      // Collect chunk IDs
      const chunkIds = existing?.chunkIds || []
      if (!chunkIds.includes(String(row.id))) {
        chunkIds.push(String(row.id))
      }

      // Merge metadata to ensure class_id is preserved (it should be in all chunks, but merge to be safe)
      const mergedMetadata = {
        ...(existing?.metadata || {}),
        ...(row.metadata || {}),
        // Preserve class_id from either source
        class_id: row.metadata?.class_id || existing?.metadata?.class_id || row.metadata?.classId || existing?.metadata?.classId,
        // Preserve filename
        filename: row.metadata?.filename || existing?.metadata?.filename || filename,
        // Preserve is_active (default to true)
        is_active: row.metadata?.is_active !== undefined ? row.metadata.is_active : (existing?.metadata?.is_active !== undefined ? existing.metadata.is_active : true)
      }

      const baseFile = {
        id: existing?.id ?? row.id, // Use first chunk's ID as representative
        file_key: key,
        filename,
        document_type: documentType, // 'syllabus' | 'textbook' | 'note' | 'reference' | null
        created_at: createdAt,
        chunk_count: chunkIds.length,
        metadata: mergedMetadata,
        chunkIds: chunkIds
      }

      filesByKey.set(key, baseFile)
    }

    let files = Array.from(filesByKey.values())

    console.log('[Binder API] Grouped into files:', { count: files.length })
    if (files.length > 0) {
      console.log('[Binder API] Sample file metadata:', {
        filename: files[0].filename,
        metadata: files[0].metadata,
        class_id: files[0].metadata?.class_id,
        classId: files[0].metadata?.classId,
        document_type: files[0].document_type
      })
    }

    // 4. Apply type filter (client-side filtering after grouping)
    const type = typeParam === 'all' || !typeParam ? null : typeParam

    if (type === 'note') {
      files = files.filter((f) => f.document_type === 'note')
    } else if (type === 'syllabus') {
      files = files.filter((f) => f.document_type === 'syllabus')
    } else if (type === 'textbook' || type === 'reference' || type === 'library') {
      files = files.filter(
        (f) =>
          f.document_type === 'textbook' ||
          f.document_type === 'reference' ||
          f.document_type == null
      )
    }
    // type null or 'all' → keep all files

    // 5. Format response with canonicalId for backward compatibility
    const formattedFiles = files.map(file => ({
      canonicalId: file.chunkIds[0], // First chunk ID as canonical identifier
      id: file.id,
      filename: file.filename,
      document_type: file.document_type,
      created_at: file.created_at,
      chunk_count: file.chunk_count,
      // Preserve ALL metadata including class_id, is_active, etc.
      metadata: {
        ...file.metadata, // Preserve all original metadata (class_id, is_active, filename, etc.)
        chunkIds: file.chunkIds // Add chunkIds to metadata
      }
    }))

    console.log('[Binder API] Returning files', {
      type: type ?? 'all',
      count: formattedFiles.length,
      sample: formattedFiles[0] ? { filename: formattedFiles[0].filename, document_type: formattedFiles[0].document_type } : null
    })

    return NextResponse.json({ files: formattedFiles })
  } catch (error: any) {
    console.error('[API] Binder critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

