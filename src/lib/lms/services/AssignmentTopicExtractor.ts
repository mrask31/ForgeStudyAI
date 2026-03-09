/**
 * Assignment Topic Extractor
 * 
 * Uses Claude Haiku to extract clean study topic information from LMS assignments.
 * Converts raw assignment data into structured topic metadata for Galaxy nodes.
 */

import Anthropic from '@anthropic-ai/sdk';

export interface ExtractedTopic {
  topic_name: string;
  description: string;
  subject: string;
  key_concepts: string[];
}

export class AssignmentTopicExtractor {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey,
    });
  }

  /**
   * Extract structured topic information from assignment data
   * 
   * @param title Assignment title
   * @param description Assignment description (may be null)
   * @param courseName Course name
   * @returns Extracted topic metadata
   */
  async extractTopic(
    title: string,
    description: string | null,
    courseName: string
  ): Promise<ExtractedTopic> {
    const userPrompt = `Assignment title: ${title}
Assignment description: ${description || 'No description provided'}
Course: ${courseName}`;

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 500,
        system: `You are an educational content organizer. Extract a clean study topic from this assignment.
Respond in JSON only with this exact structure:
{
  "topic_name": "A concise, clear topic name (2-6 words)",
  "description": "A brief description of what the student will learn (1-2 sentences)",
  "subject": "The academic subject (e.g., Math, Science, History, English, etc.)",
  "key_concepts": ["concept1", "concept2", "concept3"]
}

Rules:
- topic_name should be student-friendly and specific
- description should focus on learning outcomes
- subject should be a standard academic category
- key_concepts should be 2-5 core ideas from the assignment`,
        messages: [
          {
            role: 'user',
            content: userPrompt,
          },
        ],
      });

      // Extract JSON from response
      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      // Parse JSON response
      const extracted = JSON.parse(content.text) as ExtractedTopic;

      // Validate required fields
      if (!extracted.topic_name || !extracted.description || !extracted.subject) {
        throw new Error('Missing required fields in AI response');
      }

      // Ensure key_concepts is an array
      if (!Array.isArray(extracted.key_concepts)) {
        extracted.key_concepts = [];
      }

      console.log('[TopicExtractor] Successfully extracted topic:', {
        topic_name: extracted.topic_name,
        subject: extracted.subject,
      });

      return extracted;
    } catch (error: any) {
      console.error('[TopicExtractor] Error extracting topic:', error);

      // Fallback: use assignment title as topic name
      return {
        topic_name: title.substring(0, 100), // Limit length
        description: description || `Study materials for ${courseName}`,
        subject: courseName,
        key_concepts: [],
      };
    }
  }
}
