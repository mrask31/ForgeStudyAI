import { createClient } from '@/lib/supabase/server';
import type { SourceMaterial } from '@/types/dual-ai-orchestration';

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
 * Build source material from parsed content
 */
export async function buildSourceMaterial(
  parsedContentId?: string,
  _assignmentId?: string
): Promise<SourceMaterial> {
  const sourceMaterial: SourceMaterial = {};

  if (parsedContentId) {
    const parsedContent = await getParsedContent(parsedContentId);
    if (parsedContent) {
      sourceMaterial.parsed_content = parsedContent;
    }
  }

  return sourceMaterial;
}
