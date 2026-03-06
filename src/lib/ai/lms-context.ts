/**
 * LMS Context Retrieval
 * Requirements: 5.1, 5.2, 5.3, 5.4
 * 
 * Helper functions to retrieve LMS data for AI context.
 */

import { createClient } from '@/lib/supabase/server';
import type { SourceMaterial } from '@/types/dual-ai-orchestration';

/**
 * Get LMS context for a specific assignment
 */
export async function getLMSContext(assignmentId: string): Promise<SourceMaterial> {
  const supabase = await createClient();

  const { data: assignment, error } = await supabase
    .from('synced_assignments')
    .select('assignment_description, teacher_rubric, pdf_content')
    .eq('id', assignmentId)
    .single();

  if (error || !assignment) {
    console.warn('[LMS Context] Assignment not found:', assignmentId);
    return {};
  }

  return {
    assignment_description: assignment.assignment_description || undefined,
    teacher_rubric: assignment.teacher_rubric || undefined,
    pdf_text: assignment.pdf_content || undefined,
  };
}

/**
 * Get parsed content from manual upload
 */
export async function getParsedContent(parsedContentId: string): Promise<string | undefined> {
  const supabase = await createClient();

  const { data: parsed, error } = await supabase
    .from('parsed_content')
    .select('markdown_content')
    .eq('id', parsedContentId)
    .single();

  if (error || !parsed) {
    console.warn('[LMS Context] Parsed content not found:', parsedContentId);
    return undefined;
  }

  return parsed.markdown_content;
}

/**
 * Build complete source material from multiple sources
 */
export async function buildSourceMaterial(
  parsedContentId?: string,
  assignmentId?: string
): Promise<SourceMaterial> {
  const sourceMaterial: SourceMaterial = {};

  // Get parsed content if available
  if (parsedContentId) {
    const parsedContent = await getParsedContent(parsedContentId);
    if (parsedContent) {
      sourceMaterial.parsed_content = parsedContent;
    }
  }

  // Get LMS data if available
  if (assignmentId) {
    const lmsContext = await getLMSContext(assignmentId);
    Object.assign(sourceMaterial, lmsContext);
  }

  return sourceMaterial;
}
