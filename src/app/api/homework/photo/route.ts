/**
 * POST /api/homework/photo
 *
 * Accepts a photo (base64 or form-data), sends to Gemini Vision,
 * extracts text/problem content, stores in parsed_content, and
 * returns the markdown for the tutor to use.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { imageBase64, mimeType, profileId } = body;

    if (!imageBase64 || !mimeType) {
      return NextResponse.json(
        { error: 'imageBase64 and mimeType are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key not configured' }, { status: 500 });
    }

    // Process with Gemini Vision
    const startTime = Date.now();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent([
      {
        inlineData: {
          mimeType,
          data: imageBase64,
        },
      },
      {
        text: `Extract ALL text and problems from this homework image. Output clean Markdown.
Rules:
- Preserve all questions, numbered items, and problem text exactly
- Use LaTeX for math expressions (e.g. $x^2 + 3x = 0$)
- Preserve any diagrams as ASCII art or describe them in brackets
- If handwritten, transcribe as accurately as possible
- Do NOT solve the problems — just extract them`,
      },
    ]);

    const processingTimeMs = Date.now() - startTime;
    const markdownContent = result.response.text();

    // Save to parsed_content
    const { data: parsed, error: insertError } = await supabase
      .from('parsed_content')
      .insert({
        student_id: user.id,
        markdown_content: markdownContent,
        processing_status: 'completed',
        gemini_model_version: 'gemini-1.5-flash',
        processing_time_ms: processingTimeMs,
        token_count: Math.ceil(markdownContent.length / 4),
      })
      .select('id')
      .single();

    if (insertError) {
      console.error('[Photo] Error saving parsed content:', insertError);
      // Still return content even if DB save fails
    }

    return NextResponse.json({
      success: true,
      markdownContent,
      parsedContentId: parsed?.id || null,
      processingTimeMs,
    });
  } catch (error: any) {
    console.error('[Photo] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process image' },
      { status: 500 }
    );
  }
}
