// @ts-nocheck - Deno Edge Function
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const MAILCHIMP_API_KEY = Deno.env.get('MAILCHIMP_API_KEY');
const MAILCHIMP_SERVER_PREFIX = Deno.env.get('MAILCHIMP_SERVER_PREFIX') || 'us21';
const MAILCHIMP_AUDIENCE_ID = Deno.env.get('MAILCHIMP_AUDIENCE_ID');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

serve(async (req) => {
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
    console.log('🔄 Starting Mailchimp → Database sync...');

    if (!MAILCHIMP_API_KEY || !MAILCHIMP_AUDIENCE_ID || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('❌ Missing required environment variables');
      return new Response(JSON.stringify({
        error: 'Missing configuration',
        required: [
          'MAILCHIMP_API_KEY',
          'MAILCHIMP_AUDIENCE_ID',
          'SUPABASE_URL',
          'SUPABASE_SERVICE_ROLE_KEY'
        ]
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    console.log('📧 Fetching Mailchimp audience members...');
    const mailchimpUrl = `https://${MAILCHIMP_SERVER_PREFIX}.api.mailchimp.com/3.0/lists/${MAILCHIMP_AUDIENCE_ID}/members?count=1000&fields=members.email_address,members.status`;

    const mailchimpResponse = await fetch(mailchimpUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${MAILCHIMP_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!mailchimpResponse.ok) {
      const error = await mailchimpResponse.json();
      throw new Error(`Mailchimp API error: ${JSON.stringify(error)}`);
    }

    const mailchimpData = await mailchimpResponse.json();
    const members = mailchimpData.members || [];

    console.log(`✅ Fetched ${members.length} members from Mailchimp`);

    const mailchimpStatusMap = new Map();
    members.forEach((member) => {
      const email = member.email_address.toLowerCase().trim();
      const isActive = member.status === 'subscribed';
      mailchimpStatusMap.set(email, isActive);
      console.log(`  ${email}: ${member.status} → ${isActive ? 'active' : 'inactive'}`);
    });

    console.log('📊 Fetching database subscribers...');
    const dbResponse = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?select=*`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!dbResponse.ok) {
      throw new Error(`Database fetch error: ${dbResponse.statusText}`);
    }

    const dbSubscribers = await dbResponse.json();
    console.log(`✅ Fetched ${dbSubscribers.length} subscribers from database`);

    let updatedCount = 0;
    let skippedCount = 0;
    const updates = [];

    for (const subscriber of dbSubscribers) {
      const email = subscriber.email.toLowerCase().trim();
      const dbIsActive = subscriber.is_active;
      const mailchimpStatus = mailchimpStatusMap.get(email);

      if (mailchimpStatus !== undefined && dbIsActive !== mailchimpStatus) {
        console.log(`🔄 Updating ${email}: ${dbIsActive} → ${mailchimpStatus}`);

        const updateResponse = await fetch(`${SUPABASE_URL}/rest/v1/email_subscribers?email=eq.${email}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=minimal'
          },
          body: JSON.stringify({
            is_active: mailchimpStatus
          })
        });

        if (updateResponse.ok) {
          updatedCount++;
          updates.push({
            email,
            oldStatus: dbIsActive,
            newStatus: mailchimpStatus
          });
          console.log(`  ✅ Updated ${email}`);
        } else {
          console.error(`  ❌ Failed to update ${email}:`, await updateResponse.text());
        }
      } else if (mailchimpStatus !== undefined) {
        skippedCount++;
        console.log(`  ⏭️  Skipped ${email} (already in sync)`);
      } else {
        console.log(`  ℹ️  ${email} not in Mailchimp (possibly new)`);
      }
    }

    console.log('✅ Sync complete!');
    console.log(`   Updated: ${updatedCount}`);
    console.log(`   Skipped: ${skippedCount}`);
    console.log(`   Total checked: ${dbSubscribers.length}`);

    return new Response(JSON.stringify({
      success: true,
      updated: updatedCount,
      skipped: skippedCount,
      total: dbSubscribers.length,
      changes: updates,
      message: `Synced ${updatedCount} subscriber status changes from Mailchimp`
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    console.error('❌ Error in sync-mailchimp-status:', error);
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
