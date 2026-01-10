import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set(name, value, options)
          },
          remove(name: string, options: any) {
            cookieStore.delete({ name, ...options })
          },
        },
      }
    )

    // 1. Authenticate user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. Parse request body
    const body = await req.json()
    const { documentIds } = body

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return NextResponse.json({ filenames: [] })
    }

    // 3. Fetch documents to get filenames
    // Since documents are stored as chunks, we need to get unique filenames
    const { data: documents, error } = await supabase
      .from('documents')
      .select('id, metadata')
      .eq('user_id', user.id)
      .in('id', documentIds)

    if (error) {
      console.error('[Filenames] Fetch error:', error)
      return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 })
    }

    // 4. Extract unique filenames by document ID
    const filenameMap = new Map<string, string>()
    documents?.forEach((doc: any) => {
      const filename = doc.metadata?.filename || 'Untitled'
      if (!filenameMap.has(doc.id)) {
        filenameMap.set(doc.id, filename)
      }
    })

    // 5. Return filenames in order of requested IDs
    const filenames = documentIds.map((id: string) => filenameMap.get(id) || 'Untitled')

    return NextResponse.json({ filenames })
  } catch (error: any) {
    console.error('[Filenames] Critical error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

