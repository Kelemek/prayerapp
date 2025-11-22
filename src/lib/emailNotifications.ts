import { supabase } from './supabase';
import { sendEmail, getTemplate, applyTemplateVariables } from './emailService';

/**
 * Helper function to send email using new Graph API service
 * Returns error object for backwards compatibility
 */
async function invokeSendNotification(payload: { to: string[]; subject: string; body: string; html?: string; replyTo?: string }): Promise<{ error: Error | null }> {
  try {
    await sendEmail({
      to: payload.to,
      subject: payload.subject,
      textBody: payload.body,
      htmlBody: payload.html,
      replyTo: payload.replyTo
    });
    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

interface EmailNotificationPayload {
  type: 'prayer' | 'update' | 'deletion' | 'status-change';
  title: string;
  description?: string;
  requester?: string;
  author?: string;
  content?: string;
  reason?: string;
  currentStatus?: string;
  requestedStatus?: string;
  requestedBy?: string;
}

/**
 * Send email notifications to configured admin emails
 * This is a placeholder implementation. In production, you would:
 * 1. Use Supabase Edge Functions to send emails via a service like SendGrid, Resend, or AWS SES
 * 2. Or use a third-party email service API
 * 
 * To implement with Supabase Edge Functions:
 * - Create an Edge Function at supabase/functions/send-notification
 * - Call it from this function using supabase.functions.invoke()
 */
export async function sendAdminNotification(payload: EmailNotificationPayload): Promise<void> {
  try {
    // Get admin emails from email_subscribers table (admins who want notifications)
    const { data: admins, error: adminsError } = await supabase
      .from('email_subscribers')
      .select('email')
      .eq('is_admin', true)
      .eq('is_active', true)
      .eq('receive_admin_emails', true);

    if (adminsError) {
      console.error('Error fetching admin emails:', adminsError);
      return;
    }

    if (!admins || admins.length === 0) {
      console.warn('No admins configured to receive notifications. Please enable admin email notifications in Admin User Management.');
      return;
    }

    const emails = admins.map(admin => admin.email);

    // For prayer notifications, try to use template; fall back to hardcoded for other types
    let subject: string;
    let body: string;
    let html: string | undefined;

    // Load appropriate template based on payload type
    try {
      const { getTemplate, applyTemplateVariables } = await import('./emailService');
      let templateKey: string;
      let variables: Record<string, string>;
      
      switch (payload.type) {
        case 'prayer':
          templateKey = 'admin_notification_prayer';
          variables = {
            prayerTitle: payload.title,
            requesterName: payload.requester || 'Anonymous',
            prayerDescription: payload.description || 'No description provided',
            adminLink: `${window.location.origin}/#admin`
          };
          break;
          
        case 'update':
          templateKey = 'admin_notification_update';
          variables = {
            prayerTitle: payload.title,
            authorName: payload.author || 'Anonymous',
            updateContent: payload.content || 'No content provided',
            adminLink: `${window.location.origin}/#admin`
          };
          break;
          
        case 'deletion':
          templateKey = 'admin_notification_deletion';
          variables = {
            prayerTitle: payload.title,
            requestedBy: payload.requestedBy || 'Anonymous',
            reason: payload.reason || 'No reason provided',
            adminLink: `${window.location.origin}/#admin`
          };
          break;
          
        case 'status-change':
          // Fallback for status-change (not using template)
          subject = `Status Change Request: ${payload.title}`;
          body = `A status change request has been submitted for a prayer.\n\nPrayer: ${payload.title}\nRequested by: ${payload.requestedBy || 'Anonymous'}\nCurrent Status: ${payload.currentStatus || 'Unknown'}\nRequested Status: ${payload.requestedStatus || 'Unknown'}\n\nReason: ${payload.reason || 'No reason provided'}\n\nPlease review and approve/deny this status change request in the admin portal.`;
          throw new Error('No template for status-change'); // Skip to catch block
          
        default:
          subject = `New Admin Action Required: ${payload.title}`;
          body = `A new item requires your attention in the admin portal.`;
          throw new Error('Unknown payload type'); // Skip to catch block
      }
      
      const template = await getTemplate(templateKey);
      
      if (template) {
        subject = applyTemplateVariables(template.subject, variables);
        body = applyTemplateVariables(template.text_body, variables);
        html = applyTemplateVariables(template.html_body, variables);
      } else {
        throw new Error(`Template ${templateKey} not found`);
      }
    } catch (error) {
      // Only log as warning if we actually tried to load a template
      if (payload.type === 'prayer' || payload.type === 'update' || payload.type === 'deletion') {
        console.warn(`Failed to load admin notification template for ${payload.type}, using fallback:`, error);
        
        // Fallback for prayer, update, deletion if template loading fails
        if (payload.type === 'prayer') {
          subject = `New Prayer Request: ${payload.title}`;
          body = `A new prayer request has been submitted and is pending approval.\n\nTitle: ${payload.title}\nRequested by: ${payload.requester || 'Anonymous'}\n\nDescription: ${payload.description || 'No description provided'}\n\nPlease review and approve/deny this request in the admin portal.`;
        } else if (payload.type === 'update') {
          subject = `New Prayer Update: ${payload.title}`;
          body = `A new prayer update has been submitted and is pending approval.\n\nPrayer: ${payload.title}\nUpdate by: ${payload.author || 'Anonymous'}\n\nContent: ${payload.content || 'No content provided'}\n\nPlease review and approve/deny this update in the admin portal.`;
        } else if (payload.type === 'deletion') {
          subject = `Deletion Request: ${payload.title}`;
          body = `A deletion request has been submitted for a prayer.\n\nPrayer: ${payload.title}\nRequested by: ${payload.requestedBy || 'Anonymous'}\n\nReason: ${payload.reason || 'No reason provided'}\n\nPlease review and approve/deny this deletion request in the admin portal.`;
        }
      }
    }

    // Send email via Supabase Edge Function
    const { error: functionError } = await invokeSendNotification({
      to: emails,
      subject,
      body,
      html: html || generateEmailHTML(payload)
    });

    if (functionError) {
      console.error('Error sending notification:', functionError);
      throw functionError;
    }

    // TODO: Store notification attempt in database for tracking (requires notification_log table)
    // await supabase.from('notification_log').insert({ type, recipients, subject, body, sent_at });

  } catch (error) {
    console.error('Error in sendAdminNotification:', error);
    // Don't throw - we don't want email failures to break the app
  }
}

/**
 * Generate HTML email template
 */
function generateEmailHTML(payload: EmailNotificationPayload): string {
  const baseUrl = window.location.origin;
  // Link to the app root - user will see login if not authenticated, or admin portal if authenticated
  const loginUrl = `${baseUrl}/#admin`;

  switch (payload.type) {
    case 'prayer':
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Prayer Request</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(to right, #ef4444, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🙏 New Prayer Request</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1f2937; margin-top: 0;">${payload.title}</h2>
              <p><strong>Requested by:</strong> ${payload.requester || 'Anonymous'}</p>
              <p><strong>Description:</strong></p>
              <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">${payload.description || 'No description provided'}</p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="${loginUrl}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Admin Portal</a>
              </div>
            </div>
            <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
              <p>This is an automated notification from your prayer app.</p>
            </div>
          </body>
        </html>
      `;

    case 'update':
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>New Prayer Update</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(to right, #3b82f6, #2563eb); padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">💬 New Prayer Update</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1f2937; margin-top: 0;">Update for: ${payload.title}</h2>
              <p><strong>Update by:</strong> ${payload.author || 'Anonymous'}</p>
              <p><strong>Content:</strong></p>
              <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">${payload.content || 'No content provided'}</p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="${loginUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Admin Portal</a>
              </div>
            </div>
            <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
              <p>This is an automated notification from your prayer app.</p>
            </div>
          </body>
        </html>
      `;

    case 'deletion':
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Deletion Request</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(to right, #dc2626, #991b1b); padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🗑️ Deletion Request</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1f2937; margin-top: 0;">${payload.title}</h2>
              <p><strong>Requested by:</strong> ${payload.requestedBy || 'Anonymous'}</p>
              <p><strong>Reason:</strong></p>
              <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626;">${payload.reason || 'No reason provided'}</p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="${loginUrl}" style="background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Admin Portal</a>
              </div>
            </div>
            <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
              <p>This is an automated notification from your prayer app.</p>
            </div>
          </body>
        </html>
      `;

    case 'status-change':
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Status Change Request</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(to right, #8b5cf6, #7c3aed); padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">🔄 Status Change Request</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1f2937; margin-top: 0;">${payload.title}</h2>
              <p><strong>Requested by:</strong> ${payload.requestedBy || 'Anonymous'}</p>
              <p><strong>Current Status:</strong> ${payload.currentStatus || 'Unknown'}</p>
              <p><strong>Requested Status:</strong> ${payload.requestedStatus || 'Unknown'}</p>
              <p><strong>Reason:</strong></p>
              <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #8b5cf6;">${payload.reason || 'No reason provided'}</p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="${loginUrl}" style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Admin Portal</a>
              </div>
            </div>
            <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
              <p>This is an automated notification from your prayer app.</p>
            </div>
          </body>
        </html>
      `;

    default:
      return `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Admin Action Required</title>
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(to right, #6b7280, #4b5563); padding: 20px; border-radius: 8px 8px 0 0;">
              <h1 style="color: white; margin: 0; font-size: 24px;">⚠️ Admin Action Required</h1>
            </div>
            <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
              <h2 style="color: #1f2937; margin-top: 0;">${payload.title}</h2>
              <p>A new item requires your attention in the admin portal.</p>
              <div style="margin-top: 30px; text-align: center;">
                <a href="${loginUrl}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Admin Portal</a>
              </div>
            </div>
            <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
              <p>This is an automated notification from your prayer app.</p>
            </div>
          </body>
        </html>
      `;
  }
}

interface ApprovedPrayerPayload {
  title: string;
  description: string;
  requester: string;
  prayerFor: string;
  status: string;
}

interface ApprovedUpdatePayload {
  prayerTitle: string;
  content: string;
  author: string;
  markedAsAnswered?: boolean;
}

/**
 * Send email notifications when a prayer is approved
 * Sends to all active subscribers via Microsoft Graph API
 */
export async function sendApprovedPrayerNotification(payload: ApprovedPrayerPayload): Promise<void> {
  try {
    // Send to all active subscribers via bulk email
    await sendBulkPrayerEmail(payload);
  } catch (error) {
    console.error('Error in sendApprovedPrayerNotification:', error);
  }
}

/**
 * Send email to all active subscribers via Microsoft Graph API
 */
async function sendBulkPrayerEmail(payload: ApprovedPrayerPayload): Promise<void> {
  try {
    const { sendEmailToAllSubscribers, getTemplate, applyTemplateVariables } = await import('./emailService');
    
    // Try to fetch the approved_prayer template
    let subject: string;
    let htmlContent: string;
    let textContent: string;

    try {
      const template = await getTemplate('approved_prayer');
      if (template) {
        const variables = {
          prayerTitle: payload.title,
          prayerFor: payload.prayerFor,
          requesterName: payload.requester,
          prayerDescription: payload.description,
          status: payload.status,
          appLink: `${window.location.origin}/`
        };
        subject = applyTemplateVariables(template.subject, variables);
        htmlContent = applyTemplateVariables(template.html_body, variables);
        textContent = applyTemplateVariables(template.text_body, variables);
      } else {
        throw new Error('Template not found');
      }
    } catch (error) {
      console.warn('Failed to load approved_prayer template, using fallback:', error);
      subject = `New Prayer Request: ${payload.title}`;
      htmlContent = generateApprovedPrayerHTML(payload);
      textContent = `A new prayer request has been approved and is now live.\n\nTitle: ${payload.title}\nFor: ${payload.prayerFor}\nRequested by: ${payload.requester}\n\nDescription: ${payload.description}`;
    }

    const result = await sendEmailToAllSubscribers({
      subject,
      htmlBody: htmlContent,
      textBody: textContent
    });

    console.log('Bulk email sent successfully:', result);
  } catch (error) {
    console.error('Error in sendBulkPrayerEmail:', error);
    // Don't re-throw - let the error be logged but don't block approval
  }
}

/**
 * Send email notifications when a prayer update is approved
 * Sends to all active email subscribers
 * Uses templates from the email_templates table
 */
export async function sendApprovedUpdateNotification(payload: ApprovedUpdatePayload): Promise<void> {
  try {
    const isAnswered = payload.markedAsAnswered || false;
    const { sendEmailToAllSubscribers, getTemplate, applyTemplateVariables } = await import('./emailService');
    
    // Fetch the appropriate template
    const templateKey = isAnswered ? 'prayer_answered' : 'approved_update';
    const template = await getTemplate(templateKey);
    
    if (!template) {
      console.error(`Template not found: ${templateKey}`);
      return;
    }
    
    // Prepare template variables
    const variables = {
      prayerTitle: payload.prayerTitle,
      authorName: payload.author,
      updateContent: payload.content,
      appLink: typeof window !== 'undefined' ? window.location.origin : 'https://prayerapp.com'
    };
    
    // Apply variables to template
    const subject = applyTemplateVariables(template.subject, variables);
    const htmlContent = applyTemplateVariables(template.html_body, variables);
    const textContent = applyTemplateVariables(template.text_body, variables);
    
    const result = await sendEmailToAllSubscribers({
      subject,
      htmlBody: htmlContent,
      textBody: textContent
    });

    console.log('Update notification sent successfully:', result);
  } catch (error) {
    console.error('Error in sendApprovedUpdateNotification:', error);
  }
}

/**
 * Generate HTML for approved prayer email
 */
function generateApprovedPrayerHTML(payload: ApprovedPrayerPayload): string {
  const baseUrl = window.location.origin;
  const appUrl = `${baseUrl}/`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Prayer Request</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🙏 New Prayer Request</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">${payload.title}</h2>
          <div style="margin-bottom: 15px;">
            <p style="margin: 5px 0;"><strong>For:</strong> ${payload.prayerFor}</p>
            <p style="margin: 5px 0;"><strong>Requested by:</strong> ${payload.requester}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> ${payload.status}</p>
          </div>
          <p><strong>Description:</strong></p>
          <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">${payload.description}</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${appUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Prayer</a>
          </div>
        </div>
        <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>This prayer has been approved and is now active. Join us in prayer!</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate HTML for approved update email
 */
function generateApprovedUpdateHTML(payload: ApprovedUpdatePayload): string {
  const baseUrl = window.location.origin;
  const appUrl = `${baseUrl}/`;
  const isAnswered = payload.markedAsAnswered || false;

  // Different colors and messaging for answered vs regular update
  const gradientColors = isAnswered 
    ? '#10b981, #059669' // Green for answered
    : '#3b82f6, #2563eb'; // Blue for regular update
  
  const icon = isAnswered ? '🎉' : '💬';
  const title = isAnswered ? 'Prayer Answered!' : 'Prayer Update';
  const borderColor = isAnswered ? '#10b981' : '#3b82f6';
  const buttonColor = isAnswered ? '#10b981' : '#3b82f6';
  const statusBadge = isAnswered 
    ? '<div style="display: inline-block; background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 15px;">✓ Answered Prayer</div>'
    : '';
  const closingMessage = isAnswered
    ? 'Let\'s give thanks and praise for this answered prayer!'
    : 'Let\'s continue to lift this prayer up together.';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, ${gradientColors}); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${icon} ${title}</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          ${statusBadge}
          <h2 style="color: #1f2937; margin-top: 0;">Update for: ${payload.prayerTitle}</h2>
          <p style="margin: 5px 0 15px 0;"><strong>Posted by:</strong> ${payload.author}</p>
          <p><strong>Update:</strong></p>
          <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid ${borderColor};">${payload.content}</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${appUrl}" style="background: ${buttonColor}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Prayer</a>
          </div>
        </div>
        <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>${closingMessage}</p>
        </div>
      </body>
    </html>
  `;
}

interface RequesterApprovalPayload {
  title: string;
  description: string;
  requester: string;
  requesterEmail: string;
  prayerFor: string;
}

/**
 * Send email notification to the requester when their prayer is approved
 * This is a personal confirmation email sent only to the person who submitted the prayer
 */
export async function sendRequesterApprovalNotification(payload: RequesterApprovalPayload): Promise<void> {
  try {
    if (!payload.requesterEmail) {
      console.warn('No email address for prayer requester');
      return;
    }

    const subject = `Your Prayer Request Has Been Approved: ${payload.title}`;
    const body = `Great news! Your prayer request has been approved and is now live on the prayer app.\n\nTitle: ${payload.title}\nFor: ${payload.prayerFor}\n\nYour prayer is now being lifted up by our community. You will receive updates via email when the prayer status changes or when updates are posted.`;

    const html = generateRequesterApprovalHTML(payload);

    // Send email via Supabase Edge Function
    const { error: functionError } = await invokeSendNotification({
      to: [payload.requesterEmail],
      subject,
      body,
      html
    });

    if (functionError) {
      console.error('Error sending requester approval notification:', functionError);
    }
  } catch (error) {
    console.error('Error in sendRequesterApprovalNotification:', error);
  }
}

/**
 * Generate HTML for requester approval email
 */
function generateRequesterApprovalHTML(payload: RequesterApprovalPayload): string {
  const baseUrl = window.location.origin;
  const appUrl = `${baseUrl}/`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prayer Request Approved</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✅ Prayer Request Approved!</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">Great news, ${payload.requester}!</h2>
          <p style="margin-bottom: 20px;">Your prayer request has been approved and is now active in our prayer community.</p>
          
          <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #065f46; font-size: 14px;"><strong>Your Prayer Request:</strong></p>
            <p style="margin: 0 0 10px 0; color: #065f46; font-weight: 600; font-size: 18px;">${payload.title}</p>
            <p style="margin: 0; color: #047857;">${payload.description}</p>
          </div>
          
          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #0c4a6e; font-size: 14px;">
              <strong>What happens next?</strong><br>
              • Your prayer is now visible to our community<br>
              • People can pray for this request and post updates<br>
              • You'll receive email notifications when updates are posted<br>
              • You can visit the app anytime to see the latest
            </p>
          </div>

          <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">Thank you for sharing this prayer need with our community. We are honored to pray alongside you!</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${appUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Your Prayer</a>
          </div>
        </div>
        <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>You're receiving this because you submitted a prayer request to our prayer app.</p>
        </div>
      </body>
    </html>
  `;
}

interface DeniedPrayerPayload {
  title: string;
  description: string;
  requester: string;
  requesterEmail: string;
  denialReason: string;
}

interface DeniedUpdatePayload {
  prayerTitle: string;
  content: string;
  author: string;
  authorEmail: string;
  denialReason: string;
}

/**
 * Send email notification when a prayer is denied
 * Sends only to the requester who submitted the prayer
 */
export async function sendDeniedPrayerNotification(payload: DeniedPrayerPayload): Promise<void> {
  try {
    if (!payload.requesterEmail) {
      console.warn('No email address for denied prayer requester');
      return;
    }

    let subject = `Prayer Request Not Approved: ${payload.title}`;
    let body = `Unfortunately, your prayer request could not be approved at this time.\n\nTitle: ${payload.title}\nRequested by: ${payload.requester}\n\nReason: ${payload.denialReason}\n\nIf you have questions, please contact the administrator.`;
    let html = generateDeniedPrayerHTML(payload);

    try {
      const template = await getTemplate('denied_prayer');
      if (template) {
        subject = template.subject;
        body = template.text_body;
        html = template.html_body;
        // Apply variables
        const variables = {
          prayerTitle: payload.title,
          prayerDescription: payload.description,
          denialReason: payload.denialReason,
          appLink: `${window.location.origin}/`
        };
        subject = applyTemplateVariables(subject, variables);
        body = applyTemplateVariables(body, variables);
        html = applyTemplateVariables(html, variables);
      }
    } catch (templateError) {
      console.warn('Failed to fetch denied_prayer template, using fallback:', templateError);
    }

    // Send email via Supabase Edge Function
    const { error: functionError } = await invokeSendNotification({
      to: [payload.requesterEmail],
      subject,
      body,
      html
    });

    if (functionError) {
      console.error('Error sending denied prayer notification:', functionError);
    }
  } catch (error) {
    console.error('Error in sendDeniedPrayerNotification:', error);
  }
}

/**
 * Send email notification when a prayer update is denied
 * Sends only to the author who submitted the update
 */
export async function sendDeniedUpdateNotification(payload: DeniedUpdatePayload): Promise<void> {
  try {
    if (!payload.authorEmail) {
      console.warn('No email address for denied update author');
      return;
    }

    let subject = `Prayer Update Not Approved: ${payload.prayerTitle}`;
    let body = `Unfortunately, your update for "${payload.prayerTitle}" could not be approved at this time.\n\nUpdate by: ${payload.author}\n\nReason: ${payload.denialReason}\n\nIf you have questions, please contact the administrator.`;
    let html = generateDeniedUpdateHTML(payload);

    try {
      const template = await getTemplate('denied_update');
      if (template) {
        subject = template.subject;
        body = template.text_body;
        html = template.html_body;
        // Apply variables
        const variables = {
          prayerTitle: payload.prayerTitle,
          updateContent: payload.content,
          denialReason: payload.denialReason,
          appLink: `${window.location.origin}/`
        };
        subject = applyTemplateVariables(subject, variables);
        body = applyTemplateVariables(body, variables);
        html = applyTemplateVariables(html, variables);
      }
    } catch (templateError) {
      console.warn('Failed to fetch denied_update template, using fallback:', templateError);
    }

    // Send email via Supabase Edge Function
    const { error: functionError } = await invokeSendNotification({
      to: [payload.authorEmail],
      subject,
      body,
      html
    });

    if (functionError) {
      console.error('Error sending denied update notification:', functionError);
    }
  } catch (error) {
    console.error('Error in sendDeniedUpdateNotification:', error);
  }
}

/**
 * Generate HTML for denied prayer email
 */
function generateDeniedPrayerHTML(payload: DeniedPrayerPayload): string {
  const baseUrl = window.location.origin;
  const appUrl = `${baseUrl}/`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prayer Request Not Approved</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #ef4444, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📋 Prayer Request Status</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">${payload.title}</h2>
          <p style="margin-bottom: 15px;">Thank you for submitting your prayer request. After careful review, we are unable to approve this request at this time.</p>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong></p>
            <p style="margin: 10px 0 0 0; color: #991b1b;">${payload.denialReason}</p>
          </div>
          <p style="margin-top: 20px;"><strong>Your Submission:</strong></p>
          <p style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">${payload.description}</p>
          <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">If you have questions or would like to discuss this decision, please feel free to contact the administrator.</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${appUrl}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Visit Prayer App</a>
          </div>
        </div>
        <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>This is an automated notification from your prayer app.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate HTML for denied update email
 */
function generateDeniedUpdateHTML(payload: DeniedUpdatePayload): string {
  const baseUrl = window.location.origin;
  const appUrl = `${baseUrl}/`;

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prayer Update Not Approved</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #ef4444, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">💬 Update Status</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">Update for: ${payload.prayerTitle}</h2>
          <p style="margin-bottom: 15px;">Thank you for submitting an update. After careful review, we are unable to approve this update at this time.</p>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong></p>
            <p style="margin: 10px 0 0 0; color: #991b1b;">${payload.denialReason}</p>
          </div>
          <p style="margin-top: 20px;"><strong>Your Update:</strong></p>
          <p style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">${payload.content}</p>
          <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">If you have questions or would like to discuss this decision, please feel free to contact the administrator.</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${appUrl}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Visit Prayer App</a>
          </div>
        </div>
        <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>This is an automated notification from your prayer app.</p>
        </div>
      </body>
    </html>
  `;
}

// ============================================
// Preference Change Notification Functions
// ============================================

/**
 * Preference Change Payloads
 */
interface PreferenceChangeNotificationPayload {
  name: string;
  email: string;
  receiveNotifications: boolean;
}

interface ApprovedPreferenceChangePayload {
  name: string;
  email: string;
  receiveNotifications: boolean;
}

interface DeniedPreferenceChangePayload {
  name: string;
  email: string;
  receiveNotifications: boolean;
  denialReason: string;
}

/**
 * Send admin notification when a preference change is submitted
 */
export async function sendPreferenceChangeNotification(payload: PreferenceChangeNotificationPayload): Promise<void> {
  try {
    // Get admin email list from email_subscribers table
    const { data: subscribers, error: subscribersError } = await supabase
      .from('email_subscribers')
      .select('email')
      .eq('is_active', true);

    if (subscribersError) {
      console.error('❌ Error fetching admin emails:', subscribersError);
      return;
    }

    if (!subscribers || subscribers.length === 0) {
      console.warn('⚠️ No active admin email subscribers found. Please add email subscribers in Admin Portal → Email Settings tab.');
      return;
    }

    const adminEmails = subscribers.map(s => s.email);

    const subject = `New Notification Preference Change: ${payload.name}`;
    const notificationStatus = payload.receiveNotifications ? 'Opt IN' : 'Opt OUT';
    
    const body = `A new notification preference change has been submitted and is pending approval.

Name: ${payload.name}
Email: ${payload.email}
Preference: ${notificationStatus} of new prayer notifications

Please review and approve/deny this request in the admin portal.`;

    const html = generatePreferenceChangeNotificationHTML(payload);
    
    // Send email via Supabase Edge Function
    const { error: functionError } = await invokeSendNotification({
      to: adminEmails,
      subject,
      body,
      html
    });

    if (functionError) {
      console.error('❌ Error sending preference change notification:', functionError);
      console.error('❌ Note: Preference was saved but admin notification email failed');
      // Don't throw - allow the preference to save even if email fails
    }
  } catch (error) {
    console.error('❌ Error in sendPreferenceChangeNotification:', error);
    console.error('❌ Note: Preference was saved but admin notification email failed');
    // Don't throw - allow the preference to save even if email fails
  }
}

/**
 * Send approval email to user when their preference change is approved
 */
export async function sendApprovedPreferenceChangeNotification(payload: ApprovedPreferenceChangePayload): Promise<void> {
  try {
    const subject = `Notification Preferences Updated`;
    const notificationStatus = payload.receiveNotifications ? 'opted IN to' : 'opted OUT of';
    
    const body = `Hello ${payload.name},

Your notification preference change has been approved!

You have successfully ${notificationStatus} receiving new prayer notifications.

${payload.receiveNotifications 
  ? 'You will now receive email notifications when new prayers are posted to the prayer list.' 
  : 'You will no longer receive email notifications when new prayers are posted. You will still receive approval/denial notifications for prayers you submit.'}

Thank you for being part of our prayer community!`;

    const html = generateApprovedPreferenceChangeHTML(payload);

    // Send email via Supabase Edge Function
    const { error: functionError } = await invokeSendNotification({
      to: [payload.email],
      subject,
      body,
      html
    });

    if (functionError) {
      console.error('Error sending approved preference change notification:', functionError);
      throw functionError;
    }
  } catch (error) {
    console.error('Error in sendApprovedPreferenceChangeNotification:', error);
  }
}

/**
 * Send denial email to user when their preference change is denied
 */
export async function sendDeniedPreferenceChangeNotification(payload: DeniedPreferenceChangePayload): Promise<void> {
  try {
    const subject = `Notification Preference Change - Unable to Process`;
    const notificationStatus = payload.receiveNotifications ? 'opt IN to' : 'opt OUT of';
    
    const body = `Hello ${payload.name},

Thank you for your notification preference change request. After careful review, we are unable to process this change at this time.

Requested Change: ${notificationStatus} new prayer notifications

Reason: ${payload.denialReason}

If you have questions or would like to discuss this decision, please feel free to contact the administrator.`;

    const html = generateDeniedPreferenceChangeHTML(payload);

    // Send email via Supabase Edge Function
    const { error: functionError } = await invokeSendNotification({
      to: [payload.email],
      subject,
      body,
      html
    });

    if (functionError) {
      console.error('Error sending denied preference change notification:', functionError);
      throw functionError;
    }
  } catch (error) {
    console.error('Error in sendDeniedPreferenceChangeNotification:', error);
  }
}

/**
 * Generate HTML for preference change notification email (to admins)
 */
function generatePreferenceChangeNotificationHTML(payload: PreferenceChangeNotificationPayload): string {
  const baseUrl = window.location.origin;
  const adminUrl = `${baseUrl}/#admin`;
  const notificationStatus = payload.receiveNotifications ? 'Opt IN' : 'Opt OUT';
  const statusColor = payload.receiveNotifications ? '#10b981' : '#f59e0b';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Notification Preference Change</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #8b5cf6, #7c3aed); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📧 New Preference Change Request</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin-top: 0; font-size: 16px;">A new notification preference change has been submitted and requires your review.</p>
          <div style="background: white; padding: 20px; border-radius: 6px; border: 1px solid #e5e7eb; margin: 20px 0;">
            <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px;">User Information</h2>
            <p style="margin: 5px 0;"><strong>Name:</strong> ${payload.name}</p>
            <p style="margin: 5px 0;"><strong>Email:</strong> ${payload.email}</p>
            <div style="margin-top: 15px; padding: 15px; background: #f3f4f6; border-radius: 6px; border-left: 4px solid ${statusColor};">
              <p style="margin: 0;"><strong>Requested Preference:</strong></p>
              <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 600; color: ${statusColor};">${notificationStatus}</p>
              <p style="margin: 5px 0 0 0; font-size: 14px; color: #6b7280;">
                ${payload.receiveNotifications 
                  ? 'User wants to receive notifications when new prayers are posted' 
                  : 'User wants to stop receiving new prayer notifications'}
              </p>
            </div>
          </div>
          <p style="font-size: 14px; color: #6b7280;">Please review this request in the admin portal and approve or deny accordingly.</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${adminUrl}" style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Review in Admin Portal</a>
          </div>
        </div>
        <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>This is an automated notification from your prayer app admin system.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate HTML for approved preference change email (to user)
 */
function generateApprovedPreferenceChangeHTML(payload: ApprovedPreferenceChangePayload): string {
  const baseUrl = window.location.origin;
  const appUrl = `${baseUrl}/`;
  const notificationStatus = payload.receiveNotifications ? 'opted IN to' : 'opted OUT of';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preference Change Approved</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">✅ Preferences Updated</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin-top: 0; font-size: 16px;">Hello ${payload.name},</p>
          <p>Great news! Your notification preference change has been approved.</p>
          <div style="background: #ecfdf5; border-left: 4px solid #10b981; padding: 20px; border-radius: 6px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #059669;">✓ You have successfully ${notificationStatus} new prayer notifications</h3>
            <p style="margin: 10px 0 0 0; color: #047857;">
              ${payload.receiveNotifications 
                ? '📬 You will now receive email notifications when new prayers are posted to the prayer list.' 
                : '🔕 You will no longer receive email notifications when new prayers are posted. Note: You will still receive approval/denial notifications for prayers you submit.'}
            </p>
          </div>
          <p style="font-size: 14px; color: #6b7280;">You can change your notification preferences at any time by clicking the settings icon in the prayer app.</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${appUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Visit Prayer App</a>
          </div>
          <p style="margin-top: 30px; font-size: 14px; color: #6b7280; text-align: center;">Thank you for being part of our prayer community! 🙏</p>
        </div>
        <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>This is an automated notification from your prayer app.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate HTML for denied preference change email (to user)
 */
function generateDeniedPreferenceChangeHTML(payload: DeniedPreferenceChangePayload): string {
  const baseUrl = window.location.origin;
  const appUrl = `${baseUrl}/`;
  const notificationStatus = payload.receiveNotifications ? 'opt IN to' : 'opt OUT of';

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preference Change Request</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #ef4444, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">📋 Preference Change Request</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p style="margin-top: 0; font-size: 16px;">Hello ${payload.name},</p>
          <p>Thank you for your notification preference change request. After careful review, we are unable to process this change at this time.</p>
          <div style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin: 15px 0;">
            <p style="margin: 5px 0;"><strong>Requested Change:</strong> ${notificationStatus} new prayer notifications</p>
          </div>
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0; color: #991b1b;"><strong>Reason:</strong></p>
            <p style="margin: 10px 0 0 0; color: #991b1b;">${payload.denialReason}</p>
          </div>
          <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">If you have questions or would like to discuss this decision, please feel free to contact the administrator.</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${appUrl}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Visit Prayer App</a>
          </div>
        </div>
        <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>This is an automated notification from your prayer app.</p>
        </div>
      </body>
    </html>
  `;
}
