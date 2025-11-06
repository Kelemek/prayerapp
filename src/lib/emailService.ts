/**
 * Email service wrapper using Microsoft Graph API
 * Replaces old Resend and Mailchimp functions
 */

import { supabase } from './supabase'

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

  const htmlBody = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
          .code { font-size: 32px; font-weight: bold; color: #4F46E5; letter-spacing: 8px; text-align: center; padding: 20px; background-color: white; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Verification Code</h1>
          </div>
          <div class="content">
            <p>You requested to ${actionDescription}. Please use the verification code below:</p>
            <div class="code">${options.code}</div>
            <p>This code will expire in 15 minutes.</p>
            <p>If you didn't request this code, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `

  const textBody = `
Verification Code

You requested to ${actionDescription}. Please use the verification code below:

${options.code}

This code will expire in 15 minutes.

If you didn't request this code, you can safely ignore this email.

---
This is an automated message. Please do not reply to this email.
  `.trim()

  await sendEmail({
    to: options.email,
    subject: `Your verification code: ${options.code}`,
    htmlBody,
    textBody
  })
}
