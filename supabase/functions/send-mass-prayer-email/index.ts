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
  // Skip obviously fake emails that Mailchimp will reject
  const fakeEmailPatterns = ['@example.com', '@test.com', '@fake.com'];
  if (fakeEmailPatterns.some(pattern => email.toLowerCase().includes(pattern))) {
    console.warn(`⚠️ Skipping fake email: ${email}`);
    return { skipped: true, reason: 'Fake email address' };
  }

  const emailHash = hashEmail(email)
  const url = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members/${emailHash}`
  
  const mergeFields: Record<string, any> = {}
  if (name) {
    // Split name into first and last for Mailchimp
    const nameParts = name.trim().split(' ')
    mergeFields.FNAME = nameParts[0] || ''
    mergeFields.LNAME = nameParts.slice(1).join(' ') || ''
  }
  
  // Add empty ADDRESS field to satisfy Mailchimp requirement
  // You can customize this if you collect actual addresses
  mergeFields.ADDRESS = {
    addr1: '',
    city: '',
    state: '',
    zip: ''
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
  const emailHash = hashEmail(email)
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

// MD5 hash implementation for Deno (Web Crypto doesn't support MD5)
// Mailchimp requires MD5 hash of lowercase email for member lookup
function md5(str: string): string {
  // Simple MD5 implementation - using hex_md5 from https://pajhome.org.uk/crypt/md5
  const hexcase = 0;
  const b64pad = "";
  
  function hex_md5(s: string) { return rstr2hex(rstr_md5(str2rstr_utf8(s))); }
  function rstr_md5(s: string) { return binl2rstr(binl_md5(rstr2binl(s), s.length * 8)); }
  function rstr2hex(input: string) {
    const hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
    let output = "";
    for (let i = 0; i < input.length; i++) {
      const x = input.charCodeAt(i);
      output += hex_tab.charAt((x >>> 4) & 0x0F) + hex_tab.charAt(x & 0x0F);
    }
    return output;
  }
  function str2rstr_utf8(input: string) {
    let output = "";
    let i = -1;
    while (++i < input.length) {
      const x = input.charCodeAt(i);
      if (x < 128) output += String.fromCharCode(x);
      else if (x > 127 && x < 2048) {
        output += String.fromCharCode((x >> 6) | 192);
        output += String.fromCharCode((x & 63) | 128);
      } else {
        output += String.fromCharCode((x >> 12) | 224);
        output += String.fromCharCode(((x >> 6) & 63) | 128);
        output += String.fromCharCode((x & 63) | 128);
      }
    }
    return output;
  }
  function rstr2binl(input: string) {
    const output = Array(input.length >> 2);
    for (let i = 0; i < output.length; i++) output[i] = 0;
    for (let i = 0; i < input.length * 8; i += 8)
      output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32);
    return output;
  }
  function binl2rstr(input: number[]) {
    let output = "";
    for (let i = 0; i < input.length * 32; i += 8)
      output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF);
    return output;
  }
  function binl_md5(x: number[], len: number) {
    x[len >> 5] |= 0x80 << ((len) % 32);
    x[(((len + 64) >>> 9) << 4) + 14] = len;
    let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
    for (let i = 0; i < x.length; i += 16) {
      const olda = a, oldb = b, oldc = c, oldd = d;
      a = md5_ff(a, b, c, d, x[i + 0], 7, -680876936);
      d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
      c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
      b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
      d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
      c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
      b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
      d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
      c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
      b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
      d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
      c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
      b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);
      a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
      d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
      c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
      b = md5_gg(b, c, d, a, x[i + 0], 20, -373897302);
      a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
      d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
      c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
      b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
      d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
      c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
      b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
      d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
      c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
      b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);
      a = md5_hh(a, b, c, d, x[i + 5], 4, -378558);
      d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
      c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
      b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
      d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
      c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
      b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
      d = md5_hh(d, a, b, c, x[i + 0], 11, -358537222);
      c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
      b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
      a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
      d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
      c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
      b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651);
      a = md5_ii(a, b, c, d, x[i + 0], 6, -198630844);
      d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
      c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
      b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
      a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
      d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
      c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
      b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
      a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
      d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
      c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
      b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
      a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
      d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
      c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
      b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551);
      a = safe_add(a, olda); b = safe_add(b, oldb);
      c = safe_add(c, oldc); d = safe_add(d, oldd);
    }
    return [a, b, c, d];
  }
  function md5_cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
  }
  function md5_ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
  }
  function md5_gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
  }
  function md5_hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5_cmn(b ^ c ^ d, a, b, x, s, t);
  }
  function md5_ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) {
    return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
  }
  function safe_add(x: number, y: number) {
    const lsw = (x & 0xFFFF) + (y & 0xFFFF);
    const msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }
  function bit_rol(num: number, cnt: number) {
    return (num << cnt) | (num >>> (32 - cnt));
  }
  
  return hex_md5(str);
}

function hashEmail(email: string): string {
  return md5(email.toLowerCase().trim());
}
