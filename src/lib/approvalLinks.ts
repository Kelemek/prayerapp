/**
 * Approval link generation utilities
 * Generates special deep links for admins to approve requests without going through the login page
 * Uses server-side approval codes for secure one-time authentication
 */

import { directMutation } from './supabase';

/**
 * Generates a one-time approval code and creates a direct admin approval link
 * The code is validated server-side to create an authenticated session
 * 
 * Format: https://app.com?code=abc123xyz&approval_type=prayer&approval_id=xyz789
 * 
 * @param requestType - Type of request to approve: 'prayer', 'update', 'deletion', 'status_change', or 'preference-change'
 * @param requestId - UUID of the request record
 * @param adminEmail - Email of the admin receiving this approval
 * @returns Full approval URL with code, or null if code generation failed
 */
export async function generateApprovalLink(
  requestType: 'prayer' | 'update' | 'deletion' | 'status_change' | 'preference-change',
  requestId: string,
  adminEmail: string
): Promise<string | null> {
  try {
    // Generate a random code (using crypto API)
    const code = generateRandomCode();

    // Store the code in the database with expiry (24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    // Use directMutation to avoid Supabase client hang after Safari minimize
    const { error } = await directMutation('approval_codes', {
      method: 'POST',
      body: {
        code,
        admin_email: adminEmail.toLowerCase().trim(),
        approval_type: requestType,
        approval_id: requestId,
        expires_at: expiresAt.toISOString(),
      },
      timeout: 10000
    });

    if (error) {
      console.error('Failed to create approval code:', error);
      return null;
    }

    // Generate the approval link with the code
    const baseUrl = typeof window !== 'undefined'
      ? window.location.origin
      : process.env.VITE_APP_URL || 'http://localhost:5173';

    const params = new URLSearchParams({
      code,
      approval_type: requestType,
      approval_id: requestId,
    });

    return `${baseUrl}?${params.toString()}`;
  } catch (error) {
    console.error('Error generating approval link:', error);
    return null;
  }
}

/**
 * Generates a random approval code (32 characters)
 */
function generateRandomCode(): string {
  const array = new Uint8Array(24);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Validates an approval code by calling the Edge Function
 * Returns approval info if valid, null if invalid or expired
 */
export async function validateApprovalCode(
  code: string
): Promise<{ approval_type: string; approval_id: string; user: { email: string } } | null> {
  try {
    // Get Supabase URL and anon key from environment
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    
    // Make a raw fetch request with anon key authorization
    const response = await fetch(
      `${supabaseUrl}/functions/v1/validate-approval-code`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({ code }),
      }
    );

    const responseData = await response.json();

    if (!response.ok || !responseData?.success) {
      return null;
    }

    return {
      approval_type: responseData.approval_type,
      approval_id: responseData.approval_id,
      user: responseData.user,
    };
  } catch (error) {
    return null;
  }
}
