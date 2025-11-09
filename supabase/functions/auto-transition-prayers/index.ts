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

    // Get the days_before_ongoing setting (now controls transition to archived)
    const { data: settings, error: settingsError } = await supabaseClient
      .from('admin_settings')
      .select('days_before_ongoing')
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

    const daysBeforeOngoing = settings?.days_before_ongoing || 0

    // If disabled (0 or null), return early
    if (!daysBeforeOngoing || daysBeforeOngoing <= 0) {
      return new Response(
        JSON.stringify({ 
          message: 'Auto-transition is disabled',
          transitioned: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Calculate the cutoff date
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysBeforeOngoing)

    // Find prayers that are 'current' and older than the cutoff date (will be transitioned to archived)
    const { data: prayersToTransition, error: fetchError } = await supabaseClient
      .from('prayers')
      .select('id, title, created_at')
      .eq('status', 'current')
      .eq('approval_status', 'approved')
      .lt('created_at', cutoffDate.toISOString())

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

    if (!prayersToTransition || prayersToTransition.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No prayers to transition',
          transitioned: 0
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Update the prayers to 'archived' status
    const prayerIds = prayersToTransition.map(p => p.id)
    const { error: updateError } = await supabaseClient
      .from('prayers')
      .update({ status: 'archived' })
      .in('id', prayerIds)

    if (updateError) {
      console.error('Error updating prayers:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update prayers', details: updateError }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log(`Transitioned ${prayersToTransition.length} prayers from current to archived`)

    return new Response(
      JSON.stringify({ 
        message: `Successfully transitioned ${prayersToTransition.length} prayers`,
        transitioned: prayersToTransition.length,
        prayers: prayersToTransition.map(p => ({ id: p.id, title: p.title }))
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
