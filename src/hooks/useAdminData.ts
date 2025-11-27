import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { logError } from '../lib/errorLogger';
import type { PrayerRequest, PrayerUpdate, DeletionRequest, StatusChangeRequest, UpdateDeletionRequest } from '../types/prayer';
import { sendApprovedPrayerNotification, sendApprovedUpdateNotification, sendDeniedPrayerNotification, sendDeniedUpdateNotification, sendRequesterApprovalNotification } from '../lib/emailNotifications';

export interface PendingPreferenceChange {
  id: string;
  name: string;
  email: string;
  receive_new_prayer_notifications: boolean;
  created_at: string;
  denial_reason?: string;
  reviewed_at?: string;
}

interface AdminData {
  pendingUpdateDeletionRequests: (UpdateDeletionRequest & {
    prayer_updates?: {
      content?: string;
      author?: string;
      author_email?: string;
      prayers?: {
        title?: string;
      };
    };
  })[];
  deniedUpdateDeletionRequests: (UpdateDeletionRequest & {
    prayer_updates?: {
      content?: string;
      author?: string;
      author_email?: string;
      prayers?: {
        title?: string;
      };
    };
  })[];
  pendingPrayers: PrayerRequest[];
  pendingUpdates: (PrayerUpdate & { prayer_title?: string })[];
  pendingDeletionRequests: (DeletionRequest & { prayer_title?: string })[];
  pendingStatusChangeRequests: (StatusChangeRequest & { prayer_title?: string })[];
  deniedStatusChangeRequests: (StatusChangeRequest & { prayer_title?: string })[];
  deniedDeletionRequests: (DeletionRequest & { prayer_title?: string })[];
  deniedPreferenceChanges: PendingPreferenceChange[];
  approvedPrayers: PrayerRequest[];
  approvedUpdates: (PrayerUpdate & { prayer_title?: string })[];
  deniedPrayers: PrayerRequest[];
  deniedUpdates: (PrayerUpdate & { prayer_title?: string })[];
  approvedPrayersCount: number;
  approvedUpdatesCount: number;
  deniedPrayersCount: number;
  deniedUpdatesCount: number;
  loading: boolean;
  error: string | null;
}

