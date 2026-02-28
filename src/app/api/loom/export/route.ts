/**
 * GET /api/loom/export
 * 
 * Exports cryptographic proof of original thought for a completed synthesis session.
 * 
 * Returns a formatted Markdown document containing:
 * - Session UUID
 * - Hashed User ID (for privacy)
 * - Timestamp
 * - Topic Titles
 * - Final Roman Numeral Outline
 * - Cryptographic Proof of Cognition
 * - SHA-256 hash of document content
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    
    if (!sessionId) {
      return NextResponse.json(
        { error: 'Missing sessionId parameter' },
        { status: 400 }
      );
    }
    
    // Initialize Supabase client
    const supabase = createClient();
    
    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Fetch session from database
    const { data: session, error: sessionError } = await supabase
      .from('loom_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .single();
    
    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Session not found or access denied' },
        { status: 403 }
      );
    }
    
    // Verify session is completed
    if (session.status !== 'THESIS_ACHIEVED') {
      return NextResponse.json(
        { error: 'Session is not completed. Thesis must be achieved before export.' },
        { status: 400 }
      );
    }
    
    // Fetch selected topics
    const { data: topics, error: topicsError } = await supabase
      .from('study_topics')
      .select('id, title')
      .in('id', session.selected_topic_ids);
    
    if (topicsError || !topics) {
      return NextResponse.json(
        { error: 'Failed to fetch topics' },
        { status: 500 }
      );
    }
    
    // Hash user ID for privacy
    const hashedUserId = crypto
      .createHash('sha256')
      .update(user.id)
      .digest('hex')
      .slice(0, 16); // First 16 chars for readability
    
    // Format timestamp
    const timestamp = new Date(session.completed_at || session.created_at).toISOString();
    
    // Build proof document
    const documentContent = buildProofDocument({
      sessionId: session.id,
      hashedUserId,
      timestamp,
      topics: topics.map(t => t.title),
      outline: session.final_outline || 'No outline generated',
      proof: session.cryptographic_proof || 'No proof generated',
    });
    
    // Calculate SHA-256 hash of document
    const documentHash = crypto
      .createHash('sha256')
      .update(documentContent)
      .digest('hex');
    
    // Append hash to document
    const finalDocument = `${documentContent}\n\n---\n\n## Document Integrity\n\n**SHA-256 Hash:** \`${documentHash}\`\n\nThis hash can be used to verify that the document has not been tampered with. Any modification to the content above will result in a different hash value.\n`;
    
    // Return as downloadable file
    return new NextResponse(finalDocument, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="proof-of-original-thought-${sessionId.slice(0, 8)}.md"`,
      },
    });
    
  } catch (error) {
    console.error('[Export] Error processing request:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Build formatted proof document
 */
function buildProofDocument(data: {
  sessionId: string;
  hashedUserId: string;
  timestamp: string;
  topics: string[];
  outline: string;
  proof: string;
}): string {
  return `# Proof of Original Thought

## ForgeStudy Logic Loom Synthesis Engine

This document certifies that the student completed an original synthesis session using the Logic Loom Socratic dialogue engine. The synthesis was achieved through guided questioning, not direct instruction.

---

## Session Metadata

**Session ID:** \`${data.sessionId}\`

**Student ID (Hashed):** \`${data.hashedUserId}\`

**Completion Timestamp:** ${data.timestamp}

**Synthesis Date:** ${new Date(data.timestamp).toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}

---

## Synthesized Concepts

The student successfully synthesized the following mastered concepts into an original thesis:

${data.topics.map((topic, index) => `${index + 1}. **${topic}**`).join('\n')}

---

## Synthesis Outline

The following outline represents the student's original connections discovered through Socratic dialogue:

${data.outline}

---

## Cryptographic Proof of Cognition

${data.proof}

---

## Verification

This document was generated by the ForgeStudy Logic Loom Synthesis Engine, which enforces strict "Anti-Bailout" constraints:

- ❌ The AI never writes the thesis for the student
- ❌ The AI never directly states connections between concepts
- ❌ The AI never provides answers when the student asks "just tell me"
- ✅ The AI demands the student articulate connections in their own words
- ✅ The AI uses the student's past analogies to personalize questions
- ✅ The AI guides micro-connections between TWO concepts at a time
- ✅ The AI only validates thesis achievement when the student connects ALL concepts

This proof certifies that the synthesis above emerged from the student's own reasoning through guided Socratic questioning.
`;
}
