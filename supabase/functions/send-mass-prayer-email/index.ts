import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const MAILCHIMP_API_KEY = Deno.env.get('MAILCHIMP_API_KEY')
const MAILCHIMP_SERVER_PREFIX = Deno.env.get('MAILCHIMP_SERVER_PREFIX') || 'us21'
const MAILCHIMP_AUDIENCE_ID = Deno.env.get('MAILCHIMP_AUDIENCE_ID')

serve(async (req) => {
  // Handle CORS
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
    console.log('📧 Mailchimp: Received request')
    
    const { action, subject, htmlContent, textContent, email, name, fromName, replyTo } = await req.json()

    // Validate environment variables
    if (!MAILCHIMP_API_KEY || !MAILCHIMP_AUDIENCE_ID) {
      console.error('❌ Mailchimp not configured')
      return new Response(
        JSON.stringify({ error: 'Mailchimp not configured. Please set MAILCHIMP_API_KEY and MAILCHIMP_AUDIENCE_ID' }),
        {
          status: 500,
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        }
      )
    }

    // Handle different actions
    if (action === 'add_subscriber') {
      // Add or update single subscriber
      console.log(`📧 Adding subscriber: ${email}`)
      await addOrUpdateSubscriber(email, name)
      return new Response(
        JSON.stringify({ success: true, email, message: 'Subscriber added' }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      )
    }

    if (action === 'remove_subscriber') {
      // Remove/unsubscribe subscriber
      console.log(`📧 Removing subscriber: ${email}`)
      await removeSubscriber(email)
      return new Response(
        JSON.stringify({ success: true, email, message: 'Subscriber removed' }),
        { 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      )
    }

    // Default action: Send campaign to entire audience
    console.log(`📧 Sending campaign: ${subject}`)

    // 1. Create campaign
    console.log('📧 Step 1: Creating Mailchimp campaign...')
    const campaign = await createCampaign(subject, fromName, replyTo)
    console.log(`✅ Campaign created: ${campaign.id}`)
    
    // 2. Set campaign content
    console.log('📧 Step 2: Setting campaign content...')
    await setCampaignContent(campaign.id, htmlContent, textContent)
    console.log('✅ Content set')
    
    // 3. Send campaign
    console.log('📧 Step 3: Sending campaign...')
    await sendCampaign(campaign.id)
    console.log('✅ Campaign sent!')

    return new Response(
      JSON.stringify({ 
        success: true, 
        campaignId: campaign.id,
        message: 'Campaign sent to all subscribers'
      }),
      { 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )
  } catch (error) {
    console.error('❌ Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send campaign',
        details: error.toString()
      }),
      { 
        status: 500, 
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    )
  }
})

async function addOrUpdateSubscriber(email: string, name?: string) {
  const emailHash = await hashEmail(email)
  const url = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members/${emailHash}`
  
  const mergeFields: Record<string, string> = {}
  if (name) {
    // Split name into first and last for Mailchimp
    const nameParts = name.trim().split(' ')
    mergeFields.FNAME = nameParts[0] || ''
    mergeFields.LNAME = nameParts.slice(1).join(' ') || ''
  }
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: email,
      status_if_new: 'subscribed',
      status: 'subscribed',
      merge_fields: mergeFields,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to add subscriber: ${JSON.stringify(error)}`)
  }

  return await response.json()
}

async function removeSubscriber(email: string) {
  const emailHash = await hashEmail(email)
  const url = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members/${emailHash}`
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'unsubscribed',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to remove subscriber: ${JSON.stringify(error)}`)
  }

  return await response.json()
}

async function createCampaign(subject: string, fromName?: string, replyTo?: string) {
  const url = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'regular',
      recipients: {
        list_id: MAILCHIMP_AUDIENCE_ID,
      },
      settings: {
        subject_line: subject,
        from_name: fromName || 'Prayer App',
        reply_to: replyTo || 'noreply@yourchurch.com',
        title: `Prayer Email - ${new Date().toISOString()}`,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to create campaign: ${JSON.stringify(error)}`)
  }

  return await response.json()
}

async function setCampaignContent(campaignId: string, html: string, text: string) {
  const url = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns/${campaignId}/content`
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      html: html,
      plain_text: text,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to set content: ${JSON.stringify(error)}`)
  }

  return await response.json()
}

async function sendCampaign(campaignId: string) {
  const url = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns/${campaignId}/actions/send`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(`Failed to send campaign: ${JSON.stringify(error)}`)
  }

  return true
}

async function hashEmail(email: string): Promise<string> {
  const normalized = email.toLowerCase().trim()
  const encoder = new TextEncoder()
  const data = encoder.encode(normalized)
  const hashBuffer = await crypto.subtle.digest('MD5', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
