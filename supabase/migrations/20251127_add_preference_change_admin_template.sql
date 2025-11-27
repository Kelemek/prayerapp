-- Add admin notification template for preference change requests

INSERT INTO email_templates (template_key, name, subject, html_body, text_body, description)
VALUES
(
  'admin_notification_preference_change',
  'Admin Notification - Preference Change Request',
  'Notification Preference Change: {{name}}',
  '<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Preference Change Request</title></head><body style="font-family: -apple-system, BlinkMacSystemFont, ''Segoe UI'', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;"><div style="background: linear-gradient(to right, #8b5cf6, #7c3aed); padding: 20px; border-radius: 8px 8px 0 0;"><h1 style="color: white; margin: 0; font-size: 24px;">⚙️ Notification Preference Change</h1></div><div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;"><h2 style="color: #1f2937; margin-top: 0;">{{preferenceStatus}}</h2><p><strong>Name:</strong> {{name}}</p><p><strong>Email:</strong> {{email}}</p><p><strong>Request:</strong></p><p style="background: white; padding: 15px; border-radius: 6px; border-left: 4px solid #8b5cf6;">{{preferenceDescription}}</p><div style="margin-top: 30px; text-align: center;"><a href="{{adminLink}}" style="background: #8b5cf6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Go to Admin Portal</a></div></div><div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;"><p>This is an automated notification from your prayer app.</p></div></body></html>',
  'Notification Preference Change

Name: {{name}}
Email: {{email}}

Request: {{preferenceStatus}}
{{preferenceDescription}}

Please review and approve/deny this request in the admin portal.
{{adminLink}}

---
This is an automated notification from your prayer app.',
  'Admin notification when a notification preference change is pending approval. Variables: {{name}}, {{email}}, {{preferenceStatus}}, {{preferenceDescription}}, {{adminLink}}'
)
ON CONFLICT (template_key) DO NOTHING;
