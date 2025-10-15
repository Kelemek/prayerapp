import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get the reminder_interval_days setting
    const { data: settings, error: settingsError } = await supabaseClient
      .from('admin_settings')
      .select('reminder_interval_days')
      .eq('id', 1)
      .single()

    if (settingsError) {
      console.error('Error fetching settings:', settingsError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch settings', details: settingsError }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const reminderIntervalDays = settings?.reminder_interval_days || 0

    // If disabled (0 or null), return early
    if (!reminderIntervalDays || reminderIntervalDays <= 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Reminder emails are disabled',
          sent: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Calculate the cutoff date for reminders
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - reminderIntervalDays)

    // Find prayers that need reminders:
    // - Status is 'current' or 'ongoing'
    // - Approval status is 'approved'
    // - Has NOT had any updates in the last X days (where X = reminderIntervalDays)
    
    // First, get all prayers that might need reminders
    const { data: potentialPrayers, error: fetchError } = await supabaseClient
      .from('prayers')
      .select('id, title, description, prayer_for, requester, email, is_anonymous, created_at, last_reminder_sent')
      .in('status', ['current', 'ongoing'])
      .eq('approval_status', 'approved')

    if (fetchError) {
      console.error('Error fetching prayers:', fetchError)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch prayers', details: fetchError }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!potentialPrayers || potentialPrayers.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No approved current/ongoing prayers found',
          sent: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // For each prayer, check if it has had any updates in the last X days
    const prayersNeedingReminders = []
    
    for (const prayer of potentialPrayers) {
      // Get the most recent update for this prayer
      const { data: updates, error: updateError } = await supabaseClient
        .from('prayer_updates')
        .select('created_at')
        .eq('prayer_id', prayer.id)
        .order('created_at', { ascending: false })
        .limit(1)

      if (updateError) {
        console.error(`Error fetching updates for prayer ${prayer.id}:`, updateError)
        continue
      }

      // Determine the last activity date (either last update or prayer creation)
      let lastActivityDate
      if (updates && updates.length > 0) {
        lastActivityDate = new Date(updates[0].created_at)
      } else {
        lastActivityDate = new Date(prayer.created_at)
      }

      // Check if the last activity was before the cutoff date
      if (lastActivityDate < cutoffDate) {
        prayersNeedingReminders.push(prayer)
      }
    }

    if (prayersNeedingReminders.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No prayers need reminders at this time - all have recent updates',
          sent: 0,
          total: potentialPrayers.length
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Send reminder emails
    let emailsSent = 0
    const errors = []

    for (const prayer of prayersNeedingReminders) {
      if (!prayer.email) {
        console.log(`Skipping prayer ${prayer.id}: no email address`)
        continue
      }

      try {
        const subject = `Reminder: Update Your Prayer Request - ${prayer.title}`
        const body = `Hello ${prayer.is_anonymous ? 'Friend' : prayer.requester},\n\nThis is a friendly reminder to update your prayer request if there have been any changes or answered prayers.\n\nPrayer: ${prayer.title}\nFor: ${prayer.prayer_for}\n\nYou can add an update by visiting the prayer app and clicking "Add Update" on your prayer.\n\nPraying with you,\nThe Prayer Team`

        const html = generateReminderHTML(prayer)

        // Send the reminder email
        const { error: emailError } = await supabaseClient.functions.invoke('send-notification', {
          body: {
            to: [prayer.email],
            subject,
            body,
            html
          }
        })

        if (emailError) {
          console.error(`Error sending reminder for prayer ${prayer.id}:`, emailError)
          errors.push({ prayerId: prayer.id, error: emailError })
          continue
        }

        // Update last_reminder_sent timestamp
        const { error: updateError } = await supabaseClient
          .from('prayers')
          .update({ last_reminder_sent: new Date().toISOString() })
          .eq('id', prayer.id)

        if (updateError) {
          console.error(`Error updating reminder timestamp for prayer ${prayer.id}:`, updateError)
        }

        emailsSent++
        console.log(`Sent reminder for prayer ${prayer.id}: ${prayer.title}`)
      } catch (error) {
        console.error(`Unexpected error sending reminder for prayer ${prayer.id}:`, error)
        errors.push({ prayerId: prayer.id, error: error.message })
      }
    }

    return new Response(
      JSON.stringify({ 
        message: `Successfully sent ${emailsSent} reminder emails`,
        sent: emailsSent,
        total: prayersNeedingReminders.length,
        errors: errors.length > 0 ? errors : undefined
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Unexpected error occurred', details: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

function generateReminderHTML(prayer: any): string {
  const baseUrl = Deno.env.get('APP_URL') || 'http://localhost:5173'
  const appUrl = `${baseUrl}/`
  const requesterName = prayer.is_anonymous ? 'Friend' : prayer.requester

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Prayer Update Reminder</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(to right, #3b82f6, #2563eb); padding: 20px; border-radius: 8px 8px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">🔔 Prayer Update Reminder</h1>
        </div>
        <div style="background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <h2 style="color: #1f2937; margin-top: 0;">Hello ${requesterName},</h2>
          <p style="margin-bottom: 20px;">This is a friendly reminder to update your prayer request if there have been any changes or answered prayers.</p>
          
          <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px;"><strong>Your Prayer Request:</strong></p>
            <p style="margin: 0 0 10px 0; color: #1e40af; font-weight: 600; font-size: 18px;">${prayer.title}</p>
            <p style="margin: 0; color: #1e3a8a;"><strong>Prayer For:</strong> ${prayer.prayer_for}</p>
          </div>

          <div style="background: #fef3c7; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>💡 Why update?</strong><br>
              • Share how God is working in this situation<br>
              • Let others know if prayers have been answered<br>
              • Update the prayer need if circumstances have changed<br>
              • Encourage others by sharing God's faithfulness
            </p>
          </div>

          <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">To add an update, simply visit the prayer app and click the "Add Update" button on your prayer request.</p>
          
          <div style="margin-top: 30px; text-align: center;">
            <a href="${appUrl}" style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Visit Prayer App</a>
          </div>

          <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px; padding: 15px; margin: 30px 0 0 0;">
            <p style="margin: 0; color: #0c4a6e; font-size: 13px;">
              <strong>Prayer Details:</strong><br>
              Submitted: ${new Date(prayer.created_at).toLocaleDateString()}<br>
              ${prayer.last_reminder_sent ? `Last Reminder: ${new Date(prayer.last_reminder_sent).toLocaleDateString()}` : 'First Reminder'}
            </p>
          </div>
        </div>
        <div style="margin-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
          <p>Continuing to pray with you,<br><strong>The Prayer Team</strong></p>
          <p style="font-size: 12px; color: #9ca3af;">You're receiving this because you submitted a prayer request. Updates help our community stay connected and see how God is working.</p>
        </div>
      </body>
    </html>
  `
}
