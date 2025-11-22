-- Add admin notification templates for updates and deletions
-- This migration adds templates for admin_notification_update and admin_notification_deletion

INSERT INTO email_templates (template_key, name, subject, html_body, text_body, description)
VALUES
(
  'admin_notification_update',
  'Admin Notification - Prayer Update',
  'New Prayer Update: {{prayerTitle}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>New Prayer Update</title></head><body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(to right, #3b82f6, #2563eb); padding: 20px; border-radius: 8px 8px 0 0;"><h1 style="color: white; margin: 0; font-size: 24px;">💬 New Prayer Update</h1></div><div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"><h2 style="color: #1f2937; margin-top: 0;">Update for: {{prayerTitle}}</h2><p><strong>Posted by:</strong> {{authorName}}</p><p><strong>Update Content:</strong></p><p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">{{updateContent}}</p><div style="margin-top: 30px; text-align: center;"><a href="{{adminLink}}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Admin Portal</a></div></div><div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;"><p>This is an automated notification from your prayer app.</p></div></body></html>',
  'New Prayer Update

Prayer: {{prayerTitle}}
Posted by: {{authorName}}

Update Content:
{{updateContent}}

Please review this prayer update in the admin portal.
{{adminLink}}

---
This is an automated notification from your prayer app.',
  'Admin notification when a new prayer update is pending approval. Variables: {{prayerTitle}}, {{authorName}}, {{updateContent}}, {{adminLink}}'
),
(
  'admin_notification_deletion',
  'Admin Notification - Deletion Request',
  'Deletion Request: {{prayerTitle}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Deletion Request</title></head><body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(to right, #f59e0b, #d97706); padding: 20px; border-radius: 8px 8px 0 0;"><h1 style="color: white; margin: 0; font-size: 24px;">🗑️ Deletion Request</h1></div><div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"><h2 style="color: #1f2937; margin-top: 0;">{{prayerTitle}}</h2><p><strong>Requested by:</strong> {{requestedBy}}</p><p><strong>Reason for deletion:</strong></p><p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">{{reason}}</p><div style="margin-top: 30px; text-align: center;"><a href="{{adminLink}}" style="background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Admin Portal</a></div></div><div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;"><p>This is an automated notification from your prayer app.</p></div></body></html>',
  'Deletion Request

Prayer: {{prayerTitle}}
Requested by: {{requestedBy}}

Reason for deletion:
{{reason}}

Please review this deletion request in the admin portal.
{{adminLink}}

---
This is an automated notification from your prayer app.',
  'Admin notification when a deletion request is pending approval. Variables: {{prayerTitle}}, {{requestedBy}}, {{reason}}, {{adminLink}}'
)
ON CONFLICT (template_key) DO NOTHING;
