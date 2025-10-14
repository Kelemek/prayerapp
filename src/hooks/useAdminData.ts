import { useState, useEffect, useCallback } from 'react';
import { supabase, handleSupabaseError } from '../lib/supabase';
import type { PrayerRequest, PrayerUpdate, DeletionRequest, StatusChangeRequest } from '../types/prayer';

interface AdminData {
  pendingPrayers: PrayerRequest[];
  pendingUpdates: (PrayerUpdate & { prayer_title?: string })[];
  pendingDeletionRequests: (DeletionRequest & { prayer_title?: string })[];
  pendingStatusChangeRequests: (StatusChangeRequest & { prayer_title?: string })[];
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
    approvedPrayers: [],
    approvedUpdates: [],
    deniedPrayers: [],
    deniedUpdates: [],
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

      // Handle case where table doesn't exist yet
      if (statusChangeRequestsError && statusChangeRequestsError.code === '42P01') {
        console.warn('status_change_requests table does not exist yet. Please run the migration.');
        // Continue with empty array
      } else if (statusChangeRequestsError) {
        throw statusChangeRequestsError;
      }

      // Fetch approved counts
      const { count: approvedPrayersCount } = await supabase
        .from('prayers')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'approved');

      const { count: approvedUpdatesCount } = await supabase
        .from('prayer_updates')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'approved');

      // Fetch denied counts
      const { count: deniedPrayersCount } = await supabase
        .from('prayers')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'denied');

      const { count: deniedUpdatesCount } = await supabase
        .from('prayer_updates')
        .select('*', { count: 'exact', head: true })
        .eq('approval_status', 'denied');

      // Fetch approved prayers
      const { data: approvedPrayers, error: approvedPrayersError } = await supabase
        .from('prayers')
        .select('*')
        .eq('approval_status', 'approved')
        .order('approved_at', { ascending: false });

      if (approvedPrayersError) throw approvedPrayersError;

      // Fetch approved updates with prayer titles
      const { data: approvedUpdates, error: approvedUpdatesError } = await supabase
        .from('prayer_updates')
        .select(`
          *,
          prayers!inner(title)
        `)
        .eq('approval_status', 'approved')
        .order('approved_at', { ascending: false });

      if (approvedUpdatesError) throw approvedUpdatesError;

      // Fetch denied prayers
      const { data: deniedPrayers, error: deniedPrayersError } = await supabase
        .from('prayers')
        .select('*')
        .eq('approval_status', 'denied')
        .order('approved_at', { ascending: false });

      if (deniedPrayersError) throw deniedPrayersError;

      // Fetch denied updates with prayer titles
      const { data: deniedUpdates, error: deniedUpdatesError } = await supabase
        .from('prayer_updates')
        .select(`
          *,
          prayers!inner(title)
        `)
        .eq('approval_status', 'denied')
        .order('approved_at', { ascending: false });

      if (deniedUpdatesError) throw deniedUpdatesError;

      // Transform pending updates to include prayer title
      const transformedUpdates = pendingUpdates?.map((update: any) => ({
        ...update,
        prayer_title: update.prayers?.title
      })) || [];

      // Transform pending deletion requests to include prayer title
      const transformedDeletionRequests = pendingDeletionRequests?.map((request: any) => ({
        ...request,
        prayer_title: request.prayers?.title
      })) || [];

      // Transform pending status change requests to include prayer title
      const transformedStatusChangeRequests = pendingStatusChangeRequests?.map((request: any) => ({
        ...request,
        prayer_title: request.prayers?.title
      })) || [];

      // Transform approved updates to include prayer title
      const transformedApprovedUpdates = approvedUpdates?.map((update: any) => ({
        ...update,
        prayer_title: update.prayers?.title
      })) || [];

      // Transform denied updates to include prayer title
      const transformedDeniedUpdates = deniedUpdates?.map((update: any) => ({
        ...update,
        prayer_title: update.prayers?.title
      })) || [];

      setData({
        pendingPrayers: pendingPrayers || [],
        pendingUpdates: transformedUpdates,
        pendingDeletionRequests: transformedDeletionRequests,
        pendingStatusChangeRequests: transformedStatusChangeRequests,
        approvedPrayers: approvedPrayers || [],
        approvedUpdates: transformedApprovedUpdates,
        deniedPrayers: deniedPrayers || [],
        deniedUpdates: transformedDeniedUpdates,
        approvedPrayersCount: approvedPrayersCount || 0,
        approvedUpdatesCount: approvedUpdatesCount || 0,
        deniedPrayersCount: deniedPrayersCount || 0,
        deniedUpdatesCount: deniedUpdatesCount || 0,
        loading: false,
        error: null
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

  const approvePrayer = useCallback(async (prayerId: string) => {
    try {
      console.log('Approving prayer:', prayerId);
      const { error } = await supabase
        .from('prayers')
        .update({
          approval_status: 'approved'
        })
        .eq('id', prayerId);

      if (error) {
        console.error('Error approving prayer:', error);
        throw error;
      }

      console.log('Prayer approved successfully');
      // Refresh data after approval
      await fetchAdminData();
    } catch (error) {
      console.error('Failed to approve prayer:', error);
      alert('Failed to approve prayer. Please try again.');
    }
  }, [fetchAdminData]);

  const denyPrayer = useCallback(async (prayerId: string, reason: string) => {
    try {
      console.log('Denying prayer:', prayerId, 'with reason:', reason);
      const { error } = await supabase
        .from('prayers')
        .update({
          approval_status: 'denied',
          denial_reason: reason
        })
        .eq('id', prayerId);

      if (error) {
        console.error('Error denying prayer:', error);
        throw error;
      }

      console.log('Prayer denied successfully');
      // Refresh data after denial
      await fetchAdminData();
    } catch (error) {
      console.error('Failed to deny prayer:', error);
      alert('Failed to deny prayer. Please try again.');
    }
  }, [fetchAdminData]);

  const approveUpdate = useCallback(async (updateId: string) => {
    try {
      const { error } = await supabase
        .from('prayer_updates')
        .update({
          approval_status: 'approved'
        })
        .eq('id', updateId);

      if (error) throw error;

      // Refresh data after approval
      await fetchAdminData();
    } catch (error) {
      console.error('Failed to approve update:', error);
      alert('Failed to approve update. Please try again.');
    }
  }, [fetchAdminData]);

  const denyUpdate = useCallback(async (updateId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('prayer_updates')
        .update({
          approval_status: 'denied',
          denial_reason: reason
        })
        .eq('id', updateId);

      if (error) throw error;

      // Refresh data after denial
      await fetchAdminData();
    } catch (error) {
      console.error('Failed to deny update:', error);
      alert('Failed to deny update. Please try again.');
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

      // Refresh data after edit
      await fetchAdminData();
    } catch (error) {
      handleSupabaseError(error);
    }
  }, [fetchAdminData]);

  const approveDeletionRequest = useCallback(async (requestId: string) => {
    try {
      // Get the deletion request to find the prayer ID
      const { data: deletionRequest, error: fetchError } = await supabase
        .from('deletion_requests')
        .select('prayer_id')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;

      // Approve the deletion request
      const { error: approveError } = await supabase
        .from('deletion_requests')
        .update({
          approval_status: 'approved'
        })
        .eq('id', requestId);

      if (approveError) throw approveError;

      // Delete the prayer
      const { error: deleteError } = await supabase
        .from('prayers')
        .delete()
        .eq('id', (deletionRequest as any).prayer_id);

      if (deleteError) throw deleteError;

      // Refresh data after approval
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
        .update({
          approval_status: 'denied',
          denial_reason: reason
        })
        .eq('id', requestId);

      if (error) throw error;

      // Refresh data after denial
      await fetchAdminData();
    } catch (error) {
      console.error('Failed to deny deletion request:', error);
      alert('Failed to deny deletion request. Please try again.');
    }
  }, [fetchAdminData]);

  const approveStatusChangeRequest = useCallback(async (requestId: string) => {
    try {
      // Get the status change request to find the prayer ID and new status
      const { data: statusChangeRequest, error: fetchError } = await supabase
        .from('status_change_requests')
        .select('prayer_id, requested_status')
        .eq('id', requestId)
        .single();

      if (fetchError || !statusChangeRequest) throw fetchError || new Error('Status change request not found');

      // Approve the status change request
      const { error: approveError } = await supabase
        .from('status_change_requests')
        .update({
          approval_status: 'approved',
          reviewed_by: 'admin',
          reviewed_at: new Date().toISOString()
        } as any)
        .eq('id', requestId);

      if (approveError) throw approveError;

      // Update the prayer status
      const { error: updateError } = await supabase
        .from('prayers')
        .update({
          status: statusChangeRequest.requested_status,
          date_answered: statusChangeRequest.requested_status === 'answered' ? new Date().toISOString() : null
        } as any)
        .eq('id', statusChangeRequest.prayer_id);

      if (updateError) throw updateError;

      // Immediately update local state to remove the request from pending list
      setData(prev => ({
        ...prev,
        pendingStatusChangeRequests: prev.pendingStatusChangeRequests.filter(req => req.id !== requestId)
      }));

      // Fallback refresh to ensure consistency
      setTimeout(async () => {
        await fetchAdminData();
      }, 1000);
    } catch (error) {
      console.error('Error approving status change request:', error);
      handleSupabaseError(error);
    }
  }, [fetchAdminData]);

  const denyStatusChangeRequest = useCallback(async (requestId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('status_change_requests')
        .update({
          approval_status: 'denied',
          reviewed_by: 'admin',
          reviewed_at: new Date().toISOString(),
          denial_reason: reason
        } as any)
        .eq('id', requestId);

      if (error) throw error;

      // Immediately update local state to remove the request from pending list
      setData(prev => ({
        ...prev,
        pendingStatusChangeRequests: prev.pendingStatusChangeRequests.filter(req => req.id !== requestId)
      }));

      // Fallback refresh to ensure consistency
      setTimeout(async () => {
        await fetchAdminData();
      }, 1000);
    } catch (error) {
      handleSupabaseError(error);
    }
  }, [fetchAdminData]);

  // Initial data fetch
  useEffect(() => {
    fetchAdminData();
  }, [fetchAdminData]);

  // Set up real-time subscriptions for pending items
  useEffect(() => {
    const prayersSubscription = supabase
      .channel('admin_prayers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prayers',
          filter: 'approval_status=eq.pending'
        },
        () => {
          fetchAdminData();
        }
      )
      .subscribe();

    const updatesSubscription = supabase
      .channel('admin_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'prayer_updates',
          filter: 'approval_status=eq.pending'
        },
        () => {
          fetchAdminData();
        }
      )
      .subscribe();

    const deletionRequestsSubscription = supabase
      .channel('admin_deletion_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'deletion_requests'
        },
        () => {
          fetchAdminData();
        }
      )
      .subscribe();

    const statusChangeRequestsSubscription = supabase
      .channel('admin_status_change_requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'status_change_requests'
        },
        () => {
          fetchAdminData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(prayersSubscription);
      supabase.removeChannel(updatesSubscription);
      supabase.removeChannel(deletionRequestsSubscription);
      supabase.removeChannel(statusChangeRequestsSubscription);
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
    refresh: fetchAdminData
  };
};