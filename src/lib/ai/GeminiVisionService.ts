/**
 * GeminiVisionService - Image Processing with Gemini Pro Vision
 * 
 * Processes student-uploaded images to extract text, mathematical formulas,
 * and diagrams as clean Markdown content.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 4.3, 4.4, 4.5, 7.1-7.5, 8.1, 8.3
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import type { 
  VisionProcessingResult, 
  ImageMetadata 
} from '@/types/dual-ai-orchestration';

// Vision extraction prompt template
const VISION_EXTRACTION_PROMPT = `
You are an expert OCR system specialized in extracting educational content from student homework images.

Extract ALL content from this image and format it as clean Markdown:

1. **Text Content**: Extract all readable text as standard Markdown paragraphs
2. **Mathematical Formulas**: Format using LaTeX syntax within code blocks:
   - Inline math: \`$formula$\`
   - Block math: \`\`\`latex
$formula$
\`\`\`
3. **Diagrams and Figures**: Describe spatial relationships and structure:
   - Use ASCII art for simple diagrams
   - Provide detailed textual descriptions for complex diagrams
   - Preserve labels, arrows, and annotations
4. **Document Structure**: Maintain logical organization:
   - Use headings (##, ###) for sections
   - Preserve lists and numbering
   - Keep question/answer formatting

**Quality Standards:**
- Be precise and complete - don't skip content
- Preserve the original meaning and structure
- Use proper Markdown syntax
- Format formulas correctly for rendering

Return ONLY the Markdown content, no explanations or metadata.
`;

export class GeminiVisionService {
  private model;
  private readonly SUPPORTED_FORMATS = [
    'image/jpeg',
    'image/jpg', 
    'image/png', 
    'image/webp', 
    'image/heic',
    'image/heif'
  ];
  private readonly MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

  constructor(apiKey: string) {
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: 'gemini-1.5-pro',
      generationConfig: {
        temperature: 0.2, // Low for consistent OCR
        maxOutputTokens: 4096,
      },
    });
  }

  /**
   * Process an uploaded image and extract content as Markdown
   * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 7.5
   */
  async processImage(metadata: ImageMetadata): Promise<VisionProcessingResult> {
    const startTime = Date.now();

    try {
      // Validate format
      if (!this.validateImageFormat(metadata.mime_type)) {
        return {
          success: false,
          error_message: `Unsupported image format: ${metadata.mime_type}. Supported formats: JPEG, PNG, WebP, HEIC`,
        };
      }

      // Read image file from Supabase Storage
      const supabase = await createClient();
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('uploads')
        .download(metadata.file_path);

      if (downloadError || !fileData) {
        return {
          success: false,
          error_message: `Failed to read image file: ${downloadError?.message || 'File not found'}`,
        };
      }

      // Validate file size
      if (fileData.size > this.MAX_FILE_SIZE) {
        return {
          success: false,
          error_message: `Image file too large: ${(fileData.size / 1024 / 1024).toFixed(2)}MB. Maximum size: 20MB`,
        };
      }

      // Convert blob to base64
      const arrayBuffer = await fileData.arrayBuffer();
      const base64Data = Buffer.from(arrayBuffer).toString('base64');

      // Build multimodal API request
      const imagePart = {
        inlineData: {
          data: base64Data,
          mimeType: metadata.mime_type,
        },
      };

      // Call Gemini API
      const result = await this.model.generateContent([
        VISION_EXTRACTION_PROMPT,
        imagePart,
      ]);

      const response = result.response;
      const rawContent = response.text();

      if (!rawContent || rawContent.trim().length === 0) {
        return {
          success: false,
          error_message: 'Gemini returned empty content. Image may be unreadable or corrupted.',
        };
      }

      // Format as clean Markdown
      const markdownContent = this.formatAsMarkdown(rawContent);

      // Count tokens (approximate)
      const tokenCount = this.estimateTokenCount(markdownContent);

      const processingTime = Date.now() - startTime;

      return {
        success: true,
        markdown_content: markdownContent,
        token_count: tokenCount,
        processing_time_ms: processingTime,
      };

    } catch (error: any) {
      const processingTime = Date.now() - startTime;
      
      // Handle specific API errors
      if (error.message?.includes('API key')) {
        return {
          success: false,
          error_message: 'Gemini API key is invalid or missing',
          processing_time_ms: processingTime,
        };
      }

      if (error.message?.includes('quota') || error.message?.includes('rate limit')) {
        return {
          success: false,
          error_message: 'Gemini API rate limit exceeded. Please try again later.',
          processing_time_ms: processingTime,
        };
      }

      return {
        success: false,
        error_message: `Image processing failed: ${error.message || 'Unknown error'}`,
        processing_time_ms: processingTime,
      };
    }
  }

  /**
   * Validate image format before processing
   * Requirements: 1.7, 8.1, 8.3
   */
  validateImageFormat(mimeType: string): boolean {
    return this.SUPPORTED_FORMATS.includes(mimeType.toLowerCase());
  }

  /**
   * Validate image size
   * Requirements: 1.7, 8.3
   */
  validateImageSize(fileSize: number): boolean {
    return fileSize > 0 && fileSize <= this.MAX_FILE_SIZE;
  }

  /**
   * Format Gemini response as clean Markdown
   * Requirements: 1.4, 7.5
   */
  private formatAsMarkdown(rawContent: string): string {
    // Clean up any markdown artifacts
    let cleaned = rawContent.trim();

    // Remove any leading/trailing markdown code blocks if Gemini wrapped the response
    if (cleaned.startsWith('```markdown')) {
      cleaned = cleaned.replace(/^```markdown\n/, '').replace(/\n```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\n/, '').replace(/\n```$/, '');
    }

    // Ensure proper spacing around headings
    cleaned = cleaned.replace(/\n(#{1,6}\s)/g, '\n\n$1');

    // Ensure proper spacing around code blocks
    cleaned = cleaned.replace(/\n(```)/g, '\n\n$1');

    return cleaned.trim();
  }

  /**
   * Estimate token count for cost tracking
   * Requirements: 1.5, 10.1, 10.2
   */
  private estimateTokenCount(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    // This is approximate; actual token count may vary
    return Math.ceil(text.length / 4);
  }

  /**
   * Save processed content to database and update manual_uploads status
   * Requirements: 1.6, 4.3, 4.4, 4.5
   */
  async saveProcessedContent(
    metadata: ImageMetadata,
    result: VisionProcessingResult
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const supabase = await createClient();

      if (result.success && result.markdown_content) {
        // Insert parsed_content record
        const { error: insertError } = await supabase
          .from('parsed_content')
          .insert({
            manual_upload_id: metadata.upload_id,
            student_id: metadata.student_id,
            markdown_content: result.markdown_content,
            token_count: result.token_count,
            processing_status: 'completed',
            gemini_model_version: 'gemini-1.5-pro',
            processing_time_ms: result.processing_time_ms,
          });

        if (insertError) {
          throw new Error(`Failed to save parsed content: ${insertError.message}`);
        }

        // Update manual_uploads status to 'processed'
        const { error: updateError } = await supabase
          .from('manual_uploads')
          .update({ 
            updated_at: new Date().toISOString()
          })
          .eq('id', metadata.upload_id);

        if (updateError) {
          console.error('Failed to update manual_uploads status:', updateError);
          // Don't fail the entire operation if status update fails
        }

        return { success: true };

      } else {
        // Save error to parsed_content
        const { error: insertError } = await supabase
          .from('parsed_content')
          .insert({
            manual_upload_id: metadata.upload_id,
            student_id: metadata.student_id,
            markdown_content: '',
            processing_status: 'failed',
            error_message: result.error_message,
            gemini_model_version: 'gemini-1.5-pro',
            processing_time_ms: result.processing_time_ms,
          });

        if (insertError) {
          throw new Error(`Failed to save error record: ${insertError.message}`);
        }

        return { 
          success: false, 
          error: result.error_message 
        };
      }

    } catch (error: any) {
      console.error('Database operation failed:', error);
      return {
        success: false,
        error: error.message || 'Database operation failed',
      };
    }
  }
}
