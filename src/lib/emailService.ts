/**
 * Email service wrapper using Microsoft Graph API
 * Replaces old Resend and Mailchimp functions
 */

import { supabase, directQuery } from './supabase'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  htmlBody?: string
  textBody?: string
  replyTo?: string
  fromName?: string
}

export interface BulkEmailResult {
  success: boolean
  sent: number
  failed: number
  errors: string[]
}

export interface EmailTemplate {
  id: string
  template_key: string
  name: string
  subject: string
  html_body: string
  text_body: string
  description?: string
  created_at: string
  updated_at: string
}

/**
 * Get template by key
 */
export async function getTemplate(templateKey: string): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('template_key', templateKey)
    .single()

  if (error) {
    console.error('Error fetching template:', error)
    return null
  }

  return data
}

/**
 * Get all templates
 * Uses directQuery to avoid Supabase client hang after browser minimize
 */
export async function getAllTemplates(): Promise<EmailTemplate[]> {
  const { data, error } = await directQuery<EmailTemplate[]>('email_templates', {
    select: '*',
    order: { column: 'name', ascending: true },
    timeout: 15000
  })

  if (error) {
    console.error('Error fetching templates:', error)
    return []
  }

  return data || []
}

/**
 * Update template
 */
export async function updateTemplate(templateId: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate | null> {
  const { data, error } = await supabase
    .from('email_templates')
    .update({
      name: updates.name,
      subject: updates.subject,
      html_body: updates.html_body,
      text_body: updates.text_body,
      description: updates.description
    })
    .eq('id', templateId)
    .select()
    .single()

  if (error) {
    console.error('Error updating template:', error)
    return null
  }

  return data
}

/**
 * Replace template variables with actual values
 * Supports {{variableName}} syntax
 */
export function applyTemplateVariables(content: string, variables: Record<string, string>): string {
  let result = content
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`{{\\s*${key}\\s*}}`, 'g')
    result = result.replace(placeholder, value || '')
  }
  return result
}

/**
 * Send a single email or small batch
 */
export async function sendEmail(options: SendEmailOptions): Promise<void> {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      to: options.to,
      subject: options.subject,
      htmlBody: options.htmlBody,
      textBody: options.textBody,
      replyTo: options.replyTo,
      fromName: options.fromName
    }
  })

  if (error) {
    console.error('Failed to send email:', error)
    throw new Error(error.message || 'Failed to send email')
  }

  if (!data?.success) {
    throw new Error(data?.error || 'Failed to send email')
  }
}

/**
 * Send email to all active subscribers
 */
export async function sendEmailToAllSubscribers(options: {
  subject: string
  htmlBody?: string
  textBody?: string
  replyTo?: string
  fromName?: string
}): Promise<BulkEmailResult> {
  const { data, error } = await supabase.functions.invoke('send-email', {
    body: {
      action: 'send_to_all_subscribers',
      subject: options.subject,
      htmlBody: options.htmlBody,
      textBody: options.textBody,
      replyTo: options.replyTo,
      fromName: options.fromName
    }
  })

  if (error) {
    console.error('Failed to send bulk email:', error)
    throw new Error(error.message || 'Failed to send bulk email')
  }

  return {
    success: data?.success || false,
    sent: data?.sent || 0,
    failed: data?.failed || 0,
    errors: data?.errors || []
  }
}

/**
 * Send verification code email
 */
export async function sendVerificationCode(options: {
  email: string
  code: string
  actionType: string
}): Promise<void> {
  const actionDescriptions: Record<string, string> = {
    'prayer_submission': 'submit a prayer request',
    'prayer_update': 'add a prayer update',
    'deletion_request': 'request a prayer deletion',
    'update_deletion_request': 'request an update deletion',
    'status_change_request': 'request a status change',
    'preference_change': 'update your email preferences'
  }

  const actionDescription = actionDescriptions[options.actionType] || 'perform an action'

  // Fetch template
  const template = await getTemplate('verification_code')
  
  if (!template) {
    console.error('Verification code template not found')
    throw new Error('Email template not configured')
  }

  // Apply variables to template
  const subject = applyTemplateVariables(template.subject, {
    code: options.code
  })

  const htmlBody = applyTemplateVariables(template.html_body, {
    code: options.code,
    actionDescription
  })

  const textBody = applyTemplateVariables(template.text_body, {
    code: options.code,
    actionDescription
  })

  await sendEmail({
    to: options.email,
    subject,
    htmlBody,
    textBody
  })
}
