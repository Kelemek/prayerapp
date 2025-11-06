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
            <div class="code">${code}</div>
            <p>This code will expire in 15 minutes.</p>
            <p>If you didn't request this code, you can safely ignore this email.</p>
          </div>
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;
}

function generateVerificationText(code: string, actionType: string): string {
  const actionDescription = getActionDescription(actionType);
  
  return `
Verification Code

You requested to ${actionDescription}. Please use the verification code below:

${code}

This code will expire in 15 minutes.

If you didn't request this code, you can safely ignore this email.

---
This is an automated message. Please do not reply to this email.
  `.trim();
}
