import { supabase } from './supabase';

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
    // Get admin email list from settings
    const { data: settings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('notification_emails')
      .single();

    if (settingsError) {
      console.error('Error fetching admin settings:', settingsError);
      return;
    }

    if (!settings?.notification_emails || settings.notification_emails.length === 0) {
      console.warn('No admin emails configured for notifications. Please add emails in Admin Portal → Settings.');
      return;
    }

    const emails = settings.notification_emails;

    // Prepare email content based on type
    let subject: string;
    let body: string;

    switch (payload.type) {
      case 'prayer':
        subject = `New Prayer Request: ${payload.title}`;
        body = `A new prayer request has been submitted and is pending approval.\n\nTitle: ${payload.title}\nRequested by: ${payload.requester || 'Anonymous'}\n\nDescription: ${payload.description || 'No description provided'}\n\nPlease review and approve/deny this request in the admin portal.`;
        break;
      
      case 'update':
        subject = `New Prayer Update: ${payload.title}`;
        body = `A new prayer update has been submitted and is pending approval.\n\nPrayer: ${payload.title}\nUpdate by: ${payload.author || 'Anonymous'}\n\nContent: ${payload.content || 'No content provided'}\n\nPlease review and approve/deny this update in the admin portal.`;
        break;
      
      case 'deletion':
        subject = `Deletion Request: ${payload.title}`;
        body = `A deletion request has been submitted for a prayer.\n\nPrayer: ${payload.title}\nRequested by: ${payload.requestedBy || 'Anonymous'}\n\nReason: ${payload.reason || 'No reason provided'}\n\nPlease review and approve/deny this deletion request in the admin portal.`;
        break;
      
      case 'status-change':
        subject = `Status Change Request: ${payload.title}`;
        body = `A status change request has been submitted for a prayer.\n\nPrayer: ${payload.title}\nRequested by: ${payload.requestedBy || 'Anonymous'}\nCurrent Status: ${payload.currentStatus || 'Unknown'}\nRequested Status: ${payload.requestedStatus || 'Unknown'}\n\nReason: ${payload.reason || 'No reason provided'}\n\nPlease review and approve/deny this status change request in the admin portal.`;
        break;
      
      default:
        subject = `New Admin Action Required: ${payload.title}`;
        body = `A new item requires your attention in the admin portal.`;
    }

    // Send email via Supabase Edge Function
    const { error: functionError } = await supabase.functions.invoke('send-notification', {
      body: {
        to: emails,
        subject,
        body,
        html: generateEmailHTML(payload)
      }
    });

    if (functionError) {
      console.error('Error sending notification:', functionError);
      throw functionError;
    }

    // Store notification attempt in database for tracking (optional)
    try {
      await supabase.from('notification_log').insert({
        type: payload.type,
        recipients: emails,
        subject,
        body,
        sent_at: new Date().toISOString()
      });
    } catch (logError) {
      // Ignore errors for notification log
      console.log('Note: notification_log table may not exist yet');
    }

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
}

/**
 * Send email notifications when a prayer is approved
 * Sends to all users or just admins based on email_distribution setting
 */
