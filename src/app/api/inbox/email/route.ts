import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY || '');

interface EmailAttachment {
  name: string;
  content: string; // base64 encoded
  contentType: string;
  contentLength: number;
}

interface PostmarkInboundEmail {
  From: string;
  FromName: string;
  To: string;
  Subject: string;
  TextBody: string;
  HtmlBody: string;
  Attachments: EmailAttachment[];
  MessageID: string;
  Date: string;
}

/**
 * Webhook handler for Postmark Inbound Email
 * Endpoint: POST /api/inbox/email
 * 
 * This endpoint receives emails sent to {studentId}@inbox.forgestudy.app
 * and automatically processes attachments to create study materials.
 */
export async function POST(req: NextRequest) {
  try {
    // Parse the incoming email from Postmark
    const email: PostmarkInboundEmail = await req.json();
    
    console.log('[Forge Inbox] Received email:', {
      from: email.From,
      to: email.To,
      subject: email.Subject,
      attachments: email.Attachments?.length || 0,
    });

    // Extract student ID from email address (e.g., "abc12345@inbox.forgestudy.app")
    const toEmail = email.To.toLowerCase();
    const studentInboxEmail = toEmail.split(',')[0].trim(); // Handle multiple recipients
    
    // Find the student profile by inbox email
    const supabase = createClient();
    const { data: studentProfile, error: profileError } = await supabase
      .from('student_profiles')
      .select('id, owner_id, display_name')
      .eq('inbox_email', studentInboxEmail)
      .single();
    
    if (profileError || !studentProfile) {
      console.error('[Forge Inbox] Student profile not found:', studentInboxEmail);
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    console.log('[Forge Inbox] Found student profile:', {
      id: studentProfile.id,
      name: studentProfile.display_name,
    });

    // Create inbox log entry
    const { data: inboxLog, error: logError } = await supabase
      .from('inbox_logs')
      .insert({
        student_profile_id: studentProfile.id,
        from_email: email.From,
        subject: email.Subject || '(No subject)',
        received_at: email.Date || new Date().toISOString(),
        attachments_count: email.Attachments?.length || 0,
        processing_status: 'processing',
        metadata: {
          message_id: email.MessageID,
          from_name: email.FromName,
        },
      })
      .select()
      .single();

    if (logError) {
      console.error('[Forge Inbox] Failed to create inbox log:', logError);
    }

    // Process attachments
    if (!email.Attachments || email.Attachments.length === 0) {
      console.log('[Forge Inbox] No attachments to process');
      
      // Update log status
      if (inboxLog) {
        await supabase
          .from('inbox_logs')
          .update({ 
            processing_status: 'completed',
            error_message: 'No attachments found',
          })
          .eq('id', inboxLog.id);
      }
      
      return NextResponse.json({ 
        message: 'Email received but no attachments to process',
        processed: 0,
      });
    }

    let processedCount = 0;
    const errors: string[] = [];

    for (const attachment of email.Attachments) {
      try {
        console.log('[Forge Inbox] Processing attachment:', attachment.name);

        // Upload to Supabase Storage
        const fileName = `${studentProfile.id}/${Date.now()}-${attachment.name}`;
        const buffer = Buffer.from(attachment.content, 'base64');
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('inbox')
          .upload(fileName, buffer, {
            contentType: attachment.contentType,
            upsert: false,
          });

        if (uploadError) {
          console.error('[Forge Inbox] Upload failed:', uploadError);
          errors.push(`Failed to upload ${attachment.name}: ${uploadError.message}`);
          continue;
        }

        console.log('[Forge Inbox] Uploaded to storage:', uploadData.path);

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('inbox')
          .getPublicUrl(uploadData.path);

        // Use Gemini Vision to identify subject and auto-fracture into micro-missions
        const analysis = await analyzeDocument(buffer, attachment.contentType, attachment.name);
        
        console.log('[Forge Inbox] AI Analysis:', {
          subject: analysis.subject,
          microMissions: analysis.microMissions.length,
        });

        // Process micro-missions
        for (const mission of analysis.microMissions) {
          try {
            // Skip reference-only materials (save to learning_sources only, no study_topic)
            if (mission.isReferenceOnly) {
              console.log('[Forge Inbox] Skipping reference-only mission:', mission.title);
              continue;
            }

            // Create study topic with orbit_state = 0 (Quarantine/Invisible)
            // This is the core fix: automated email ingestion creates quarantined topics
            const { data: newTopic, error: topicError } = await supabase
              .from('study_topics')
              .insert({
                profile_id: studentProfile.id,
                title: mission.title,
                description: mission.context,
                grade_band: 'middle', // Default to middle school
                mastery_score: 0,
                orbit_state: 0, // CRITICAL: Quarantine automated ingestion
                metadata: {
                  source: 'email',
                  created_from_email: email.From,
                  subject: analysis.subject,
                  estimated_minutes: mission.estimatedMinutes,
                  original_file: attachment.name,
                },
              })
              .select()
              .single();

            if (topicError) {
              console.error('[Forge Inbox] Failed to create topic:', topicError);
              errors.push(`Failed to create topic for ${mission.title}`);
              continue;
            }

            console.log('[Forge Inbox] Created quarantined topic:', {
              id: newTopic.id,
              title: newTopic.title,
              orbit_state: newTopic.orbit_state,
            });

            processedCount++;

          } catch (missionError: any) {
            console.error('[Forge Inbox] Error processing mission:', missionError);
            errors.push(`Error processing mission ${mission.title}: ${missionError.message}`);
          }
        }

        // Create learning source for the original file
        const { data: learningSource, error: sourceError } = await supabase
          .from('learning_sources')
          .insert({
            user_id: studentProfile.owner_id,
            profile_id: studentProfile.id,
            source_type: 'email',
            title: analysis.subject || attachment.name,
            description: `Received via email from ${email.FromName || email.From}`,
            metadata: {
              from: email.From,
              from_name: email.FromName,
              subject: email.Subject,
              received_at: email.Date,
              file_name: attachment.name,
              file_url: urlData.publicUrl,
              ai_analysis: {
                subject: analysis.subject,
                concepts: analysis.concepts,
                micro_missions_count: analysis.microMissions.length,
              },
            },
          })
          .select()
          .single();

        if (sourceError) {
          console.error('[Forge Inbox] Failed to create learning source:', sourceError);
          errors.push(`Failed to create source for ${attachment.name}`);
          continue;
        }

        // Create learning source item
        const { error: itemError } = await supabase
          .from('learning_source_items')
          .insert({
            source_id: learningSource.id,
            item_type: 'file',
            file_url: urlData.publicUrl,
            mime_type: attachment.contentType,
            original_filename: attachment.name,
            extracted_text: analysis.extractedText || null,
            metadata: {
              file_size: attachment.contentLength,
              storage_path: uploadData.path,
              ai_subject: analysis.subject,
              ai_concepts: analysis.concepts,
              micro_missions: analysis.microMissions,
            },
          });

        if (itemError) {
          console.error('[Forge Inbox] Failed to create source item:', itemError);
          errors.push(`Failed to create item for ${attachment.name}`);
          continue;
        }

        console.log('[Forge Inbox] Successfully processed:', attachment.name);

      } catch (error: any) {
        console.error('[Forge Inbox] Error processing attachment:', error);
        errors.push(`Error processing ${attachment.name}: ${error.message}`);
      }
    }

    // Update inbox log with final status
    if (inboxLog) {
      await supabase
        .from('inbox_logs')
        .update({
          processing_status: errors.length > 0 ? 'failed' : 'completed',
          error_message: errors.length > 0 ? errors.join('; ') : null,
        })
        .eq('id', inboxLog.id);
    }

    console.log('[Forge Inbox] Processing complete:', {
      processed: processedCount,
      errors: errors.length,
    });

    return NextResponse.json({
      message: 'Email processed successfully',
      processed: processedCount,
      errors: errors.length > 0 ? errors : undefined,
    });

  } catch (error: any) {
    console.error('[Forge Inbox] Fatal error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Analyze document using Gemini 1.5 Flash with structured output
 * to identify subject and auto-fracture into micro-missions
 */
async function analyzeDocument(
  buffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<{
  subject: string | null;
  concepts: string[];
  extractedText: string | null;
  microMissions: Array<{
    title: string;
    context: string;
    estimatedMinutes: number;
    isReferenceOnly: boolean;
  }>;
}> {
  try {
    // Check if file type is supported for vision analysis
    const supportedImageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const supportedDocTypes = ['application/pdf'];
    
    if (!supportedImageTypes.includes(mimeType) && !supportedDocTypes.includes(mimeType)) {
      console.log('[Forge Inbox] Unsupported file type for AI analysis:', mimeType);
      return {
        subject: extractSubjectFromFilename(fileName),
        concepts: [],
        extractedText: null,
        microMissions: [],
      };
    }

    const base64Data = buffer.toString('base64');

    // Gemini 1.5 Flash with structured output schema
    const model = genAI.getGenerativeModel({
      model: 'gemini-1.5-flash',
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: SchemaType.OBJECT,
          properties: {
            subject: {
              type: SchemaType.STRING,
              description: 'The overarching academic subject of the document (e.g., Biology, Pre-Algebra, World History).',
            },
            micro_missions: {
              type: SchemaType.ARRAY,
              description: 'The document fractured into actionable, non-threatening 5-15 minute study tasks.',
              items: {
                type: SchemaType.OBJECT,
                properties: {
                  title: {
                    type: SchemaType.STRING,
                    description: 'A highly specific, kid-friendly action title (e.g., "Learn the 4 Stages of Mitosis", NOT just "Mitosis").',
                  },
                  context: {
                    type: SchemaType.STRING,
                    description: '1-2 sentences explaining exactly what the student needs to understand from this specific chunk.',
                  },
                  estimated_minutes: {
                    type: SchemaType.INTEGER,
                    description: 'Must be between 5 and 15.',
                  },
                  is_reference_only: {
                    type: SchemaType.BOOLEAN,
                    description: 'Set to true ONLY if this chunk of text is just a syllabus, schedule, or administrative fluff that requires no actual studying.',
                  },
                },
                required: ['title', 'context', 'estimated_minutes', 'is_reference_only'],
              },
            },
          },
          required: ['subject', 'micro_missions'],
        },
      },
    });

    const systemPrompt = `You are an AI executive function filter for a 12-year-old student. Analyze the forwarded school document. Do not just extract broad subjects. Fracture the required learning into sequential, non-threatening 'Micro-Missions'. Discard fluff and reference material. Adhere strictly to the JSON schema.

For each micro-mission:
- Make the title highly specific and actionable (e.g., "Learn the 4 Stages of Mitosis" not "Mitosis")
- Keep estimated_minutes between 5-15 minutes
- Set is_reference_only to true ONLY for syllabus/schedule/admin content that doesn't require studying
- Set is_reference_only to false for actual learning content

Extract key concepts and any important text (formulas, definitions, questions) from the document.`;

    const result = await model.generateContent([
      { text: systemPrompt },
      {
        inlineData: {
          data: base64Data,
          mimeType: mimeType,
        },
      },
    ]);

    const response = result.response.text();
    
    // Parse structured JSON response
    try {
      const parsed = JSON.parse(response);
      
      return {
        subject: parsed.subject || extractSubjectFromFilename(fileName),
        concepts: parsed.micro_missions?.map((m: any) => m.title) || [],
        extractedText: parsed.micro_missions?.map((m: any) => m.context).join('\n') || null,
        microMissions: parsed.micro_missions?.map((m: any) => ({
          title: m.title,
          context: m.context,
          estimatedMinutes: m.estimated_minutes,
          isReferenceOnly: m.is_reference_only,
        })) || [],
      };
    } catch (parseError) {
      console.error('[Forge Inbox] Failed to parse AI response:', parseError);
      return {
        subject: extractSubjectFromFilename(fileName),
        concepts: [],
        extractedText: response.substring(0, 500),
        microMissions: [],
      };
    }

  } catch (error: any) {
    console.error('[Forge Inbox] AI analysis failed:', error);
    return {
      subject: extractSubjectFromFilename(fileName),
      concepts: [],
      extractedText: null,
      microMissions: [],
    };
  }
}

/**
 * Fallback: Extract subject from filename
 */
function extractSubjectFromFilename(fileName: string): string | null {
  const commonSubjects = [
    'math', 'algebra', 'geometry', 'calculus',
    'science', 'biology', 'chemistry', 'physics',
    'english', 'literature', 'writing',
    'history', 'geography', 'social studies',
    'spanish', 'french', 'language',
  ];

  const lowerName = fileName.toLowerCase();
  
  for (const subject of commonSubjects) {
    if (lowerName.includes(subject)) {
      return subject.charAt(0).toUpperCase() + subject.slice(1);
    }
  }

  return null;
}
