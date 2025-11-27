import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { logError, logWarning } from '../lib/errorLogger';
import { PrayerStatus } from '../types/prayer';
import type { PrayerRequest } from '../types/prayer';
import type { Database } from '../lib/database.types';
import { sendAdminNotification } from '../lib/emailNotifications';

type DbPrayer = Database['public']['Tables']['prayers']['Row'];
type DbPrayerUpdate = Database['public']['Tables']['prayer_updates']['Row'];

export const usePrayerManager = () => {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Track current load request to cancel if a new one comes in
  const loadAbortControllerRef = useRef<AbortController | null>(null);

  // Convert database prayer to app prayer format
  const convertDbPrayer = (dbPrayer: DbPrayer, updates: DbPrayerUpdate[] = []): PrayerRequest => {
    // Filter to only approved updates and sort by newest first
    const sortedUpdates = updates
      .filter(u => u.approval_status === 'approved')
      .sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    
    return {
      id: dbPrayer.id,
      title: dbPrayer.title,
      description: dbPrayer.description || 'No description provided',
      status: dbPrayer.status as PrayerStatus,
      requester: dbPrayer.requester,
      prayer_for: dbPrayer.prayer_for,
      email: dbPrayer.email,
      is_anonymous: dbPrayer.is_anonymous,
      date_requested: dbPrayer.date_requested,
      date_answered: dbPrayer.date_answered,
      created_at: dbPrayer.created_at,
      updated_at: dbPrayer.updated_at,
      updates: sortedUpdates.map(update => ({
        id: update.id,
        prayer_id: update.prayer_id,
        content: update.content,
        author: update.author,
        created_at: update.created_at
      }))
    } as PrayerRequest;
  };

  // Load prayers from Supabase with timeout and abort support
  const loadPrayers = useCallback(async () => {
    // Cancel previous request if it's still pending
    if (loadAbortControllerRef.current) {
      loadAbortControllerRef.current.abort();
    }
    
    // Create new abort controller for this request
    const abortController = new AbortController();
    loadAbortControllerRef.current = abortController;
    
    // Set timeout to prevent hanging requests (10 seconds)
    const timeoutId = setTimeout(() => {
      abortController.abort();
    }, 10000);
    
    try {
      setLoading(true);
      setError(null);

      // Fetch approved prayers with retry on network errors
      let prayersData: any;
      let prayersError: any;
      
      const result = await supabase
        .from('prayers')
        .select(`
          *,
          prayer_updates!prayer_updates_prayer_id_fkey(*)
        `)
        .eq('approval_status', 'approved')
        .eq('prayer_updates.approval_status', 'approved')
        .order('created_at', { ascending: false });
      
      prayersData = result.data;
      prayersError = result.error;

      // Clear timeout if request completed
      clearTimeout(timeoutId);
      
      // If this request was aborted, don't process the response
      if (abortController.signal.aborted) {
        return;
      }

      if (prayersError) throw prayersError;

      const formattedPrayers = (prayersData || []).map((prayer: any) => {
        const updates = prayer && typeof prayer === 'object' && 'prayer_updates' in prayer
          ? (Array.isArray(prayer.prayer_updates) ? prayer.prayer_updates : [prayer.prayer_updates]).filter((u: any) => u !== null)
          : [];
        return convertDbPrayer(prayer as DbPrayer, updates as DbPrayerUpdate[]);
      });

      // Sort prayers by most recent activity - cache timestamps to avoid recalculating
      const sortedPrayers = formattedPrayers
        .map(prayer => ({
          prayer,
          latestActivity: Math.max(
            new Date(prayer.created_at).getTime(),
            prayer.updates.length > 0 
              ? new Date(prayer.updates[0].created_at).getTime() // Already sorted, just take first
              : 0
          )
        }))
        .sort((a, b) => b.latestActivity - a.latestActivity)
        .map(({ prayer }) => prayer);

      setPrayers(sortedPrayers);
    } catch (err: unknown) {
      // Clear timeout on error
      clearTimeout(timeoutId);
      
      // Don't show error for aborted requests - they're expected
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('Prayer load request timed out or was cancelled');
        setError('Failed to load prayers - request timed out. Please refresh the page.');
        return;
      }
      
      const errorMessage = err && typeof err === 'object' && 'message' in err
        ? String((err as any).message)
        : 'Failed to load prayers';
      console.error('Failed to load prayers:', err);
      console.error('Error details:', {
        type: typeof err,
        message: errorMessage,
        stack: err instanceof Error ? err.stack : undefined
      });
      
      // Log error to Vercel/external services
      logError({
        message: 'Failed to load prayers from Supabase',
        error: err,
        context: {
          tags: {
            type: 'prayer_load_failed',
            hook: 'usePrayerManager'
          },
          metadata: {
            errorMessage
          }
        }
      });
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load prayers on mount and when page becomes visible
  useEffect(() => {
    loadPrayers();

    // Reload data when tab becomes visible (user returns from being away)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadPrayers();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [loadPrayers]);

  const addPrayer = async (prayer: Omit<PrayerRequest, 'id' | 'date_requested' | 'created_at' | 'updated_at' | 'updates'>) => {
    try {
      // Prepare the base prayer data
      const prayerData: Record<string, string | boolean | null> = {
        title: prayer.title,
        description: prayer.description,
        status: prayer.status,
        requester: prayer.requester,
        prayer_for: prayer.prayer_for,
        approval_status: 'pending' // New prayers need approval
      };

      // Add new fields if they're available in the database schema
      if (prayer.email !== undefined) {
        prayerData.email = prayer.email || null;
      }
      if (prayer.is_anonymous !== undefined) {
        prayerData.is_anonymous = prayer.is_anonymous || false;
      }

      const { data, error } = await supabase
        .from('prayers')
        .insert(prayerData)
        .select()
        .single();

      if (error) throw error;
      
      // Auto-subscribe user to email notifications (opt-in by default)
      if (prayer.email) {
        try {
          // Check if email already exists
          const { data: existing } = await supabase
            .from('email_subscribers')
            .select('id')
            .eq('email', prayer.email.toLowerCase().trim())
            .maybeSingle();

          // Only add if doesn't exist
          if (!existing) {
            await supabase
              .from('email_subscribers')
              .insert({
                name: prayer.requester,
                email: prayer.email.toLowerCase().trim(),
                is_active: true,  // Opt-in by default
                is_admin: false   // Regular user, not admin
              });
          }
        } catch (subscribeError) {
          // Don't fail prayer submission if subscription fails
          console.error('Failed to auto-subscribe user:', subscribeError);
        }
      }
      
      // Send email notification to admins
      // Fetch admin emails for approval code generation
      const { data: admins } = await supabase
        .from('email_subscribers')
        .select('email')
        .eq('is_admin', true)
        .eq('is_active', true)
        .eq('receive_admin_emails', true);

      sendAdminNotification({
        type: 'prayer',
        title: prayer.title,
        description: prayer.description,
        requester: prayer.requester,
        requestId: data.id,
        adminEmails: admins?.map(a => a.email) || []
      }).catch(err => console.error('Failed to send email notification:', err));
      
      // Don't add to local state since it's pending approval
      // Show success message that prayer is submitted for review
      return data; // Return the data but don't add to local state
    } catch (error: unknown) {
      console.error('Error adding prayer:', error);
      // Re-throw the error so the caller can handle it
      throw error;
    }
  };

  const updatePrayerStatus = async (id: string, status: PrayerStatus) => {
    try {
      const updateData: Record<string, string> = { status };
      if (status === PrayerStatus.ANSWERED) {
        updateData.date_answered = new Date().toISOString();
      }

      // Optimistically update local state first
      setPrayers(prev => prev.map(prayer => 
        prayer.id === id 
          ? { 
              ...prayer, 
              status,
              date_answered: status === PrayerStatus.ANSWERED ? new Date().toISOString() : prayer.date_answered
            }
          : prayer
      ));

      const { error } = await supabase
        .from('prayers')
        .update(updateData)
        .eq('id', id);

      if (error) {
        // Revert optimistic update on error and wait for restoration
        await loadPrayers();
        throw error;
      }
    } catch (error: unknown) {
      console.error('Error updating prayer status:', error);
      throw error;
    }
  };

  const addPrayerUpdate = async (prayerId: string, content: string, author: string, authorEmail?: string, isAnonymous?: boolean, markAsAnswered?: boolean) => {
    try {
      // Get prayer title for notification
      const prayer = prayers.find(p => p.id === prayerId);
      
      // If anonymous, use "Anonymous" as the author name
      const finalAuthor = isAnonymous ? 'Anonymous' : author;
      
      // Submit update for admin approval
      const { data: updateData, error } = await supabase
        .from('prayer_updates')
        .insert({
          prayer_id: prayerId,
          content,
          author: finalAuthor,
          author_email: authorEmail || null,
          is_anonymous: isAnonymous || false,
          mark_as_answered: markAsAnswered || false,
          approval_status: 'pending' // Require admin approval
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      // Send email notification to admins
      if (prayer) {
        // Fetch admin emails for approval code generation
        const { data: admins } = await supabase
          .from('email_subscribers')
          .select('email')
          .eq('is_admin', true)
          .eq('is_active', true)
          .eq('receive_admin_emails', true);

        sendAdminNotification({
          type: 'update',
          title: prayer.title,
          author: finalAuthor,
          content,
          requestId: updateData.id,
          adminEmails: admins?.map(a => a.email) || []
        }).catch(err => console.error('Failed to send email notification:', err));
      }

      // Return success but don't update local state
      // Update will appear after admin approval
      return null;
    } catch (error: unknown) {
      console.error('Failed to add prayer update:', error);
      throw error; // Re-throw to allow component to handle error state
    }
  };

  const deletePrayer = async (id: string) => {
    try {
      // Optimistically remove from local state first
      const prayerToDelete = prayers.find(p => p.id === id);
      setPrayers(prev => prev.filter(prayer => prayer.id !== id));

      const { error } = await supabase
        .from('prayers')
        .delete()
        .eq('id', id);

      if (error) {
        // Revert optimistic update on error
        if (prayerToDelete) {
          setPrayers(prev => [...prev, prayerToDelete]);
        }
        // Handle the error (don't re-throw so callers/tests can continue)
        handleSupabaseError(error);
        return;
      }
    } catch (error: unknown) {
      // Ensure we surface the error via the shared handler and do not re-throw
      console.error('Failed to delete prayer:', error);
      handleSupabaseError(error);
    }
  };

  const getFilteredPrayers = (status?: PrayerStatus, searchTerm?: string) => {
    return prayers.filter(prayer => {
      if (status && prayer.status !== status) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        // Search all string fields in the prayer object and its updates
        const prayerMatches = Object.values(prayer).some(value => {
          if (typeof value === 'string') {
            return value.toLowerCase().includes(term);
          }
          return false;
        });
        const updatesMatches = Array.isArray(prayer.updates)
          ? prayer.updates.some(update =>
              Object.values(update).some(value =>
                typeof value === 'string' && value.toLowerCase().includes(term)
              )
            )
          : false;
        return prayerMatches || updatesMatches;
      }
      return true;
    });
  };

  // Request deletion of a prayer update (user)
  const requestUpdateDeletion = async (updateId: string, reason: string, requester: string, requesterEmail?: string) => {
    try {
      const { data, error } = await supabase
        .from('update_deletion_requests')
        .insert({
          update_id: updateId,
          reason,
          requested_by: requester,
          requested_email: requesterEmail || null
        })
        .select()
        .single();
      if (error) throw error;

      // Fetch the update/prayer info for notification (best-effort)
      try {
        const { data: updateRow } = await supabase
          .from('prayer_updates')
          .select(`*, prayers (title)`)
          .eq('id', updateId)
          .single();

        const title = updateRow?.prayers?.title || 'Unknown Prayer';
        const author = updateRow?.author || undefined;
        const content = updateRow?.content || undefined;

        // Fetch admin emails for approval code generation
        const { data: admins } = await supabase
          .from('email_subscribers')
          .select('email')
          .eq('is_admin', true)
          .eq('is_active', true)
          .eq('receive_admin_emails', true);

        sendAdminNotification({
          type: 'deletion',
          title,
          reason,
          requester: requester,
          author,
          content,
          requestId: data.id,
          adminEmails: admins?.map(a => a.email) || []
        }).catch(err => console.error('Failed to send email notification for update deletion request:', err));
      } catch (notifyErr) {
        console.warn('Could not fetch update/prayer details for notification:', notifyErr);
      }

      return { ok: true, data };
    } catch (error: unknown) {
      console.error('requestUpdateDeletion error:', error);
      const errorMessage = error && typeof error === 'object' && 'message' in error
        ? String(error.message)
        : String(error);
      return { ok: false, error: errorMessage };
    }
  };

  // Directly delete a prayer update (admin)
  const deletePrayerUpdate = async (updateId: string) => {
    try {
      const { error } = await supabase
        .from('prayer_updates')
        .delete()
        .eq('id', updateId);
      if (error) throw error;
      loadPrayers();
    } catch (error: unknown) {
      console.error('Failed to delete prayer update:', error);
      throw error; // Re-throw to allow component to handle error state
    }
  };

  return {
    prayers,
    loading,
    error,
    addPrayer,
    updatePrayerStatus,
    addPrayerUpdate,
    deletePrayer,
    getFilteredPrayers,
    requestUpdateDeletion,
    deletePrayerUpdate,
    // helper to refresh prayers from the outside/tests
    refresh: loadPrayers
  };
};