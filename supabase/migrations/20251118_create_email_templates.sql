-- Create email_templates table for managing customizable email content
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_email_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS email_templates_updated_at ON email_templates;

CREATE TRIGGER email_templates_updated_at
BEFORE UPDATE ON email_templates
FOR EACH ROW
EXECUTE FUNCTION update_email_templates_updated_at();

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read templates (they're public content)
DROP POLICY IF EXISTS "Allow all to read templates" ON email_templates;
CREATE POLICY "Allow all to read templates" ON email_templates
  FOR SELECT
  USING (true);

-- Allow authenticated users to update templates
DROP POLICY IF EXISTS "Allow authenticated users to update templates" ON email_templates;
CREATE POLICY "Allow authenticated users to update templates" ON email_templates
  FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Seed with default templates
INSERT INTO email_templates (template_key, name, subject, html_body, text_body, description)
VALUES
(
  'verification_code',
  'Verification Code',
  'Your verification code: {{code}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: Arial, Helvetica, sans-serif;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f3f4f6;"><tr><td align="center" style="padding: 20px 0;"><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="margin: 0 auto; background-color: #ffffff;"><tr><td style="background-color: #4F46E5; padding: 30px 20px; text-align: center;"><h1 style="margin: 0; font-size: 24px; color: #ffffff; font-weight: bold;">Verification Code</h1></td></tr><tr><td style="padding: 40px 30px;"><p style="font-size: 16px; color: #333333; margin: 0 0 20px 0; line-height: 1.6;">You requested to {{actionDescription}}. Please use the verification code below:</p><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 30px 0;"><tr><td style="background-color: #667eea; padding: 30px; text-align: center;"><p style="margin: 0 0 15px 0; font-size: 14px; color: #ffffff; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Your Verification Code</p><p style="margin: 0; font-size: 48px; font-weight: bold; color: #ffffff; letter-spacing: 12px; font-family: Courier New, Courier, monospace;">{{code}}</p></td></tr></table><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0; background-color: #eff6ff; border-left: 4px solid #3b82f6;"><tr><td style="padding: 15px 20px;"><p style="margin: 0 0 8px 0; font-weight: 600; color: #1e40af; font-size: 14px;">Easy Code Entry:</p><p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.5;"><strong>Select and copy the code above</strong>, then paste it into the verification dialog. You can also paste the code directly into the first input field - it will auto-fill all digits.</p></td></tr></table><table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 20px 0; background-color: #fef3c7; border-left: 4px solid #f59e0b;"><tr><td style="padding: 15px 20px;"><p style="margin: 0; font-size: 14px; color: #92400e; line-height: 1.5;"><strong>This code will expire in 15 minutes.</strong> If you did not request this code, you can safely ignore this email.</p></td></tr></table></td></tr><tr><td style="padding: 20px 30px; border-top: 1px solid #e5e7eb;"><p style="margin: 0; text-align: center; color: #6b7280; font-size: 13px; line-height: 1.5;">This is an automated message from your Prayer App.<br>Please do not reply to this email.</p></td></tr></table></td></tr></table></body></html>',
  '🔐 VERIFICATION CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You requested to {{actionDescription}}.

YOUR CODE: {{code}}

💡 TIP: Copy the code above and paste it into the verification dialog.
You can paste it directly into the first input field to auto-fill all digits.

⏰ This code will expire in 15 minutes.

If you didn''t request this code, you can safely ignore this email.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message from your Prayer App.
Please do not reply to this email.',
  'Email sent to verify user actions like prayer submissions and deletions. Variables: {{code}}, {{actionDescription}}'
),
(
  'admin_invitation',
  'Admin Invitation',
  'Admin Access Granted - Prayer App',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><style>body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; }.container { max-width: 600px; margin: 0 auto; padding: 20px; }.header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }.content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }.button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }.footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }</style></head><body><div class="container"><div class="header"><h1 style="margin: 0;">🙏 Prayer App</h1><p style="margin: 10px 0 0 0;">Admin Access Granted</p></div><div class="content"><h2>Welcome, {{name}}!</h2><p>You''ve been granted admin access to the Prayer App. As an admin, you can:</p><ul><li>Review and approve prayer requests</li><li>Manage prayer updates and deletions</li><li>Configure email settings and subscribers</li><li>Manage prayer prompts and types</li><li>Access the full admin portal</li></ul><p>To sign in to the admin portal:</p><ol><li>Go to the admin login page link at the bottom of the main site</li><li>Enter your email address: <strong>{{email}}</strong></li><li>Click "Send Magic Link"</li><li>Check your email for the secure sign-in link</li></ol><div style="text-align: center;"><a href="{{adminLink}}" class="button">Go to Admin Portal</a></div><p style="color: #6b7280; font-size: 14px; margin-top: 30px;"><strong>Note:</strong> Prayer App uses passwordless authentication. You''ll receive a magic link via email each time you sign in.</p></div><div class="footer"><p>Prayer App Admin Portal</p></div></div></body></html>',
  'Welcome to Prayer App Admin Portal!

