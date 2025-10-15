import { useState, useEffect, useCallback } from 'react';
import { supabase, handleSupabaseError } from '../lib/supabase';
import type { PrayerRequest, PrayerUpdate, DeletionRequest, StatusChangeRequest } from '../types/prayer';
import { sendApprovedPrayerNotification, sendApprovedUpdateNotification, sendDeniedPrayerNotification, sendDeniedUpdateNotification } from '../lib/emailNotifications';

interface AdminData {
  pendingUpdateDeletionRequests: any[];
  pendingPrayers: PrayerRequest[];
  pendingUpdates: (PrayerUpdate & { prayer_title?: string })[];
  pendingDeletionRequests: (DeletionRequest & { prayer_title?: string })[];
  pendingStatusChangeRequests: (StatusChangeRequest & { prayer_title?: string })[];
  deniedStatusChangeRequests: (StatusChangeRequest & { prayer_title?: string })[];
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
    approvedPrayers: [],
    approvedUpdates: [],
    deniedPrayers: [],
    deniedUpdates: [],
  deniedStatusChangeRequests: [],
    approvedPrayersCount: 0,
    approvedUpdatesCount: 0,
    deniedPrayersCount: 0,
    deniedUpdatesCount: 0,
    loading: true,
    error: null
  });

  const fetchAdminData = useCallback(async () => {
    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch pending update deletion requests with update and prayer info
      const { data: pendingUpdateDeletionRequests, error: updateDeletionError } = await supabase
        .from('update_deletion_requests')
        .select(`
          *,
          prayer_updates (
            *,
            prayers (prayer_for, title)
          )
        `)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });

      if (updateDeletionError && updateDeletionError.code !== '42P01') throw updateDeletionError;

      // Fetch pending prayers
      const { data: pendingPrayers, error: prayersError } = await supabase
        .from('prayers')
        .select('*')
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });
      if (prayersError) throw prayersError;

      // Fetch pending updates with prayer titles
      const { data: pendingUpdates, error: updatesError } = await supabase
        .from('prayer_updates')
        .select(`
          *,
          prayers!inner(title)
        `)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });
      if (updatesError) throw updatesError;

      // Fetch pending deletion requests with prayer titles
      const { data: pendingDeletionRequests, error: deletionRequestsError } = await supabase
        .from('deletion_requests')
        .select(`
          *,
          prayers!inner(title)
        `)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });
      if (deletionRequestsError) throw deletionRequestsError;

      // Fetch pending status change requests with prayer titles
      const { data: pendingStatusChangeRequests, error: statusChangeRequestsError } = await supabase
        .from('status_change_requests')
        .select(`
          *,
          prayers!inner(title)
        `)
        .eq('approval_status', 'pending')
        .order('created_at', { ascending: false });
      if (statusChangeRequestsError && statusChangeRequestsError.code !== '42P01') throw statusChangeRequestsError;

      // Fetch approved/denied counts and lists
      const { count: approvedPrayersCount } = await supabase
        .from('prayers')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'approved');

      const { count: approvedUpdatesCount } = await supabase
        .from('prayer_updates')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'approved');

      const { count: deniedPrayersCount } = await supabase
        .from('prayers')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'denied');

      const { count: deniedUpdatesCount } = await supabase
        .from('prayer_updates')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'denied');

      const { data: approvedPrayers, error: approvedPrayersError } = await supabase
        .from('prayers')
        .select('*')
        .eq('approval_status', 'approved')
        .order('approved_at', { ascending: false });
      if (approvedPrayersError) throw approvedPrayersError;

      const { data: approvedUpdates, error: approvedUpdatesError } = await supabase
        .from('prayer_updates')
        .select(`
          *,
          prayers!inner(title)
        `)
        .eq('approval_status', 'approved')
        .order('approved_at', { ascending: false });
      if (approvedUpdatesError) throw approvedUpdatesError;

      const { data: deniedPrayers, error: deniedPrayersError } = await supabase
        .from('prayers')
        .select('*')
        .eq('approval_status', 'denied')
        .order('approved_at', { ascending: false });
      if (deniedPrayersError) throw deniedPrayersError;

      const { data: deniedUpdates, error: deniedUpdatesError } = await supabase
        .from('prayer_updates')
        .select(`
          *,
          prayers!inner(title)
        `)
        .eq('approval_status', 'denied')
        .order('approved_at', { ascending: false });
      if (deniedUpdatesError) throw deniedUpdatesError;

      // Fetch denied status change requests with prayer titles
      const { data: deniedStatusChangeRequests, error: deniedStatusChangeRequestsError } = await supabase
        .from('status_change_requests')
        .select(`
          *,
          prayers!inner(title)
        `)
        .eq('approval_status', 'denied')
        .order('reviewed_at', { ascending: false });
      if (deniedStatusChangeRequestsError && deniedStatusChangeRequestsError.code !== '42P01') throw deniedStatusChangeRequestsError;

      // Transform joins
      const transformedUpdates = (pendingUpdates || []).map((update: any) => ({
        ...update,
        prayer_title: update.prayers?.title
      }));

      const transformedDeletionRequests = (pendingDeletionRequests || []).map((request: any) => ({
        ...request,
        prayer_title: request.prayers?.title
      }));

      const transformedStatusChangeRequests = (pendingStatusChangeRequests || []).map((request: any) => ({
        ...request,
        prayer_title: request.prayers?.title
      }));

      const transformedApprovedUpdates = (approvedUpdates || []).map((update: any) => ({
        ...update,
        prayer_title: update.prayers?.title
      }));

      const transformedDeniedUpdates = (deniedUpdates || []).map((update: any) => ({
        ...update,
        prayer_title: update.prayers?.title
      }));

      const transformedDeniedStatusChangeRequests = (deniedStatusChangeRequests || []).map((req: any) => ({
        ...req,
        prayer_title: req.prayers?.title
      }));

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
        approvedPrayersCount: approvedPrayersCount || 0,
        approvedUpdatesCount: approvedUpdatesCount || 0,
        deniedPrayersCount: deniedPrayersCount || 0,
        deniedUpdatesCount: deniedUpdatesCount || 0,
        loading: false,
        error: null,
        pendingUpdateDeletionRequests: pendingUpdateDeletionRequests || []
      });
    } catch (error) {
      console.error('Error fetching admin data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load admin data'
      }));
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
        .eq('id', (request as any).update_id);
      if (deleteError) throw deleteError;

      await fetchAdminData();
    } catch (error) {
      console.error('Failed to approve update deletion request:', error);
      alert('Failed to approve update deletion request. Please try again.');
    }
  }, [fetchAdminData]);

  // Deny update deletion request
  const denyUpdateDeletionRequest = useCallback(async (requestId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('update_deletion_requests')
        .update({ approval_status: 'denied', denial_reason: reason, reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
      await fetchAdminData();
    } catch (error) {
      console.error('Failed to deny update deletion request:', error);
      alert('Failed to deny update deletion request. Please try again.');
    }
  }, [fetchAdminData]);

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
          approval_status: 'approved'
        })
        .eq('id', prayerId);
      
      if (error) throw error;

      // Send email notification
      await sendApprovedPrayerNotification({
        title: prayer.title,
        description: prayer.description,
        requester: prayer.is_anonymous ? 'Anonymous' : prayer.requester,
        prayerFor: prayer.prayer_for,
        status: prayer.status
      });

      await fetchAdminData();
    } catch (error) {
      console.error('Failed to approve prayer:', error);
      alert('Failed to approve prayer. Please try again.');
    }
  }, [fetchAdminData]);

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
          denial_reason: reason
        })
        .eq('id', prayerId);
      
      if (error) throw error;

      // Send email notification to the requester
      if (prayer.email) {
        await sendDeniedPrayerNotification({
          title: prayer.title,
          description: prayer.description,
          requester: prayer.is_anonymous ? 'Anonymous' : prayer.requester,
          requesterEmail: prayer.email,
          denialReason: reason
        });
      }

      await fetchAdminData();
    } catch (error) {
      console.error('Failed to deny prayer:', error);
      alert('Failed to deny prayer. Please try again.');
    }
  }, [fetchAdminData]);

  const approveUpdate = useCallback(async (updateId: string) => {
    try {
      // First get the update details and prayer title before approving
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
        .update({ approval_status: 'approved' })
        .eq('id', updateId);
      
      if (error) throw error;

      // Send email notification
      await sendApprovedUpdateNotification({
        prayerTitle: (update.prayers as any)?.title || 'Prayer',
        content: update.content,
        author: update.is_anonymous ? 'Anonymous' : (update.author || 'Anonymous')
      });

      await fetchAdminData();
    } catch (error) {
      console.error('Failed to approve update:', error);
      alert('Failed to approve update. Please try again.');
    }
  }, [fetchAdminData]);

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
        .update({ approval_status: 'denied', denial_reason: reason })
        .eq('id', updateId);
      
      if (error) throw error;

      // Send email notification to the author
      if (update.author_email) {
        await sendDeniedUpdateNotification({
          prayerTitle: (update.prayers as any)?.title || 'Prayer',
          content: update.content,
          author: update.is_anonymous ? 'Anonymous' : (update.author || 'Anonymous'),
          authorEmail: update.author_email,
          denialReason: reason
        });
      }

      await fetchAdminData();
    } catch (error) {
      console.error('Failed to deny update:', error);
      alert('Failed to deny update. Please try again.');
    }
  }, [fetchAdminData]);

  // Edit a pending update (admins can modify pending updates before approval)
  const editUpdate = useCallback(async (updateId: string, updates: { content?: string; author?: string }) => {
    try {
      const { error } = await supabase
        .from('prayer_updates')
        // @ts-ignore
        .update(updates)
        .eq('id', updateId)
        .eq('approval_status', 'pending'); // only allow editing pending updates
      if (error) throw error;
      await fetchAdminData();
    } catch (error) {
      console.error('Failed to edit update:', error);
      handleSupabaseError(error);
    }
  }, [fetchAdminData]);

  const editPrayer = useCallback(async (prayerId: string, updates: { title?: string; description?: string; requester?: string; prayer_for?: string; email?: string | null }) => {
    try {
      const { error } = await supabase
        .from('prayers')
        // @ts-ignore
        .update(updates)
        .eq('id', prayerId)
        .eq('approval_status', 'pending'); // Only allow editing pending prayers
      if (error) throw error;
      await fetchAdminData();
    } catch (error) {
      handleSupabaseError(error);
    }
  }, [fetchAdminData]);

  const approveDeletionRequest = useCallback(async (requestId: string) => {
    try {
      const { data: deletionRequest, error: fetchError } = await supabase
        .from('deletion_requests')
        .select('prayer_id')
        .eq('id', requestId)
        .single();
      if (fetchError) throw fetchError;
      const { error: approveError } = await supabase
        .from('deletion_requests')
        .update({ approval_status: 'approved' })
        .eq('id', requestId);
      if (approveError) throw approveError;
      const { error: deleteError } = await supabase
        .from('prayers')
        .delete()
        .eq('id', (deletionRequest as any).prayer_id);
      if (deleteError) throw deleteError;
      await fetchAdminData();
    } catch (error) {
      console.error('Failed to approve deletion request:', error);
      alert('Failed to approve deletion request. Please try again.');
    }
  }, [fetchAdminData]);

  const denyDeletionRequest = useCallback(async (requestId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('deletion_requests')
        .update({ approval_status: 'denied', denial_reason: reason })
        .eq('id', requestId);
      if (error) throw error;
      await fetchAdminData();
    } catch (error) {
      console.error('Failed to deny deletion request:', error);
      alert('Failed to deny deletion request. Please try again.');
    }
  }, [fetchAdminData]);

  const approveStatusChangeRequest = useCallback(async (requestId: string) => {
    try {
      const { data: statusChangeRequest, error: fetchError } = await supabase
        .from('status_change_requests')
        .select('prayer_id, requested_status')
        .eq('id', requestId)
        .single();
      if (fetchError || !statusChangeRequest) throw fetchError || new Error('Status change request not found');
      const { error: approveError } = await supabase
        .from('status_change_requests')
        .update({ approval_status: 'approved', reviewed_by: 'admin', reviewed_at: new Date().toISOString() } as any)
        .eq('id', requestId);
      if (approveError) throw approveError;
      const { error: updateError } = await supabase
        .from('prayers')
        .update({ status: statusChangeRequest.requested_status, date_answered: statusChangeRequest.requested_status === 'answered' ? new Date().toISOString() : null } as any)
        .eq('id', statusChangeRequest.prayer_id);
      if (updateError) throw updateError;
      setData(prev => ({ ...prev, pendingStatusChangeRequests: prev.pendingStatusChangeRequests.filter(req => req.id !== requestId) }));
      setTimeout(async () => { await fetchAdminData(); }, 1000);
    } catch (error) {
      console.error('Error approving status change request:', error);
      handleSupabaseError(error);
    }
  }, [fetchAdminData]);

  const denyStatusChangeRequest = useCallback(async (requestId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('status_change_requests')
        .update({ approval_status: 'denied', reviewed_by: 'admin', reviewed_at: new Date().toISOString(), denial_reason: reason } as any)
        .eq('id', requestId);
      if (error) throw error;
      setData(prev => ({ ...prev, pendingStatusChangeRequests: prev.pendingStatusChangeRequests.filter(req => req.id !== requestId) }));
      setTimeout(async () => { await fetchAdminData(); }, 1000);
    } catch (error) {
      handleSupabaseError(error);
    }
  }, [fetchAdminData]);

  // Initial data fetch
  useEffect(() => { fetchAdminData(); }, [fetchAdminData]);

  // Set up real-time subscriptions for pending items
  useEffect(() => {
    const prayersSubscription = supabase.channel('admin_prayers')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prayers', filter: 'approval_status=eq.pending' }, () => fetchAdminData())
      .subscribe();

    const updatesSubscription = supabase.channel('admin_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'prayer_updates', filter: 'approval_status=eq.pending' }, () => fetchAdminData())
      .subscribe();

    const deletionRequestsSubscription = supabase.channel('admin_deletion_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'deletion_requests' }, () => fetchAdminData())
      .subscribe();

    const statusChangeRequestsSubscription = supabase.channel('admin_status_change_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'status_change_requests' }, () => fetchAdminData())
      .subscribe();

    const updateDeletionRequestsSubscription = supabase.channel('admin_update_deletion_requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'update_deletion_requests' }, () => fetchAdminData())
      .subscribe();

    return () => {
      supabase.removeChannel(prayersSubscription);
      supabase.removeChannel(updatesSubscription);
      supabase.removeChannel(deletionRequestsSubscription);
      supabase.removeChannel(statusChangeRequestsSubscription);
      supabase.removeChannel(updateDeletionRequestsSubscription);
    };
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