export async function sendApprovedPrayerNotification(payload: ApprovedPrayerPayload): Promise<void> {
  try {
    // Get admin settings including distribution preference
    const { data: settings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('notification_emails, email_distribution')
      .single();

    if (settingsError) {
      console.error('Error fetching admin settings:', settingsError);
      return;
    }

    let recipients: string[] = [];

    // Determine recipient list based on distribution setting
    if (settings?.email_distribution === 'all_users') {
      // Get all unique email addresses from prayers table
      const { data: prayerEmails, error: prayerError } = await supabase
        .from('prayers')
        .select('email')
        .not('email', 'is', null)
        .neq('email', '');

      if (!prayerError && prayerEmails) {
        const uniqueEmails = [...new Set(prayerEmails.map(p => p.email).filter(Boolean))];
        recipients = uniqueEmails as string[];
      }
    } else {
      // Default to admin_only
      recipients = settings?.notification_emails || [];
    }

    if (recipients.length === 0) {
      console.warn('No recipients for approved prayer notification');
      return;
    }

    const subject = `New Prayer Request: ${payload.title}`;
    const body = `A new prayer request has been approved and is now live.\n\nTitle: ${payload.title}\nFor: ${payload.prayerFor}\nRequested by: ${payload.requester}\n\nDescription: ${payload.description}`;

    const html = generateApprovedPrayerHTML(payload);

    // Send email via Supabase Edge Function
    const { error: functionError } = await supabase.functions.invoke('send-notification', {
      body: {
        to: recipients,
        subject,
        body,
        html
      }
    });

    if (functionError) {
      console.error('Error sending approved prayer notification:', functionError);
    }
  } catch (error) {
    console.error('Error in sendApprovedPrayerNotification:', error);
  }
}

/**
 * Send email notifications when a prayer update is approved
 * Sends to all users or just admins based on email_distribution setting
 */
export async function sendApprovedUpdateNotification(payload: ApprovedUpdatePayload): Promise<void> {
  try {
    // Get admin settings including distribution preference
    const { data: settings, error: settingsError } = await supabase
      .from('admin_settings')
      .select('notification_emails, email_distribution')
      .single();

    if (settingsError) {
      console.error('Error fetching admin settings:', settingsError);
      return;
    }

    let recipients: string[] = [];

    // Determine recipient list based on distribution setting
    if (settings?.email_distribution === 'all_users') {
      // Get all unique email addresses from prayers table
      const { data: prayerEmails, error: prayerError } = await supabase
        .from('prayers')
        .select('email')
        .not('email', 'is', null)
        .neq('email', '');

      if (!prayerError && prayerEmails) {
        const uniqueEmails = [...new Set(prayerEmails.map(p => p.email).filter(Boolean))];
        recipients = uniqueEmails as string[];
      }
    } else {
      // Default to admin_only
      recipients = settings?.notification_emails || [];
    }

    if (recipients.length === 0) {
      console.warn('No recipients for approved update notification');
      return;
    }

    const subject = `Prayer Update: ${payload.prayerTitle}`;
    const body = `A new update has been posted for a prayer.\n\nPrayer: ${payload.prayerTitle}\nUpdate by: ${payload.author}\n\nContent: ${payload.content}`;

    const html = generateApprovedUpdateHTML(payload);

    // Send email via Supabase Edge Function
    const { error: functionError } = await supabase.functions.invoke('send-notification', {
      body: {
        to: recipients,
        subject,
        body,
        html
      }
    });

    if (functionError) {
      console.error('Error sending approved update notification:', functionError);
    }
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

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prayer Update</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">💬 Prayer Update</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">Update for: ${payload.prayerTitle}</h2>
          <p style="margin: 5px 0 15px 0;"><strong>Posted by:</strong> ${payload.author}</p>
          <p><strong>Update:</strong></p>
          <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">${payload.content}</p>
          <div style="margin-top: 30px; text-align: center;">
            <a href="${appUrl}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Prayer</a>
          </div>
        </div>
        <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>A new update has been added to this prayer request.</p>
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

    const subject = `Prayer Request Not Approved: ${payload.title}`;
    const body = `Unfortunately, your prayer request could not be approved at this time.\n\nTitle: ${payload.title}\nRequested by: ${payload.requester}\n\nReason: ${payload.denialReason}\n\nIf you have questions, please contact the administrator.`;

    const html = generateDeniedPrayerHTML(payload);

    // Send email via Supabase Edge Function
    const { error: functionError } = await supabase.functions.invoke('send-notification', {
      body: {
        to: [payload.requesterEmail],
        subject,
        body,
        html
      }
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

    const subject = `Prayer Update Not Approved: ${payload.prayerTitle}`;
    const body = `Unfortunately, your update for "${payload.prayerTitle}" could not be approved at this time.\n\nUpdate by: ${payload.author}\n\nReason: ${payload.denialReason}\n\nIf you have questions, please contact the administrator.`;

    const html = generateDeniedUpdateHTML(payload);

    // Send email via Supabase Edge Function
    const { error: functionError } = await supabase.functions.invoke('send-notification', {
      body: {
        to: [payload.authorEmail],
        subject,
        body,
        html
      }
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