export const useAdminData = () => {
  const [data, setData] = useState<AdminData>({
    pendingPrayers: [],
    pendingUpdates: [],
    pendingDeletionRequests: [],
    pendingStatusChangeRequests: [],
    pendingUpdateDeletionRequests: [],
    deniedUpdateDeletionRequests: [],
    approvedPrayers: [],
    approvedUpdates: [],
    deniedPrayers: [],
    deniedUpdates: [],
  deniedStatusChangeRequests: [],
    deniedDeletionRequests: [],
    deniedPreferenceChanges: [],
    approvedPrayersCount: 0,
    approvedUpdatesCount: 0,
    deniedPrayersCount: 0,
    deniedUpdatesCount: 0,
    loading: true,
    error: null
  });

  const isFetchingRef = useRef(false);

  const fetchAdminData = useCallback(async () => {
    if (isFetchingRef.current) {
      return;
    }
    
    try {
      isFetchingRef.current = true;
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Increase timeout to 2 minutes to allow Supabase free tier database to wake up
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 120000);
      });

      // Parallelize all independent queries for much faster loading
      const dataPromise = Promise.all([
        // Pending update deletion requests
        supabase
          .from('update_deletion_requests')
          .select(`*, prayer_updates (*, prayers (prayer_for, title))`)
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false }),
        
        // Pending prayers
        supabase
          .from('prayers')
          .select('*')
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false }),
        
        // Pending updates
        supabase
          .from('prayer_updates')
          .select(`*, prayers!inner(title)`)
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false }),
        
        // Pending deletion requests
        supabase
          .from('deletion_requests')
          .select(`*, prayers!inner(title)`)
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false }),
        
        // Pending status change requests
        supabase
          .from('status_change_requests')
          .select(`*, prayers!inner(title)`)
          .eq('approval_status', 'pending')
          .order('created_at', { ascending: false }),
        
        // Approved prayers count
        supabase
          .from('prayers')
          .select('*', { count: 'exact', head: true })
          .eq('approval_status', 'approved'),
        
        // Approved updates count
        supabase
          .from('prayer_updates')
          .select('*', { count: 'exact', head: true })
          .eq('approval_status', 'approved'),
        
        // Denied prayers count
        supabase
          .from('prayers')
          .select('*', { count: 'exact', head: true })
          .eq('approval_status', 'denied'),
        
        // Denied updates count
        supabase
          .from('prayer_updates')
          .select('*', { count: 'exact', head: true })
          .eq('approval_status', 'denied'),
        
        // Approved prayers list
        supabase
          .from('prayers')
          .select('*')
          .eq('approval_status', 'approved')
          .order('approved_at', { ascending: false }),
        
        // Approved updates list
        supabase
          .from('prayer_updates')
          .select(`*, prayers!inner(title)`)
          .eq('approval_status', 'approved')
          .order('approved_at', { ascending: false }),
        
        // Denied prayers list
        supabase
          .from('prayers')
          .select('*')
          .eq('approval_status', 'denied')
          .order('denied_at', { ascending: false }),
        
        // Denied updates list
        supabase
          .from('prayer_updates')
          .select(`*, prayers!inner(title)`)
          .eq('approval_status', 'denied')
          .order('denied_at', { ascending: false }),
        
        // Denied status change requests
        supabase
          .from('status_change_requests')
          .select(`*, prayers!inner(title)`)
          .eq('approval_status', 'denied')
          .order('reviewed_at', { ascending: false }),
        
        // Denied deletion requests
        supabase
          .from('deletion_requests')
          .select(`*, prayers!inner(title)`)
          .eq('approval_status', 'denied')
          .order('reviewed_at', { ascending: false }),
        
        // Denied update deletion requests
        supabase
          .from('update_deletion_requests')
          .select(`*, prayer_updates (*, prayers (prayer_for, title))`)
          .eq('approval_status', 'denied')
          .order('reviewed_at', { ascending: false }),
        
        // Denied preference changes
        supabase
          .from('pending_preference_changes')
          .select('*')
          .eq('approval_status', 'denied')
          .order('reviewed_at', { ascending: false })
      ]);

      // Race the data fetch against the timeout
      const [
        updateDeletionResult,
        prayersResult,
        updatesResult,
        deletionRequestsResult,
        statusChangeRequestsResult,
        approvedPrayersCountResult,
        approvedUpdatesCountResult,
        deniedPrayersCountResult,
        deniedUpdatesCountResult,
        approvedPrayersResult,
        approvedUpdatesResult,
        deniedPrayersResult,
        deniedUpdatesResult,
        deniedStatusChangeRequestsResult,
        deniedDeletionRequestsResult,
        deniedUpdateDeletionResult,
        deniedPreferenceChangesResult
      ] = await Promise.race([dataPromise, timeoutPromise]) as any[];

      // Check for errors (ignore table-not-found errors for optional tables)
      if (prayersResult.error) throw prayersResult.error;
      if (updatesResult.error) throw updatesResult.error;
      if (deletionRequestsResult.error) throw deletionRequestsResult.error;
      if (approvedPrayersResult.error) throw approvedPrayersResult.error;
      if (approvedUpdatesResult.error) throw approvedUpdatesResult.error;
      if (deniedPrayersResult.error) throw deniedPrayersResult.error;
      if (deniedUpdatesResult.error) throw deniedUpdatesResult.error;
      if (deniedDeletionRequestsResult.error) throw deniedDeletionRequestsResult.error;
      if (deniedPreferenceChangesResult.error) throw deniedPreferenceChangesResult.error;
      
      // Ignore 42P01 (table doesn't exist) for optional tables
      if (updateDeletionResult.error && updateDeletionResult.error.code !== '42P01') throw updateDeletionResult.error;
      if (statusChangeRequestsResult.error && statusChangeRequestsResult.error.code !== '42P01') throw statusChangeRequestsResult.error;
      if (deniedStatusChangeRequestsResult.error && deniedStatusChangeRequestsResult.error.code !== '42P01') throw deniedStatusChangeRequestsResult.error;
      if (deniedUpdateDeletionResult.error && deniedUpdateDeletionResult.error.code !== '42P01') throw deniedUpdateDeletionResult.error;

      // Extract data from results
      const pendingUpdateDeletionRequests = updateDeletionResult.data;
      const pendingPrayers = prayersResult.data;
      const pendingUpdates = updatesResult.data;
      const pendingDeletionRequests = deletionRequestsResult.data;
      const pendingStatusChangeRequests = statusChangeRequestsResult.data;
      const approvedPrayersCount = approvedPrayersCountResult.count;
      const approvedUpdatesCount = approvedUpdatesCountResult.count;
      const deniedPrayersCount = deniedPrayersCountResult.count;
      const deniedUpdatesCount = deniedUpdatesCountResult.count;
      const approvedPrayers = approvedPrayersResult.data;
      const approvedUpdates = approvedUpdatesResult.data;
      const deniedPrayers = deniedPrayersResult.data;
      const deniedUpdates = deniedUpdatesResult.data;
      const deniedStatusChangeRequests = deniedStatusChangeRequestsResult.data;
      const deniedDeletionRequests = deniedDeletionRequestsResult.data;
      const deniedUpdateDeletionRequests = deniedUpdateDeletionResult.data;
      const deniedPreferenceChanges = deniedPreferenceChangesResult.data;

      // Transform joins
      const transformedUpdates = (pendingUpdates || []).map((update: Record<string, unknown>) => ({
        ...update,
        prayer_title: (update.prayers as Record<string, unknown> | undefined)?.title as string | undefined
      })) as (PrayerUpdate & { prayer_title?: string })[];

      const transformedDeletionRequests = (pendingDeletionRequests || []).map((request: Record<string, unknown>) => ({
        ...request,
        prayer_title: (request.prayers as Record<string, unknown> | undefined)?.title as string | undefined
      })) as (DeletionRequest & { prayer_title?: string })[];

      const transformedStatusChangeRequests = (pendingStatusChangeRequests || []).map((request: Record<string, unknown>) => ({
        ...request,
        prayer_title: (request.prayers as Record<string, unknown> | undefined)?.title as string | undefined
      })) as (StatusChangeRequest & { prayer_title?: string })[];

      const transformedApprovedUpdates = (approvedUpdates || []).map((update: Record<string, unknown>) => ({
        ...update,
        prayer_title: (update.prayers as Record<string, unknown> | undefined)?.title as string | undefined
      })) as (PrayerUpdate & { prayer_title?: string })[];

      const transformedDeniedUpdates = (deniedUpdates || []).map((update: Record<string, unknown>) => ({
        ...update,
        prayer_title: (update.prayers as Record<string, unknown> | undefined)?.title as string | undefined
      })) as (PrayerUpdate & { prayer_title?: string })[];

      const transformedDeniedStatusChangeRequests = (deniedStatusChangeRequests || []).map((req: Record<string, unknown>) => ({
        ...req,
        prayer_title: (req.prayers as Record<string, unknown> | undefined)?.title as string | undefined
      })) as (StatusChangeRequest & { prayer_title?: string })[];

      const transformedDeniedDeletionRequests = (deniedDeletionRequests || []).map((req: Record<string, unknown>) => ({
        ...req,
        prayer_title: (req.prayers as Record<string, unknown> | undefined)?.title as string | undefined
      })) as (DeletionRequest & { prayer_title?: string })[];

      setData({
        pendingPrayers: pendingPrayers || [],
        pendingUpdates: transformedUpdates,
        pendingDeletionRequests: transformedDeletionRequests,
        pendingStatusChangeRequests: transformedStatusChangeRequests,
        approvedPrayers: approvedPrayers || [],
        approvedUpdates: transformedApprovedUpdates,
        deniedPrayers: deniedPrayers || [],
        deniedUpdates: transformedDeniedUpdates,
  deniedStatusChangeRequests: transformedDeniedStatusChangeRequests,
        deniedDeletionRequests: transformedDeniedDeletionRequests,
        deniedPreferenceChanges: deniedPreferenceChanges || [],
        approvedPrayersCount: approvedPrayersCount || 0,
        approvedUpdatesCount: approvedUpdatesCount || 0,
        deniedPrayersCount: deniedPrayersCount || 0,
        deniedUpdatesCount: deniedUpdatesCount || 0,
        loading: false,
        error: null,
        pendingUpdateDeletionRequests: pendingUpdateDeletionRequests || [],
        deniedUpdateDeletionRequests: deniedUpdateDeletionRequests || []
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
      logError({
        message: 'Failed to fetch admin data',
        error,
        context: { tags: { hook: 'useAdminData', function: 'fetchData' } }
      });
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch admin data'
      }));
    } finally {
      isFetchingRef.current = false;
    }
  }, []);

  // Approve update deletion request
  const approveUpdateDeletionRequest = useCallback(async (requestId: string) => {
    try {
      // Get the request to find the update ID
      const { data: request, error: fetchError } = await supabase
        .from('update_deletion_requests')
        .select('update_id')
        .eq('id', requestId)
        .single();
      if (fetchError) throw fetchError;
      if (!request) throw new Error('Request not found');

      // Approve the request
      const { error: approveError } = await supabase
        .from('update_deletion_requests')
        .update({ approval_status: 'approved', reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      if (approveError) throw approveError;

      // Delete the update
      const { error: deleteError } = await supabase
        .from('prayer_updates')
        .delete()
        .eq('id', (request as { update_id: string }).update_id);
      if (deleteError) throw deleteError;

      // Optimistically remove from pending list immediately
      setData(prev => ({
        ...prev,
        pendingUpdateDeletionRequests: prev.pendingUpdateDeletionRequests.filter(r => r.id !== requestId)
      }));
    } catch (error) {
      console.error('Failed to approve update deletion request:', error);
      logError({
        message: 'Failed to approve update deletion request',
        error,
        context: { tags: { hook: 'useAdminData', function: 'approveUpdateDeletionRequest' }, metadata: { requestId } }
      });
      alert('Failed to approve update deletion request. Please try again.');
      throw error; // Re-throw so the UI knows the approval failed
    }
  }, []);

  // Deny update deletion request
  const denyUpdateDeletionRequest = useCallback(async (requestId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('update_deletion_requests')
        .update({ approval_status: 'denied', denial_reason: reason, reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
      
      // Optimistically remove from pending list immediately
      setData(prev => ({
        ...prev,
        pendingUpdateDeletionRequests: prev.pendingUpdateDeletionRequests.filter(r => r.id !== requestId)
      }));
    } catch (error) {
      console.error('Failed to deny update deletion request:', error);
      logError({
        message: 'Failed to deny update deletion request',
        error,
        context: { tags: { hook: 'useAdminData', function: 'denyUpdateDeletionRequest' }, metadata: { requestId, reason } }
      });
      alert('Failed to deny update deletion request. Please try again.');
      throw error; // Re-throw so the UI knows the denial failed
    }
  }, []);

  const approvePrayer = useCallback(async (prayerId: string) => {
    try {
      // First get the prayer details before approving
      const { data: prayer, error: fetchError } = await supabase
        .from('prayers')
        .select('*')
        .eq('id', prayerId)
        .single();

      if (fetchError) throw fetchError;
      if (!prayer) throw new Error('Prayer not found');

      // Update the prayer status
      const { error } = await supabase
        .from('prayers')
        .update({
          approval_status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', prayerId);
      
      if (error) throw error;

      // Optimistically remove from pending list immediately
      setData(prev => ({
        ...prev,
        pendingPrayers: prev.pendingPrayers.filter(p => p.id !== prayerId)
      }));

      // Send email notifications (don't let email failures block the approval)
      // These run in parallel and failures are logged but don't stop the flow
      sendApprovedPrayerNotification({
        title: prayer.title,
        description: prayer.description,
        requester: prayer.is_anonymous ? 'Anonymous' : prayer.requester,
        prayerFor: prayer.prayer_for,
        status: prayer.status
      }).catch(err => console.error('Failed to send broadcast notification:', err));

      sendRequesterApprovalNotification({
        title: prayer.title,
        description: prayer.description,
        requester: prayer.is_anonymous ? 'Anonymous' : prayer.requester,
        requesterEmail: prayer.email,
        prayerFor: prayer.prayer_for
      }).catch(err => console.error('Failed to send requester notification:', err));
    } catch (error) {
      console.error('Failed to approve prayer:', error);
      logError({
        message: 'Failed to approve prayer',
        error,
        context: { tags: { hook: 'useAdminData', function: 'approvePrayer' }, metadata: { prayerId } }
      });
      alert('Failed to approve prayer. Please try again.');
      throw error; // Re-throw so the UI knows the approval failed
    }
  }, []);

  const denyPrayer = useCallback(async (prayerId: string, reason: string) => {
    try {
      // First get the prayer details before denying
      const { data: prayer, error: fetchError } = await supabase
        .from('prayers')
        .select('*')
        .eq('id', prayerId)
        .single();

      if (fetchError) throw fetchError;
      if (!prayer) throw new Error('Prayer not found');

      // Update the prayer status
      const { error } = await supabase
        .from('prayers')
        .update({
          approval_status: 'denied',
          denial_reason: reason,
          denied_at: new Date().toISOString()
        })
        .eq('id', prayerId);
      
      if (error) throw error;

      // Optimistically remove from pending list immediately
      setData(prev => ({
        ...prev,
        pendingPrayers: prev.pendingPrayers.filter(p => p.id !== prayerId)
      }));

      // Send email notification to the requester (don't let email failures block the denial)
      if (prayer.email) {
        sendDeniedPrayerNotification({
          title: prayer.title,
          description: prayer.description,
          requester: prayer.is_anonymous ? 'Anonymous' : prayer.requester,
          requesterEmail: prayer.email,
          denialReason: reason
        }).catch(err => console.error('Failed to send denial notification:', err));
      }
    } catch (error) {
      console.error('Failed to deny prayer:', error);
      logError({
        message: 'Failed to deny prayer',
        error,
        context: { tags: { hook: 'useAdminData', function: 'denyPrayer' }, metadata: { prayerId, reason } }
      });
      alert('Failed to deny prayer. Please try again.');
      throw error; // Re-throw so the UI knows the denial failed
    }
  }, []);

  const approveUpdate = useCallback(async (updateId: string) => {
    try {
      // First get the update details, prayer title, and prayer status before approving
      const { data: update, error: fetchError } = await supabase
        .from('prayer_updates')
        .select('*, prayers(title, status)')
        .eq('id', updateId)
        .single();

      if (fetchError) throw fetchError;
      if (!update) throw new Error('Update not found');

      // Update the status
      const { error } = await supabase
        .from('prayer_updates')
        .update({ 
          approval_status: 'approved',
          approved_at: new Date().toISOString()
        })
        .eq('id', updateId);
      
      if (error) throw error;

      // Get the prayer's current status
      const prayerData = update.prayers && typeof update.prayers === 'object' ? update.prayers : null;
      const currentPrayerStatus = prayerData && 'status' in prayerData ? String(prayerData.status) : null;

      // Update prayer status based on the logic:
      // 1. If mark_as_answered is true, set to 'answered'
      // 2. If current status is 'answered' or 'archived' and NOT marked as answered, set to 'current'
      // 3. Otherwise, leave status unchanged
      let newPrayerStatus: string | null = null;
      
      if (update.mark_as_answered) {
        newPrayerStatus = 'answered';
      } else if (currentPrayerStatus === 'answered' || currentPrayerStatus === 'archived') {
        newPrayerStatus = 'current';
      }

      // Update the prayer status if needed
      if (newPrayerStatus) {
        const { error: prayerError } = await supabase
          .from('prayers')
          .update({ status: newPrayerStatus })
          .eq('id', update.prayer_id);
        
        if (prayerError) {
          console.error('Failed to update prayer status:', prayerError);
        }
      }

      // Send mass email notification to all subscribers (don't let email failures block the approval)
      const prayerTitle = prayerData && 'title' in prayerData
        ? String(prayerData.title)
        : 'Prayer';
      sendApprovedUpdateNotification({
        prayerTitle,
        content: update.content,
        author: update.is_anonymous ? 'Anonymous' : (update.author || 'Anonymous'),
        markedAsAnswered: update.mark_as_answered || false
      }).catch(err => console.error('Failed to send update notification:', err));

      // Optimistically remove from pending list immediately
      setData(prev => ({
        ...prev,
        pendingUpdates: prev.pendingUpdates.filter(u => u.id !== updateId)
      }));
    } catch (error) {
      console.error('Failed to approve update:', error);
      logError({
        message: 'Failed to approve prayer update',
        error,
        context: { tags: { hook: 'useAdminData', function: 'approveUpdate' }, metadata: { updateId } }
      });
      alert('Failed to approve update. Please try again.');
      throw error; // Re-throw so the UI knows the approval failed
    }
  }, []);

  const denyUpdate = useCallback(async (updateId: string, reason: string) => {
    try {
      // First get the update details and prayer title before denying
      const { data: update, error: fetchError } = await supabase
        .from('prayer_updates')
        .select('*, prayers(title)')
        .eq('id', updateId)
        .single();

      if (fetchError) throw fetchError;
      if (!update) throw new Error('Update not found');

      // Update the status
      const { error } = await supabase
        .from('prayer_updates')
        .update({ 
          approval_status: 'denied', 
          denial_reason: reason,
          denied_at: new Date().toISOString()
        })
        .eq('id', updateId);
      
      if (error) throw error;

      // Send email notification to the author (don't let email failures block the denial)
      if (update.author_email) {
        const prayerTitle = update.prayers && typeof update.prayers === 'object' && 'title' in update.prayers
          ? String(update.prayers.title)
          : 'Prayer';
        sendDeniedUpdateNotification({
          prayerTitle,
          content: update.content,
          author: update.is_anonymous ? 'Anonymous' : (update.author || 'Anonymous'),
          authorEmail: update.author_email,
          denialReason: reason
        }).catch(err => console.error('Failed to send denial notification:', err));
      }

      // Optimistically remove from pending list immediately
      setData(prev => ({
        ...prev,
        pendingUpdates: prev.pendingUpdates.filter(u => u.id !== updateId)
      }));
    } catch (error) {
      console.error('Failed to deny update:', error);
      logError({
        message: 'Failed to deny prayer update',
        error,
        context: { tags: { hook: 'useAdminData', function: 'denyUpdate' }, metadata: { updateId, reason } }
      });
      alert('Failed to deny update. Please try again.');
      throw error; // Re-throw so the UI knows the denial failed
    }
  }, []);

  // Edit a pending update (admins can modify pending updates before approval)
  const editUpdate = useCallback(async (updateId: string, updates: { content?: string; author?: string }) => {
    try {
      const { error } = await supabase
        .from('prayer_updates')
        .update(updates)
        .eq('id', updateId)
        .eq('approval_status', 'pending'); // only allow editing pending updates
      if (error) throw error;
      
      // Optimistically update the pending update in state
      setData(prev => ({
        ...prev,
        pendingUpdates: prev.pendingUpdates.map(u => 
          u.id === updateId ? { ...u, ...updates } : u
        )
      }));
    } catch (error) {
      console.error('Failed to edit update:', error);
      handleSupabaseError(error);
    }
  }, []);

  const editPrayer = useCallback(async (prayerId: string, updates: { title?: string; description?: string; requester?: string; prayer_for?: string; email?: string | null }) => {
    try {
      const { error } = await supabase
        .from('prayers')
        .update(updates)
        .eq('id', prayerId)
        .eq('approval_status', 'pending'); // Only allow editing pending prayers
      if (error) throw error;
      
      // Optimistically update the pending prayer in state
      setData(prev => ({
        ...prev,
        pendingPrayers: prev.pendingPrayers.map(p => 
          p.id === prayerId ? { ...p, ...updates } : p
        )
      }));
    } catch (error) {
      console.error('Failed to edit prayer:', error);
      throw error; // Re-throw to allow component to handle error state
    }
  }, []);

  const approveDeletionRequest = useCallback(async (requestId: string) => {
    try {
      const { data: deletionRequest, error: fetchError } = await supabase
        .from('deletion_requests')
        .select('prayer_id')
        .eq('id', requestId)
        .single();
      if (fetchError) throw fetchError;
      if (!deletionRequest) throw new Error('Deletion request not found');
      
      const { error: approveError } = await supabase
        .from('deletion_requests')
        .update({ 
          approval_status: 'approved',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);
      if (approveError) throw approveError;
      const { error: deleteError } = await supabase
        .from('prayers')
        .delete()
        .eq('id', (deletionRequest as { prayer_id: string }).prayer_id);
      if (deleteError) throw deleteError;
      
      // Optimistically remove from pending list immediately
      setData(prev => ({
        ...prev,
        pendingDeletionRequests: prev.pendingDeletionRequests.filter(r => r.id !== requestId)
      }));
    } catch (error) {
      console.error('Failed to approve deletion request:', error);
      alert('Failed to approve deletion request. Please try again.');
      throw error; // Re-throw so the UI knows the approval failed
    }
  }, []);

  const denyDeletionRequest = useCallback(async (requestId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('deletion_requests')
        .update({ 
          approval_status: 'denied', 
          denial_reason: reason,
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);
      if (error) throw error;
      
      // Optimistically remove from pending list immediately
      setData(prev => ({
        ...prev,
        pendingDeletionRequests: prev.pendingDeletionRequests.filter(r => r.id !== requestId)
      }));
    } catch (error) {
      console.error('Failed to deny deletion request:', error);
      alert('Failed to deny deletion request. Please try again.');
      throw error; // Re-throw so the UI knows the denial failed
    }
  }, []);

  const approveStatusChangeRequest = useCallback(async (requestId: string) => {
    try {
      // Fetch full status change request details including prayer info
      const { data: statusChangeRequest, error: fetchError } = await supabase
        .from('status_change_requests')
        .select(`
          *,
          prayers!inner(title, status)
        `)
        .eq('id', requestId)
        .single();
      
      if (fetchError || !statusChangeRequest) throw fetchError || new Error('Status change request not found');
      
      const currentStatus = statusChangeRequest.prayers.status;
      const newStatus = statusChangeRequest.requested_status;
      
      // Update status change request to approved
      const { error: approveError } = await supabase
        .from('status_change_requests')
        .update({ 
          approval_status: 'approved', 
          reviewed_by: 'admin', 
          reviewed_at: new Date().toISOString() 
        })
        .eq('id', requestId);
      if (approveError) throw approveError;
      
      // Update prayer status
      const { error: updateError } = await supabase
        .from('prayers')
        .update({ 
          status: newStatus, 
          date_answered: newStatus === 'answered' ? new Date().toISOString() : null 
        })
        .eq('id', statusChangeRequest.prayer_id);
      if (updateError) throw updateError;
      
      setData(prev => ({ ...prev, pendingStatusChangeRequests: prev.pendingStatusChangeRequests.filter(req => req.id !== requestId) }));
    } catch (error) {
      console.error('Error approving status change request:', error);
      handleSupabaseError(error);
      throw error; // Re-throw so the UI knows the approval failed
    }
  }, []);

  const denyStatusChangeRequest = useCallback(async (requestId: string, reason: string) => {
    try {
      // Fetch full status change request details including prayer info
      const { data: statusChangeRequest, error: fetchError } = await supabase
        .from('status_change_requests')
        .select(`
          *,
          prayers!inner(title, status)
        `)
        .eq('id', requestId)
        .single();
      
      if (fetchError || !statusChangeRequest) throw fetchError || new Error('Status change request not found');
      
      // Update status change request to denied
      const { error } = await supabase
        .from('status_change_requests')
        .update({ 
          approval_status: 'denied', 
          reviewed_by: 'admin', 
          reviewed_at: new Date().toISOString(), 
          denial_reason: reason 
        })
        .eq('id', requestId);
      if (error) throw error;
      
      setData(prev => ({ ...prev, pendingStatusChangeRequests: prev.pendingStatusChangeRequests.filter(req => req.id !== requestId) }));
    } catch (error) {
      handleSupabaseError(error);
      throw error; // Re-throw so the UI knows the denial failed
    }
  }, []);

  // Initial data fetch
  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  return {
    ...data,
    approvePrayer,
    denyPrayer,
    approveUpdate,
    denyUpdate,
    approveDeletionRequest,
    denyDeletionRequest,
    approveStatusChangeRequest,
    denyStatusChangeRequest,
    editPrayer,
    refresh: fetchAdminData,
    approveUpdateDeletionRequest,
    denyUpdateDeletionRequest
    ,editUpdate
  };
};