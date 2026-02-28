/**
 * Gemini Flash Prompt Builders
 * 
 * Constructs strict, directive prompts for Gemini 1.5 Flash.
 * Prevents conversational drift by enforcing JSON output format.
 */

interface ProofEvent {
  concept: string;
  transcript_excerpt: string;
  student_analogy?: string;
  timestamp: string;
}

/**
 * Build interrogator prompt for question generation
 * 
 * Creates a strict prompt that:
 * - References student's historical learning context
 * - Generates exactly ONE active recall question
 * - Enforces JSON output format
 * - Prevents conversational drift
 * 
 * @param topicTitle - Title of the Ghost Node topic
 * @param proofEvents - Historical learning context from proof_events table
 * @returns Prompt string for Gemini Flash
 */
export function buildFlashInterrogatorPrompt(
  topicTitle: string,
  proofEvents: ProofEvent[]
): string {
  const proofContext = proofEvents
    .map(event => {
      const analogy = event.student_analogy 
        ? `\n  Student's Analogy: "${event.student_analogy}"`
        : '';
      return `- ${event.concept}${analogy}\n  Context: "${event.transcript_excerpt}"`;
    })
    .join('\n\n');

  return `You are a memory retention interrogator for The Vault spaced-repetition system.

TOPIC: ${topicTitle}

HISTORICAL LEARNING CONTEXT:
${proofContext}

YOUR TASK:
1. Generate EXACTLY ONE active recall question that tests whether the student still remembers this topic
2. The question MUST reference the student's original learning context (their analogies, examples, or synthesis)
3. The question should be answerable in 1-2 sentences
4. DO NOT engage in conversation, teaching, or follow-up questions

QUESTION DESIGN PRINCIPLES:
- Use the student's own words/analogies from their learning history
- Test conceptual understanding, not rote memorization
- Make it personal to their learning journey
- Keep it concise (one sentence question)

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "question": "Your active recall question here",
  "context_reference": "Brief note about which historical learning event you're referencing"
}

Generate the question now.`;
}

/**
 * Build evaluator prompt for answer assessment
 * 
 * Creates a strict prompt that:
 * - Evaluates student's answer against original learning context
 * - Returns binary pass/fail with brief feedback
 * - Enforces JSON output format
 * - Prevents conversational drift
 * 
 * @param question - The question that was asked
 * @param studentAnswer - Student's response
 * @param topicTitle - Title of the topic
 * @param proofEvents - Historical learning context
 * @returns Prompt string for Gemini Flash
 */
export function buildFlashEvaluatorPrompt(
  question: string,
  studentAnswer: string,
  topicTitle: string,
  proofEvents: Array<{
    concept: string;
    transcript_excerpt: string;
    student_analogy?: string;
  }>
): string {
  const proofContext = proofEvents
    .map(event => {
      const analogy = event.student_analogy 
        ? ` (Student's analogy: "${event.student_analogy}")`
        : '';
      return `- ${event.concept}${analogy}`;
    })
    .join('\n');

  return `You are evaluating a student's memory retention for The Vault spaced-repetition system.

TOPIC: ${topicTitle}

ORIGINAL LEARNING CONTEXT:
${proofContext}

QUESTION ASKED:
"${question}"

STUDENT'S ANSWER:
"${studentAnswer}"

YOUR TASK:
Determine if the student demonstrates sufficient recall of the core concept.

EVALUATION CRITERIA:
- Did they demonstrate understanding of the key concept?
- Did they reference relevant details from their original learning?
- Is their answer coherent and on-topic?
- Minor wording differences are acceptable (test understanding, not exact phrasing)

IMPORTANT:
- Be generous with partial credit (this is memory retention, not perfection)
- If they show they remember the core idea, mark as passed
- Only fail if they clearly don't remember or are completely off-topic

OUTPUT FORMAT:
Return a JSON object with this exact structure:
{
  "passed_recall": true or false,
  "brief_feedback": "One sentence explaining your evaluation"
}

Evaluate now.`;
}
