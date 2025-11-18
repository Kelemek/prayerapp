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
$$ LANGUAGE plpgsql;

CREATE TRIGGER email_templates_updated_at
BEFORE UPDATE ON email_templates
FOR EACH ROW
EXECUTE FUNCTION update_email_templates_updated_at();

-- Enable RLS
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read templates
CREATE POLICY "Allow authenticated users to read templates" ON email_templates
  FOR SELECT
  USING (auth.role() = 'authenticated_user' OR auth.role() = 'service_role');

-- Only admins can update templates
CREATE POLICY "Only service role can update templates" ON email_templates
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Seed with default templates
INSERT INTO email_templates (template_key, name, subject, html_body, text_body, description)
VALUES
(
  'verification_code',
  'Verification Code',
  'Your verification code: {{code}}',
  '<!DOCTYPE html>
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
        <p>You requested to {{actionDescription}}. Please use the verification code below:</p>
        <div class="code">{{code}}</div>
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn''t request this code, you can safely ignore this email.</p>
      </div>
      <div class="footer">
        <p>This is an automated message. Please do not reply to this email.</p>
      </div>
    </div>
  </body>
</html>',
  'Verification Code

You requested to {{actionDescription}}. Please use the verification code below:

{{code}}

This code will expire in 15 minutes.

If you didn''t request this code, you can safely ignore this email.

---
This is an automated message. Please do not reply to this email.',
  'Email sent to verify user actions like prayer submissions and deletions'
),
(
  'admin_invitation',
  'Admin Invitation',
  'Admin Access Granted - Prayer App',
  '<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
      .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
      .button { display: inline-block; background: #dc2626; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
      .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1 style="margin: 0;">🙏 Prayer App</h1>
        <p style="margin: 10px 0 0 0;">Admin Access Granted</p>
      </div>
      <div class="content">
        <h2>Welcome, {{name}}!</h2>
        <p>You''ve been granted admin access to the Prayer App. As an admin, you can:</p>
        <ul>
          <li>Review and approve prayer requests</li>
          <li>Manage prayer updates and deletions</li>
          <li>Configure email settings and subscribers</li>
          <li>Manage prayer prompts and types</li>
          <li>Access the full admin portal</li>
        </ul>
        
        <p>To sign in to the admin portal:</p>
        <ol>
          <li>Go to the admin login page link at the bottom of the main site</li>
          <li>Enter your email address: <strong>{{email}}</strong></li>
          <li>Click "Send Magic Link"</li>
          <li>Check your email for the secure sign-in link</li>
        </ol>
        
        <div style="text-align: center;">
          <a href="{{adminLink}}" class="button">Go to Admin Portal</a>
        </div>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          <strong>Note:</strong> Prayer App uses passwordless authentication. You''ll receive a magic link via email each time you sign in.
        </p>
      </div>
      <div class="footer">
        <p>Prayer App Admin Portal</p>
      </div>
    </div>
  </body>
</html>',
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
  'New Prayer Request: {{title}}',
  '<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Prayer Request</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(to right, #ef4444, #dc2626); padding: 20px; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">🙏 New Prayer Request</h1>
    </div>
    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <h2 style="color: #1f2937; margin-top: 0;">{{title}}</h2>
      <p><strong>Requested by:</strong> {{requester}}</p>
      <p><strong>Description:</strong></p>
      <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">{{description}}</p>
      <div style="margin-top: 30px; text-align: center;">
        <a href="{{adminLink}}" style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Admin Portal</a>
      </div>
    </div>
    <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
      <p>This is an automated notification from your prayer app.</p>
    </div>
  </body>
</html>',
  'New Prayer Request

Prayer: {{title}}
Requested by: {{requester}}

Description:
{{description}}

Please review this prayer request in the admin portal.
{{adminLink}}

---
This is an automated notification from your prayer app.',
  'Admin notification when a new prayer request is pending approval'
),
(
  'approved_prayer',
  'Approved Prayer - Subscriber Notification',
  'New Prayer Request: {{title}}',
  '<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Prayer Request</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">🙏 New Prayer Request</h1>
    </div>
    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <h2 style="color: #1f2937; margin-top: 0;">{{title}}</h2>
      <div style="margin-bottom: 15px;">
        <p style="margin: 5px 0;"><strong>For:</strong> {{prayerFor}}</p>
        <p style="margin: 5px 0;"><strong>Requested by:</strong> {{requester}}</p>
        <p style="margin: 5px 0;"><strong>Status:</strong> {{status}}</p>
      </div>
      <p><strong>Description:</strong></p>
      <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">{{description}}</p>
      <div style="margin-top: 30px; text-align: center;">
        <a href="{{appLink}}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Prayer</a>
      </div>
    </div>
    <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
      <p>This prayer has been approved and is now active. Join us in prayer!</p>
    </div>
  </body>
</html>',
  'New Prayer Request: {{title}}

For: {{prayerFor}}
Requested by: {{requester}}

{{description}}

This prayer has been approved and is now active. Join us in prayer!',
  'Sent to all subscribers when a prayer is approved'
),
(
  'approved_update',
  'Approved Update - Subscriber Notification',
  'Prayer Update: {{title}}',
  '<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prayer Update</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(to right, #3b82f6, #2563eb); padding: 20px; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">💬 Prayer Update</h1>
    </div>
    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <h2 style="color: #1f2937; margin-top: 0;">Update for: {{prayerTitle}}</h2>
      <p style="margin: 5px 0 15px 0;"><strong>Posted by:</strong> {{author}}</p>
      <p><strong>Update:</strong></p>
      <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">{{content}}</p>
      <div style="margin-top: 30px; text-align: center;">
        <a href="{{appLink}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Prayer</a>
      </div>
    </div>
    <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
      <p>Let''s continue to lift this prayer up together.</p>
    </div>
  </body>
</html>',
  'Prayer Update: {{prayerTitle}}

Posted by: {{author}}

{{content}}

Let''s continue to lift this prayer up together.',
  'Sent to all subscribers when a prayer update is approved'
),
(
  'requester_approval',
  'Requester Approval Notification',
  'Your Prayer Request Has Been Approved: {{title}}',
  '<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Prayer Approved</title>
  </head>
  <body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="background: linear-gradient(to right, #10b981, #059669); padding: 20px; border-radius: 8px 8px 0 0;">
      <h1 style="color: white; margin: 0; font-size: 24px;">✅ Prayer Approved</h1>
    </div>
    <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
      <h2 style="color: #1f2937; margin-top: 0;">{{title}}</h2>
      <p>Great news! Your prayer request has been approved and is now live on the prayer app.</p>
      <p><strong>For:</strong> {{prayerFor}}</p>
      <p><strong>Description:</strong></p>
      <p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #10b981;">{{description}}</p>
      <p style="margin-top: 20px;">Your prayer is now being lifted up by our community. You will receive updates via email when the prayer status changes or when updates are posted.</p>
      <div style="margin-top: 30px; text-align: center;">
        <a href="{{appLink}}" style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Your Prayer</a>
      </div>
    </div>
    <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
      <p>Thank you for your faithfulness in prayer!</p>
    </div>
  </body>
</html>',
  'Great news! Your prayer request has been approved and is now live on the prayer app.

Prayer: {{title}}
For: {{prayerFor}}

{{description}}

You will receive updates via email when the prayer status changes or when updates are posted.

---
Thank you for your faithfulness in prayer!',
  'Sent to the requester when their prayer is approved'
)
ON CONFLICT (template_key) DO NOTHING;
