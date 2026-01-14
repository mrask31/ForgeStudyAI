'use server'

import { createClient } from '@/lib/supabase/server'

export interface EmailTemplate {
  id: string
  slug: string
  name: string
  subject: string
  body_markdown: string
  audience: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProcessedEmailTemplate {
  subject: string
  body_markdown: string
}

/**
 * Replace tokens in email template content
 * Currently supports: {{ParentName}}
 */
function replaceTokens(content: string, parentName?: string | null): string {
  const name = parentName?.trim() || 'there'
  return content.replace(/\{\{ParentName\}\}/g, name)
}

/**
 * Get an email template by slug
 * Returns null if template not found or not active
 */
export async function getEmailTemplateBySlug(slug: string): Promise<EmailTemplate | null> {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: template, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      return null
    }
    console.error('[Email Templates] Error fetching template:', error)
    throw new Error('Failed to fetch email template')
  }

  return template
}

/**
 * Get a processed email template by slug with tokens replaced
 * Returns null if template not found, not active, or on any error
 * 
 * @param slug - Template slug (e.g., 'welcome-1')
 * @param parentName - Optional parent name for token replacement (defaults to 'there')
 * @returns Processed template with subject and body_markdown, or null if not found/error
 */
export async function getProcessedEmailTemplate(
  slug: string,
  parentName?: string | null
): Promise<ProcessedEmailTemplate | null> {
  try {
    const supabase = createClient()

    // Check auth (but fail gracefully if not authenticated)
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.warn('[Email Templates] Not authenticated, cannot fetch template')
      return null
    }

    // Fetch template
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('subject, body_markdown')
      .eq('slug', slug)
      .eq('is_active', true)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - template not found
        return null
      }
      console.error('[Email Templates] Error fetching template:', error)
      return null
    }

    if (!template) {
      return null
    }

    // Replace tokens and return
    return {
      subject: replaceTokens(template.subject, parentName),
      body_markdown: replaceTokens(template.body_markdown, parentName),
    }
  } catch (err) {
    // Catch any unexpected errors and fail gracefully
    console.error('[Email Templates] Unexpected error:', err)
    return null
  }
}

/**
 * Get all active email templates for a specific audience
 */
export async function getEmailTemplatesByAudience(audience: string = 'parent'): Promise<EmailTemplate[]> {
  const supabase = createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    throw new Error('Unauthorized')
  }

  const { data: templates, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('audience', audience)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('[Email Templates] Error fetching templates:', error)
    throw new Error('Failed to fetch email templates')
  }

  return templates || []
}
