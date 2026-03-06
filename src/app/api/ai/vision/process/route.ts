/**
 * POST /api/ai/vision/process
 * 
 * Processes uploaded images using Gemini Pro Vision to extract content as Markdown.
 * 
 * Requirements: 1.1, 4.1, 4.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GeminiVisionService } from '@/lib/ai/GeminiVisionService';
import { visionRateLimiter } from '@/lib/ai/RateLimiter';
import { handleAPIError, retryWithBackoff, AIServiceError } from '@/lib/ai/error-handling';
import { trackAPIUsage, calculateGeminiCost } from '@/lib/ai/metrics';
import type { 
  VisionProcessRequest, 
  VisionProcessResponse 
} from '@/types/dual-ai-orchestration';

export const maxDuration = 60; // Vision processing can take time

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const body: VisionProcessRequest = await req.json();
    const { upload_id, student_id } = body;

    // Validate request
    if (!upload_id || !student_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields: upload_id and student_id',
          error_code: 'INVALID_REQUEST',
        } as VisionProcessResponse,
        { status: 400 }
      );
    }

    // Check rate limit
    const rateLimitResult = visionRateLimiter.checkLimit(student_id);
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Rate limit exceeded. Please try again in ${rateLimitResult.retryAfter} seconds.`,
          error_code: 'RATE_LIMIT',
        } as VisionProcessResponse,
        { 
          status: 429,
          headers: {
            'Retry-After': String(rateLimitResult.retryAfter),
          },
        }
      );
    }

    // Check API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Gemini API key not configured',
          error_code: 'MISSING_API_KEY',
        } as VisionProcessResponse,
        { status: 500 }
      );
    }

    // Authenticate user
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          error_code: 'UNAUTHORIZED',
        } as VisionProcessResponse,
        { status: 401 }
      );
    }

    // Verify student_id matches authenticated user
    if (user.id !== student_id) {
      return NextResponse.json(
        {
          success: false,
          error: 'Student ID does not match authenticated user',
          error_code: 'FORBIDDEN',
        } as VisionProcessResponse,
        { status: 403 }
      );
    }

    // Retrieve upload record from manual_uploads table
    const { data: upload, error: uploadError } = await supabase
      .from('manual_uploads')
      .select('id, student_id, file_path, mime_type')
      .eq('id', upload_id)
      .eq('student_id', student_id)
      .single();

    if (uploadError || !upload) {
      return NextResponse.json(
        {
          success: false,
          error: 'Upload not found',
          error_code: 'NOT_FOUND',
        } as VisionProcessResponse,
        { status: 404 }
      );
    }

    // Initialize Gemini Vision Service
    const visionService = new GeminiVisionService(apiKey);

    // Process image with retry logic
    const startTime = Date.now();
    const result = await retryWithBackoff(
      () => visionService.processImage({
        upload_id: upload.id,
        student_id: upload.student_id,
        file_path: upload.file_path,
        mime_type: upload.mime_type,
      }),
      2, // Max 2 retries
      1000 // 1 second initial delay
    );
    const latencyMs = Date.now() - startTime;

    // Track metrics
    await trackAPIUsage({
      studentId: student_id,
      serviceType: 'gemini_vision',
      operationType: 'image_processing',
      modelVersion: 'gemini-1.5-pro',
      inputTokens: result.token_count,
      outputTokens: result.token_count,
      latencyMs,
      estimatedCostUsd: result.token_count ? calculateGeminiCost(result.token_count, result.token_count) : undefined,
      success: result.success,
      errorMessage: result.error_message,
    });

    // Save processed content to database
    const saveResult = await visionService.saveProcessedContent(
      {
        upload_id: upload.id,
        student_id: upload.student_id,
        file_path: upload.file_path,
        mime_type: upload.mime_type,
      },
      result
    );

    if (!saveResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: saveResult.error || 'Failed to save processed content',
          error_code: 'DATABASE_ERROR',
        } as VisionProcessResponse,
        { status: 500 }
      );
    }

    // Get the parsed_content_id from database
    let parsed_content_id: string | undefined;
    if (result.success) {
      const { data: parsedContent } = await supabase
        .from('parsed_content')
        .select('id')
        .eq('manual_upload_id', upload_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      parsed_content_id = parsedContent?.id;
    }

    // Return result
    return NextResponse.json({
      success: result.success,
      parsed_content_id,
      markdown_content: result.markdown_content,
      token_count: result.token_count,
      processing_time_ms: result.processing_time_ms,
      error: result.error_message,
      error_code: result.success ? undefined : 'PROCESSING_FAILED',
    } as VisionProcessResponse);

  } catch (error: any) {
    console.error('[Vision API] Error:', error);

    // Handle AI service errors
    if (error instanceof AIServiceError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          error_code: error.code,
        } as VisionProcessResponse,
        { status: error.statusCode }
      );
    }

    // Handle unknown errors
    const aiError = handleAPIError(error, 'gemini');
    return NextResponse.json(
      {
        success: false,
        error: aiError.message,
        error_code: aiError.code,
      } as VisionProcessResponse,
      { status: aiError.statusCode }
    );
  }
}