Hi {{name}},

You''ve been granted admin access to the Prayer App.

To sign in:
1. Go to {{adminLink}}
2. Enter your email: {{email}}
3. Click "Send Magic Link"
4. Check your email for the sign-in link

Prayer App uses passwordless authentication for security.

---
Prayer App Admin Portal',
  'Sent to newly added admin users with access information'
),
(
  'admin_notification_prayer',
  'Admin Notification - New Prayer',
  'New Prayer Request: {{prayerTitle}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>New Prayer Request</title></head><body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(to right, #ef4444, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;"><h1 style="color: white; margin: 0; font-size: 24px;">🙏 New Prayer Request</h1></div><div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"><h2 style="color: #1f2937; margin-top: 0;">{{prayerTitle}}</h2><p><strong>Requested by:</strong> {{requesterName}}</p><p><strong>Description:</strong></p><p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">{{prayerDescription}}</p><div style="margin-top: 30px; text-align: center;"><a href="{{adminLink}}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Admin Portal</a></div></div><div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;"><p>This is an automated notification from your prayer app.</p></div></body></html>',
  'New Prayer Request

Prayer: {{prayerTitle}}
Requested by: {{requesterName}}

Description:
{{prayerDescription}}

Please review this prayer request in the admin portal.
{{adminLink}}

---
This is an automated notification from your prayer app.',
  'Admin notification when a new prayer request is pending approval. Variables: {{prayerTitle}}, {{requesterName}}, {{prayerDescription}}, {{adminLink}}'
),
(
  'approved_prayer',
  'Approved Prayer - Subscriber Notification',
  'New Prayer Request: {{prayerTitle}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>New Prayer Request</title></head><body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;"><h1 style="color: white; margin: 0; font-size: 24px;">🙏 New Prayer Request</h1></div><div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"><h2 style="color: #1f2937; margin-top: 0;">{{prayerTitle}}</h2><div style="margin-bottom: 15px;"><p style="margin: 5px 0;"><strong>For:</strong> {{prayerFor}}</p><p style="margin: 5px 0;"><strong>Requested by:</strong> {{requesterName}}</p><p style="margin: 5px 0;"><strong>Status:</strong> {{status}}</p></div><p><strong>Description:</strong></p><p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">{{prayerDescription}}</p><div style="margin-top: 30px; text-align: center;"><a href="{{appLink}}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Prayer</a></div></div><div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;"><p>This prayer has been approved and is now active. Join us in prayer!</p></div></body></html>',
  'New Prayer Request: {{prayerTitle}}

For: {{prayerFor}}
Requested by: {{requesterName}}

{{prayerDescription}}

This prayer has been approved and is now active. Join us in prayer!',
  'Sent to all subscribers when a prayer is approved. Variables: {{prayerTitle}}, {{prayerFor}}, {{requesterName}}, {{status}}, {{prayerDescription}}, {{appLink}}'
),
(
  'approved_update',
  'Approved Update - Subscriber Notification',
  'Prayer Update: {{prayerTitle}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Prayer Update</title></head><body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(to right, #3b82f6, #2563eb); padding: 20px; border-radius: 8px 8px 0 0;"><h1 style="color: white; margin: 0; font-size: 24px;">💬 Prayer Update</h1></div><div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"><h2 style="color: #1f2937; margin-top: 0;">Update for: {{prayerTitle}}</h2><p style="margin: 5px 0 15px 0;"><strong>Posted by:</strong> {{authorName}}</p><p><strong>Update:</strong></p><p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">{{updateContent}}</p><div style="margin-top: 30px; text-align: center;"><a href="{{appLink}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Prayer</a></div></div><div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;"><p>Let''s continue to lift this prayer up together.</p></div></body></html>',
  'Prayer Update: {{prayerTitle}}

Posted by: {{authorName}}

{{updateContent}}

Let''s continue to lift this prayer up together.',
  'Sent to all subscribers when a prayer update is approved. Variables: {{prayerTitle}}, {{authorName}}, {{updateContent}}, {{appLink}}'
),
(
  'requester_approval',
  'Requester Approval Notification',
  'Your Prayer Request Has Been Approved: {{prayerTitle}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Prayer Approved</title></head><body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;"><h1 style="color: white; margin: 0; font-size: 24px;">✅ Prayer Approved</h1></div><div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"><h2 style="color: #1f2937; margin-top: 0;">{{prayerTitle}}</h2><p>Great news! Your prayer request has been approved and is now live on the prayer app.</p><p><strong>For:</strong> {{prayerFor}}</p><p><strong>Description:</strong></p><p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">{{prayerDescription}}</p><p style="margin-top: 20px;">Your prayer is now being lifted up by our community. You will receive updates via email when the prayer status changes or when updates are posted.</p><div style="margin-top: 30px; text-align: center;"><a href="{{appLink}}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Your Prayer</a></div></div><div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;"><p>Thank you for your faithfulness in prayer!</p></div></body></html>',
  'Great news! Your prayer request has been approved and is now live on the prayer app.

Prayer: {{prayerTitle}}
For: {{prayerFor}}

{{prayerDescription}}

You will receive updates via email when the prayer status changes or when updates are posted.

---
Thank you for your faithfulness in prayer!',
  'Sent to the requester when their prayer is approved. Variables: {{prayerTitle}}, {{prayerFor}}, {{prayerDescription}}, {{appLink}}'
),
(
  'prayer_answered',
  'Prayer Answered - Subscriber Notification',
  '🎉 Prayer Answered: {{prayerTitle}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Prayer Answered</title></head><body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;"><h1 style="color: white; margin: 0; font-size: 24px;">🎉 Prayer Answered!</h1></div><div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"><div style="display: inline-block; background: #10b981; color: white; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 15px;">✓ Answered Prayer</div><h2 style="color: #1f2937; margin-top: 0;">Update for: {{prayerTitle}}</h2><p style="margin: 5px 0 15px 0;"><strong>Posted by:</strong> {{authorName}}</p><p><strong>Update:</strong></p><p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">{{updateContent}}</p><div style="margin-top: 30px; text-align: center;"><a href="{{appLink}}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Prayer</a></div></div><div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;"><p>Let''s give thanks and praise for this answered prayer!</p></div></body></html>',
  'Great news! A prayer has been answered!

Prayer: {{prayerTitle}}
Posted by: {{authorName}}

Update: {{updateContent}}

Let''s give thanks and praise for this answered prayer!',
  'Sent to all subscribers when a prayer is marked as answered. Variables: {{prayerTitle}}, {{authorName}}, {{updateContent}}, {{appLink}}'
),
(
  'prayer_reminder',
  'Prayer Reminder - Update Request',
  'Reminder: Update Your Prayer Request - {{prayerTitle}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Prayer Update Reminder</title></head><body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(to right, #3b82f6, #2563eb); padding: 20px; border-radius: 8px 8px 0 0;"><h1 style="color: white; margin: 0; font-size: 24px;">⏰ Prayer Update Reminder</h1></div><div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"><h2 style="color: #1f2937; margin-top: 0;">Hello {{requesterName}},</h2><p style="margin-bottom: 20px;">This is a friendly reminder to update your prayer request if there have been any changes or answered prayers.</p><div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0;"><p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px;"><strong>Your Prayer Request:</strong></p><p style="margin: 0 0 10px 0; color: #1e40af; font-weight: 600; font-size: 18px;">{{prayerTitle}}</p><p style="margin: 0; color: #1e3a8a;"><strong>Prayer For:</strong> {{prayerFor}}</p></div><div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 20px 0;"><p style="margin: 0; color: #92400e; font-size: 14px;"><strong>💡 Why update?</strong><br>• Share how God is working in this situation<br>• Let others know if prayers have been answered<br>• Update the prayer need if circumstances have changed<br>• Encourage others by sharing God''s faithfulness</p></div><p style="margin-top: 20px; font-size: 14px; color: #6b7280;">To add an update, simply visit the prayer app and click the "Add Update" button on your prayer request.</p><div style="margin-top: 30px; text-align: center;"><a href="{{appLink}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Visit Prayer App</a></div></div><div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;"><p>Praying with you,<br><strong>The Prayer Team</strong></p><p style="font-size: 12px; color: #9ca3af;">You''re receiving this because you submitted a prayer request. Updates help our community stay connected and see how God is working.</p></div></body></html>',
  'Hello {{requesterName}},

This is a friendly reminder to update your prayer request if there have been any changes or answered prayers.

Prayer: {{prayerTitle}}
For: {{prayerFor}}

💡 Why update?
• Share how God is working in this situation
• Let others know if prayers have been answered
• Update the prayer need if circumstances have changed
• Encourage others by sharing God''s faithfulness

To add an update, simply visit the prayer app and click the "Add Update" button on your prayer request.

{{appLink}}

---
Praying with you,
The Prayer Team',
  'Sent to prayer requesters as a reminder to add updates'
),
(
  'denied_prayer',
  'Denied Prayer - Requester Notification',
  'Prayer Request Not Approved: {{prayerTitle}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Prayer Request Not Approved</title></head><body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(to right, #ef4444, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;"><h1 style="color: white; margin: 0; font-size: 24px;">📋 Prayer Request Status</h1></div><div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"><h2 style="color: #1f2937; margin-top: 0;">{{prayerTitle}}</h2><p style="margin-bottom: 15px;">Thank you for submitting your prayer request. After careful review, we are unable to approve this request at this time.</p><div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0;"><p style="margin: 0; color: #991b1b;"><strong>Reason:</strong></p><p style="margin: 10px 0 0 0; color: #991b1b;">{{denialReason}}</p></div><p style="margin-top: 20px;"><strong>Your Submission:</strong></p><p style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">{{prayerDescription}}</p><p style="margin-top: 20px; font-size: 14px; color: #6b7280;">If you have questions or would like to discuss this decision, please feel free to contact the administrator.</p><div style="margin-top: 30px; text-align: center;"><a href="{{appLink}}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Visit Prayer App</a></div></div><div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;"><p>This is an automated notification from your prayer app.</p></div></body></html>',
  'Prayer Request: {{prayerTitle}}

After careful review, we are unable to approve this request at this time.

Reason: {{denialReason}}

Your Submission: {{prayerDescription}}

If you have questions, please contact the administrator.

---
This is an automated notification from your prayer app.',
  'Sent to the requester when their prayer is denied. Variables: {{prayerTitle}}, {{denialReason}}, {{prayerDescription}}, {{appLink}}'
),
(
  'denied_update',
  'Denied Update - Requester Notification',
  'Prayer Update Not Approved: {{prayerTitle}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Prayer Update Not Approved</title></head><body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(to right, #ef4444, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;"><h1 style="color: white; margin: 0; font-size: 24px;">💬 Update Status</h1></div><div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"><h2 style="color: #1f2937; margin-top: 0;">Update for: {{prayerTitle}}</h2><p style="margin-bottom: 15px;">Thank you for submitting an update. After careful review, we are unable to approve this update at this time.</p><div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 6px; margin: 20px 0;"><p style="margin: 0; color: #991b1b;"><strong>Reason:</strong></p><p style="margin: 10px 0 0 0; color: #991b1b;">{{denialReason}}</p></div><p style="margin-top: 20px;"><strong>Your Update:</strong></p><p style="background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb;">{{updateContent}}</p><p style="margin-top: 20px; font-size: 14px; color: #6b7280;">If you have questions or would like to discuss this decision, please feel free to contact the administrator.</p><div style="margin-top: 30px; text-align: center;"><a href="{{appLink}}" style="background: #6b7280; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Visit Prayer App</a></div></div><div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;"><p>This is an automated notification from your prayer app.</p></div></body></html>',
  'Update for: {{prayerTitle}}

After careful review, we are unable to approve this update at this time.

Reason: {{denialReason}}

Your Update: {{updateContent}}

If you have questions, please contact the administrator.

---
This is an automated notification from your prayer app.',
  'Sent to the update author when their update is denied. Variables: {{prayerTitle}}, {{denialReason}}, {{updateContent}}, {{appLink}}'
)
ON CONFLICT (template_key) DO NOTHING;
