import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    console.log('📧 Received email request');
    
    const { to, subject, body, html } = await req.json()
    
    console.log('📧 Email details:', {
      to: Array.isArray(to) ? to.join(', ') : to,
      subject,
      hasBody: !!body,
      hasHtml: !!html
    });

    // Validate required fields
    if (!to || !subject) {
      console.error('❌ Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject' }),
        {
          status: 400,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Validate API key
    if (!RESEND_API_KEY) {
      console.error('❌ RESEND_API_KEY is not set in environment');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }
    
    console.log('✅ API key found, sending email...');

    // TEMPORARY: When using onboarding@resend.dev, you can only send to markdlarson@me.com
    // To send to other emails, verify a domain at resend.com/domains
    const recipientList = Array.isArray(to) ? to : [to];
    const allowedTestEmail = 'markdlarson@me.com';
    
    // Filter to only allowed email for testing with onboarding@resend.dev
    const filteredRecipients = recipientList.filter(email => 
      email.toLowerCase().trim() === allowedTestEmail.toLowerCase()
    );
    
    if (filteredRecipients.length === 0) {
      console.log('⚠️ No valid recipients for test email - adding test email');
      filteredRecipients.push(allowedTestEmail);
    }
    
    console.log('📧 Sending to:', filteredRecipients.join(', '));

    // Send email via Resend
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Prayer Requests <onboarding@resend.dev>', // TODO: Replace with verified domain
        to: filteredRecipients,
        subject: subject + ' [TEST MODE - Limited Recipients]',
        text: body,
        html: html || body,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('❌ Resend API error:', data)
      return new Response(
        JSON.stringify({ error: 'Failed to send email', details: data }),
        {
          status: response.status,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }
    
    console.log('✅ Email sent successfully! Message ID:', data.id);

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error in send-notification function:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
