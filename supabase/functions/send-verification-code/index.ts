// @ts-nocheck - Deno Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

// Generate a random code of specified length
function generateCode(length: number = 6): string {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(min + Math.random() * (max - min + 1)).toString();
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
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
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
        error: 'Invalid action type',
        details: `Action type must be one of: ${validActionTypes.join(', ')}`
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Get code length from settings (default: 6)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    const { data: settings } = await supabase
      .from('admin_settings')
      .select('verification_code_length')
      .eq('id', 1)
      .maybeSingle();

    const codeLength = settings?.verification_code_length || 6;

    // Generate verification code
    const code = generateCode(codeLength);
    console.log(`✅ Generated ${codeLength}-digit code`);

    // Calculate expiry time (15 minutes from now)
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    // Store verification code in database
    const { data: codeRecord, error: insertError } = await supabase
      .from('verification_codes')
      .insert({
        email: email.toLowerCase().trim(),
        code,
        action_type: actionType,
        action_data: actionData,
        expires_at: expiresAt
      })
      .select()
      .single();

    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      return new Response(JSON.stringify({
        error: 'Failed to create verification code',
        details: insertError.message
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    console.log(`✅ Verification code stored: ${codeRecord.id}`);

    // Send verification email via new unified email service
    const { error: emailError } = await supabase.functions.invoke('send-email', {
      body: {
        to: email,
        subject: `Your verification code: ${code}`,
        htmlBody: generateVerificationHTML(code, actionType),
        textBody: generateVerificationText(code, actionType)
      }
    });

    if (emailError) {
      console.error('❌ Email send error:', emailError);
      // Don't fail the whole request - code is already stored
      // User can still use it even if email fails
      console.warn('⚠️ Verification code created but email failed to send');
    } else {
      console.log('✅ Verification email sent');
    }

    return new Response(JSON.stringify({
      success: true,
      codeId: codeRecord.id,
      expiresAt: codeRecord.expires_at
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
});

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

function generateVerificationHTML(code: string, actionType: string): string {
  const actionDescription = getActionDescription(actionType);
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f3f4f6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(to right, #4F46E5, #6366f1); color: white; padding: 30px 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background-color: #ffffff; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .code-container { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 12px; margin: 30px 0; text-align: center; }
          .code-label { color: #fff; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 15px; opacity: 0.9; }
          .code { font-size: 48px; font-weight: bold; color: #ffffff; letter-spacing: 12px; font-family: 'Courier New', monospace; user-select: all; -webkit-user-select: all; -moz-user-select: all; -ms-user-select: all; cursor: pointer; padding: 10px; border-radius: 8px; background-color: rgba(255,255,255,0.1); display: inline-block; }
          .instructions { background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 15px 20px; border-radius: 4px; margin: 20px 0; }
          .instructions-title { font-weight: 600; color: #1e40af; margin: 0 0 8px 0; font-size: 14px; }
          .instructions-text { margin: 0; font-size: 14px; color: #1e40af; }
          .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px 20px; border-radius: 4px; margin: 20px 0; }
          .warning-text { margin: 0; font-size: 14px; color: #92400e; }
          .footer { text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 13px; }
          @media only screen and (max-width: 600px) {
            .code { font-size: 36px; letter-spacing: 8px; }
            .content { padding: 30px 20px; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔐 Verification Code</h1>
          </div>
          <div class="content">
            <p style="font-size: 16px; margin-top: 0;">You requested to ${actionDescription}. Please use the verification code below:</p>
            
            <div class="code-container">
              <div class="code-label">Your Verification Code</div>
              <div class="code" title="Click to select code">${code}</div>
            </div>

            <div class="instructions">
              <p class="instructions-title">💡 Easy Code Entry:</p>
              <p class="instructions-text">
                <strong>Tap or click the code above to select it</strong>, then copy and paste it into the verification dialog. 
                You can also paste the code directly into the first input field - it will auto-fill all digits.
              </p>
            </div>

            <div class="warning">
              <p class="warning-text">
                ⏰ <strong>This code will expire in 15 minutes.</strong> If you didn't request this code, you can safely ignore this email.
              </p>
            </div>
          </div>
          <div class="footer">
            <p>This is an automated message from your Prayer App.<br>Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateVerificationText(code: string, actionType: string): string {
  const actionDescription = getActionDescription(actionType);
  
  return `
🔐 VERIFICATION CODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

You requested to ${actionDescription}.

YOUR CODE: ${code}

💡 TIP: Copy the code above and paste it into the verification dialog.
You can paste it directly into the first input field to auto-fill all digits.

⏰ This code will expire in 15 minutes.

If you didn't request this code, you can safely ignore this email.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
This is an automated message from your Prayer App.
Please do not reply to this email.
  `.trim();
}
