// @ts-nocheck - Deno Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const RESEND_FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'noreply@yourdomain.com';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Generate a random code of specified length
function generateCode(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
}

// Get action description for email
function getActionDescription(actionType: string): string {
  const descriptions = {
    'prayer_submission': 'submit a prayer request',
    'prayer_update': 'add a prayer update',
    'deletion_request': 'request a prayer deletion',
    'update_deletion_request': 'request an update deletion',
    'status_change_request': 'request a status change',
    'preference_change': 'update your email preferences'
  };
  return descriptions[actionType] || 'perform an action';
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
      }
    });
  }

  try {
    console.log('📧 Send verification code: Received request');

    // Validate environment variables
    if (!RESEND_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing required environment variables');
      return new Response(JSON.stringify({
        error: 'Server configuration error',
        details: 'Missing required environment variables'
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Parse request body
    const { email, actionType, actionData } = await req.json();

    // Validate inputs
    if (!email || !actionType || !actionData) {
      return new Response(JSON.stringify({
        error: 'Missing required fields',
        details: 'email, actionType, and actionData are required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({
        error: 'Invalid email format'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Validate action type
    const validActionTypes = [
      'prayer_submission',
      'prayer_update',
      'deletion_request',
      'update_deletion_request',
      'status_change_request',
      'preference_change'
    ];
    if (!validActionTypes.includes(actionType)) {
      return new Response(JSON.stringify({
        error: 'Invalid action type'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Fetch admin settings to get code length
    console.log('⚙️ Fetching admin settings for code length...');
    const settingsResponse = await fetch(`${SUPABASE_URL}/rest/v1/admin_settings?id=eq.1`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    let codeLength = 6; // Default to 6 digits
    if (settingsResponse.ok) {
      const settings = await settingsResponse.json();
      if (settings && settings.length > 0 && settings[0].verification_code_length) {
        codeLength = settings[0].verification_code_length;
        console.log(`✅ Using code length from settings: ${codeLength}`);
      } else {
        console.log(`⚠️ No code length setting found, using default: ${codeLength}`);
      }
    } else {
      console.warn('⚠️ Failed to fetch admin settings, using default code length: 6');
    }

    // Generate code with specified length
    const code = generateCode(codeLength);
    console.log(`🔢 Generated ${codeLength}-digit code for ${email}: ${code}`);

    // Calculate expiration time (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Store verification code in database
    const insertResponse = await fetch(`${SUPABASE_URL}/rest/v1/verification_codes`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        email: email.toLowerCase().trim(),
        code,
        action_type: actionType,
        action_data: actionData,
        expires_at: expiresAt
      })
    });

    if (!insertResponse.ok) {
      const error = await insertResponse.text();
      console.error('❌ Failed to store verification code:', error);
      throw new Error(`Database error: ${error}`);
    }

    const [verificationRecord] = await insertResponse.json();
    const codeId = verificationRecord.id;
    console.log(`✅ Stored verification code with ID: ${codeId}`);

    // Send email via Resend
    const actionDescription = getActionDescription(actionType);
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .code-box { background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
            .code { font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #667eea; font-family: 'Courier New', monospace; }
            .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 14px; }
            .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🙏 Prayer App</h1>
              <p style="margin: 10px 0 0 0;">Email Verification</p>
            </div>
            <div class="content">
              <h2>Verification Code</h2>
              <p>You requested to <strong>${actionDescription}</strong> on the Prayer App.</p>
              <p>Please use this verification code to complete your request:</p>
              
              <div class="code-box">
                <div class="code">${code}</div>
              </div>
              
              <div class="warning">
                <strong>⏰ This code expires in 15 minutes</strong>
              </div>
              
              <p style="color: #6b7280; font-size: 14px;">If you didn't request this code, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>Prayer App - Connecting hearts in prayer</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailText = `
Prayer App - Email Verification

You requested to ${actionDescription} on the Prayer App.

Your verification code is: ${code}

This code will expire in 15 minutes.

If you didn't request this code, you can safely ignore this email.

---
Prayer App
    `;

    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: `Prayer App <${RESEND_FROM_EMAIL}>`,
        to: email,
        subject: `Your Verification Code: ${code}`,
        html: emailHtml,
        text: emailText
      })
    });

    if (!emailResponse.ok) {
      const error = await emailResponse.json();
      console.error('❌ Failed to send email:', error);
      throw new Error(`Email service error: ${JSON.stringify(error)}`);
    }

    const emailResult = await emailResponse.json();
    console.log(`✅ Email sent successfully: ${emailResult.id}`);

    return new Response(JSON.stringify({
      success: true,
      codeId,
      expiresAt,
      message: `Verification code sent to ${email}`
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('❌ Error in send-verification-code:', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : String(error)
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});
