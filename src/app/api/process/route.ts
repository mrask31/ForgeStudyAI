import { NextResponse } from 'next/server';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = 'nodejs'; 

export async function POST(req: Request) {
  try {
    // 1. Get Text & Metadata
    // Note: File type validation and text extraction happen in the frontend
    // This endpoint accepts pre-extracted text from PDF or DOCX files
    let { text, filename, document_type, class_id } = await req.json();
    
    // Auto-tagging: If document_type not provided, infer from filename
    if (!document_type && filename) {
      const filenameLower = filename.toLowerCase();
      if (filenameLower.includes('syllabus') || filenameLower.includes('schedule')) {
        document_type = 'syllabus';
      } else {
        document_type = 'textbook'; // Default to textbook for non-syllabus files
      }
    }
    
    // Fallback to 'textbook' if still not set
    if (!document_type) {
      document_type = 'textbook';
    }

    if (!text) {
      console.error("[API] No text provided");
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    // 2. Auth Check (WITH DEV BYPASS)
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) { return cookieStore.get(name)?.value },
          set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }) },
          remove(name: string, options: CookieOptions) { cookieStore.delete({ name, ...options }) },
        },
      }
    );

    // 2. Get the User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error("[API] Authentication required for document upload", authError);
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (!user.id) {
      console.error("[API] User ID is missing");
      return NextResponse.json({ error: "Invalid user session" }, { status: 401 });
    }

    console.log(`[API] Processing ${text.length} chars for User: ${user.id}`);

    // 3. Chunk Text
    // Split by double newlines or periods to get reasonable chunks
    const rawChunks = text.split(/\n\s*\n/);
    const chunks = rawChunks
        .filter((chunk: string) => chunk.length > 50) 
        .map((chunk: string) => chunk.trim());

    console.log(`[API] Generated ${chunks.length} chunks. Embedding now...`);

    // 4. Generate file_key for this upload (durable file-level identifier)
    // Format: user_id:filename:date (YYYY-MM-DD)
    // This groups all chunks from the same file upload together
    const uploadDate = new Date().toISOString().split('T')[0] // YYYY-MM-DD
    const fileKey = `${user.id}:${filename}:${uploadDate}`

    // 5. Embed & Save
    // We process in batches to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        
        await Promise.all(batch.map(async (chunk: string, chunkIndex: number) => {
            const embeddingResponse = await openai.embeddings.create({
                model: 'text-embedding-3-small', 
                input: chunk,
            });
            const embedding = embeddingResponse.data[0].embedding;

            // Insert with explicit user_id - CRITICAL for RLS and filtering
            const metadata: any = { 
                filename: filename,
                is_active: true  // Default to active (included in AI context)
            }
            
            // Add class_id to metadata if provided
            if (class_id) {
                metadata.class_id = class_id
                console.log(`[API Process] Adding class_id to metadata: ${class_id} for file: ${filename}`)
            } else {
                console.log(`[API Process] No class_id provided for file: ${filename}`)
            }
            
            // Log metadata for first chunk of each file
            if (i === 0 && chunkIndex === 0) {
                console.log(`[API Process] Metadata for first chunk:`, JSON.stringify(metadata, null, 2))
            }
            
            const { data: insertData, error: insertError } = await supabase
                .from('documents')
                .insert({
                    content: chunk,
                    metadata: metadata,
                    embedding: embedding,
                    user_id: user.id, // CRITICAL: Must be set for Binder API to find files
                    document_type: document_type, // Can be 'note', 'syllabus', 'textbook', or 'reference'
                    file_key: fileKey  // Durable file-level identifier for grouping chunks
                })
                .select('id, user_id, document_type, file_key')
                .single();
            
            if (insertError) {
                console.error(`[API] Failed to insert chunk ${i + chunkIndex}:`, insertError);
                throw new Error(`Failed to save chunk: ${insertError.message}`);
            }
            
            // Verify user_id was saved
            if (insertData && insertData.user_id !== user.id) {
                console.error(`[API] WARNING: user_id mismatch! Expected ${user.id}, got ${insertData.user_id}`);
            }
            
            // Log document_type for debugging (only for first chunk)
            if (i === 0 && chunkIndex === 0) {
              console.log(`[API] Processing file "${filename}" with document_type: "${document_type}", user_id: "${user.id}"`);
              console.log(`[API] Inserted chunk with id: ${insertData?.id}, user_id: ${insertData?.user_id}`);
            }
        }));
    }

    console.log(`[API] Success! Saved ${chunks.length} chunks.`);
    return NextResponse.json({ success: true, chunks: chunks.length });

  } catch (error: any) {
    console.error("[API] Critical Error:", error);
    return NextResponse.json({ error: `Server Error: ${error.message}` }, { status: 500 });
  }
}