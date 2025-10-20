# Mailchimp Setup for Mass Prayer Emails

This guide explains how to integrate Mailchimp to send weekly/monthly mass prayer emails to your congregation.

## Overview

**Current Setup:**
- ✅ **Resend** - Used for transactional emails (prayer approvals, notifications to admins)
- 🆕 **Mailchimp** - Will be used for mass email campaigns (weekly prayer lists to congregation)

**Why Mailchimp for Mass Emails?**
- Better for newsletter/campaign-style emails
- Built-in subscriber management
- Unsubscribe handling
- Email templates and design tools
- Analytics and open rates
- Free tier: Up to 500 contacts, 1,000 sends/month

---

## Step 1: Create Mailchimp Account

1. Go to [mailchimp.com](https://mailchimp.com)
2. Sign up for a free account
3. Verify your email address
4. Complete account setup (business name, address, etc.)

---

## Step 2: Create an Audience (Mailing List)

1. In Mailchimp dashboard, go to **Audience** → **All contacts**
2. Click **Create Audience**
3. Fill in details:
   - **Audience name**: "Prayer Request Recipients" or "Church Prayer List"
   - **Default from email**: your-church@example.com
   - **Default from name**: "Your Church Name"
   - **Reminder**: Brief description about prayer requests
4. Enable **GDPR fields** if needed
5. Click **Save**

---

## Step 3: Get Mailchimp API Key

1. Go to **Account** → **Extras** → **API keys**
2. Click **Create A Key**
3. Copy the API key (starts with something like `abc123-us21`)
4. **Important**: Save this securely - you can't view it again!

The API key format includes a server prefix (e.g., `us21`), which indicates your data center.

---

## Step 4: Get Your Audience ID

1. Go to **Audience** → **All contacts**
2. Click **Settings** → **Audience name and defaults**
3. Look for **Audience ID** (10-character alphanumeric, e.g., `a1b2c3d4e5`)
4. Copy this ID

---

## Step 5: Add Environment Variables to Supabase

1. Go to your Supabase project: [supabase.com/dashboard](https://supabase.com/dashboard)
2. Select your project
3. Go to **Settings** → **Edge Functions**
4. Add these secrets:

```bash
# In Supabase Dashboard → Settings → Edge Functions → Add Secret
MAILCHIMP_API_KEY=your-api-key-here
MAILCHIMP_SERVER_PREFIX=us21  # Extract from your API key (the part after the dash)
MAILCHIMP_AUDIENCE_ID=your-audience-id-here
```

Or via CLI:
```bash
# Set the secrets via Supabase CLI
supabase secrets set MAILCHIMP_API_KEY=your-api-key-here
supabase secrets set MAILCHIMP_SERVER_PREFIX=us21
supabase secrets set MAILCHIMP_AUDIENCE_ID=your-audience-id-here
```

---

## Step 6: Create Mailchimp Edge Function

Create a new Supabase Edge Function to handle Mailchimp operations:

```bash
cd supabase/functions
mkdir send-mass-prayer-email
```

Create `supabase/functions/send-mass-prayer-email/index.ts`:

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const MAILCHIMP_API_KEY = Deno.env.get('MAILCHIMP_API_KEY')
const MAILCHIMP_SERVER_PREFIX = Deno.env.get('MAILCHIMP_SERVER_PREFIX') || 'us21'
const MAILCHIMP_AUDIENCE_ID = Deno.env.get('MAILCHIMP_AUDIENCE_ID')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*' } })
  }

  try {
    const { subject, htmlContent, textContent, recipients } = await req.json()

    if (!MAILCHIMP_API_KEY || !MAILCHIMP_AUDIENCE_ID) {
      throw new Error('Mailchimp not configured')
    }

    // 1. Add/Update subscribers in Mailchimp
    for (const recipient of recipients) {
      await addOrUpdateSubscriber(recipient)
    }

    // 2. Create campaign
    const campaign = await createCampaign(subject)
    
    // 3. Set campaign content
    await setCampaignContent(campaign.id, htmlContent, textContent)
    
    // 4. Send campaign
    await sendCampaign(campaign.id)

    return new Response(
      JSON.stringify({ success: true, campaignId: campaign.id }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function addOrUpdateSubscriber(email: string) {
  const url = \`https://\${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/\${MAILCHIMP_AUDIENCE_ID}/members\`
  
  const emailHash = await hashEmail(email)
  
  const response = await fetch(\`\${url}/\${emailHash}\`, {
    method: 'PUT',
    headers: {
      'Authorization': \`Bearer \${MAILCHIMP_API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email_address: email,
      status_if_new: 'subscribed',
      status: 'subscribed',
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    console.error('Failed to add subscriber:', error)
  }
}

async function createCampaign(subject: string) {
  const url = \`https://\${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns\`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${MAILCHIMP_API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'regular',
      recipients: {
        list_id: MAILCHIMP_AUDIENCE_ID,
      },
      settings: {
        subject_line: subject,
        from_name: 'Prayer Requests',
        reply_to: 'noreply@yourchurch.com', // Change this
        title: \`Prayer Email - \${new Date().toISOString()}\`,
      },
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(\`Failed to create campaign: \${JSON.stringify(error)}\`)
  }

  return await response.json()
}

async function setCampaignContent(campaignId: string, html: string, text: string) {
  const url = \`https://\${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns/\${campaignId}/content\`
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': \`Bearer \${MAILCHIMP_API_KEY}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      html: html,
      plain_text: text,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(\`Failed to set content: \${JSON.stringify(error)}\`)
  }
}

async function sendCampaign(campaignId: string) {
  const url = \`https://\${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/campaigns/\${campaignId}/actions/send\`
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${MAILCHIMP_API_KEY}\`,
    },
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(\`Failed to send campaign: \${JSON.stringify(error)}\`)
  }
}

async function hashEmail(email: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(email.toLowerCase().trim())
  const hashBuffer = await crypto.subtle.digest('MD5', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}
```

---

## Step 7: Create Email Subscriber Management

Add a table to track who should receive mass emails:

```sql
-- Create email_subscribers table
CREATE TABLE IF NOT EXISTS email_subscribers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT,
  last_name TEXT,
  subscribed BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE email_subscribers ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admins can manage subscribers"
  ON email_subscribers
  FOR ALL
  TO authenticated
  USING (true);

-- Create index on email
CREATE INDEX idx_email_subscribers_email ON email_subscribers(email);
CREATE INDEX idx_email_subscribers_subscribed ON email_subscribers(subscribed);
```

---

## Step 8: Create Frontend Component for Sending Mass Email

Create `src/components/MassPrayerEmail.tsx`:

```typescript
import React, { useState, useEffect } from 'react';
import { Mail, Send, Users } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const MassPrayerEmail: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [subscriberCount, setSubscriberCount] = useState(0);
  const [prayers, setPrayers] = useState<any[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Get subscriber count
    const { count } = await supabase
      .from('email_subscribers')
      .select('*', { count: 'exact', head: true })
      .eq('subscribed', true);
    
    setSubscriberCount(count || 0);

    // Get active prayers for this week
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const { data } = await supabase
      .from('prayers')
      .select('*')
      .eq('status', 'approved')
      .gte('created_at', oneWeekAgo.toISOString())
      .order('created_at', { ascending: false });
    
    setPrayers(data || []);
  };

  const sendMassEmail = async () => {
    if (!confirm(\`Send email to \${subscriberCount} subscribers?\`)) {
      return;
    }

    setLoading(true);
    try {
      // Get all subscribed emails
      const { data: subscribers } = await supabase
        .from('email_subscribers')
        .select('email')
        .eq('subscribed', true);

      if (!subscribers || subscribers.length === 0) {
        alert('No subscribers found');
        return;
      }

      const recipients = subscribers.map(s => s.email);

      // Generate email content
      const subject = \`Weekly Prayer Requests - \${new Date().toLocaleDateString()}\`;
      const htmlContent = generatePrayerListHTML(prayers);
      const textContent = generatePrayerListText(prayers);

      // Send via Edge Function
      const { error } = await supabase.functions.invoke('send-mass-prayer-email', {
        body: {
          subject,
          htmlContent,
          textContent,
          recipients,
        }
      });

      if (error) throw error;

      alert(\`Email sent to \${subscriberCount} subscribers!\`);
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to send email');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Mail size={24} />
        Mass Prayer Email
      </h2>

      <div className="mb-6">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
          <Users size={20} />
          <span>{subscriberCount} subscribers</span>
        </div>
        <div className="text-sm text-gray-500 mt-2">
          {prayers.length} prayers from the last 7 days
        </div>
      </div>

      <button
        onClick={sendMassEmail}
        disabled={loading || subscriberCount === 0}
        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Send size={20} />
        {loading ? 'Sending...' : 'Send Weekly Prayer Email'}
      </button>
    </div>
  );
};

function generatePrayerListHTML(prayers: any[]): string {
  return \`
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .prayer { margin-bottom: 20px; padding: 15px; background: #f9f9f9; border-left: 4px solid #4A90E2; }
        .prayer-title { font-weight: bold; color: #2c3e50; }
        .prayer-date { font-size: 0.9em; color: #7f8c8d; }
      </style>
    </head>
    <body>
      <h1>Weekly Prayer Requests</h1>
      <p>Here are the prayer requests from this week:</p>
      
      \${prayers.map(p => \`
        <div class="prayer">
          <div class="prayer-title">\${p.title}</div>
          <div class="prayer-date">\${new Date(p.created_at).toLocaleDateString()}</div>
          <p>\${p.description || ''}</p>
        </div>
      \`).join('')}
      
      <hr>
      <p><small>You're receiving this because you subscribed to prayer request updates.</small></p>
    </body>
    </html>
  \`;
}

function generatePrayerListText(prayers: any[]): string {
  return \`
Weekly Prayer Requests

\${prayers.map(p => \`
• \${p.title}
  \${new Date(p.created_at).toLocaleDateString()}
  \${p.description || ''}
\`).join('\\n')}

---
You're receiving this because you subscribed to prayer request updates.
  \`.trim();
}
```

---

## Step 9: Deploy the Edge Function

```bash
# Deploy the new function
supabase functions deploy send-mass-prayer-email

# Verify it's deployed
supabase functions list
```

---

## Step 10: Test the Integration

1. Add a test subscriber to your `email_subscribers` table
2. Use the `MassPrayerEmail` component in your admin portal
3. Send a test email
4. Check Mailchimp dashboard for campaign analytics

---

## Alternative: Simpler Approach with Direct Mailchimp API

If you prefer to manage subscribers directly in Mailchimp (not in your database):

1. Export your current email list to CSV
2. Import to Mailchimp audience manually
3. Create campaigns through Mailchimp's visual editor
4. Schedule sends through Mailchimp dashboard

This approach requires less coding but gives you less automation.

---

## Cost Comparison

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **Mailchimp** | 500 contacts, 1,000 sends/month | $13/mo for 500 contacts |
| **Resend** | 3,000 emails/month (we use this) | $20/mo for 50,000 emails |
| **SendGrid** | 100 emails/day (3,000/month) | Starts at $19.95/mo |

---

## Next Steps

1. ✅ Create Mailchimp account
2. ✅ Set up audience
3. ✅ Get API credentials
4. ✅ Add environment variables to Supabase
5. ✅ Create Edge Function
6. ✅ Create email_subscribers table
7. ✅ Build frontend component
8. ✅ Test with small group
9. 🎯 Schedule weekly automated sends (optional)

---

## Troubleshooting

**"Invalid API Key"**
- Verify the API key includes the server prefix
- Check that you're using the correct data center (us21, us19, etc.)

**"Audience not found"**
- Double-check your Audience ID
- Ensure you're using the correct Mailchimp account

**"Rate limit exceeded"**
- Mailchimp has rate limits (10,000 requests/hour on free tier)
- Add delays between API calls if sending to many subscribers

**Want to test without actually sending?**
- Use Mailchimp's "Test Email" feature
- Or create a separate test audience with just your email

---

## Questions?

Feel free to ask if you need help with:
- Setting up email templates
- Scheduling automated sends
- Tracking who opens emails
- Managing unsubscribes
- A/B testing email content
