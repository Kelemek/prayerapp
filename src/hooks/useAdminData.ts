import { useState, useEffect, useCallback } from 'react';
import { supabase, handleSupabaseError } from '../lib/supabase';
import type { PrayerRequest, PrayerUpdate, DeletionRequest } from '../types/prayer';

interface AdminData {
  pendingPrayers: PrayerRequest[];
  pendingUpdates: (PrayerUpdate & { prayer_title?: string })[];
  pendingDeletionRequests: (DeletionRequest & { prayer_title?: string })[];
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

      // Transform pending updates to include prayer title
      const transformedUpdates = pendingUpdates?.map(update => ({
        ...update,
        prayer_title: (update as any).prayers?.title
      })) || [];

      // Transform pending deletion requests to include prayer title
      const transformedDeletionRequests = pendingDeletionRequests?.map(request => ({
        ...request,
        prayer_title: (request as any).prayers?.title
      })) || [];

      setData({
        pendingPrayers: pendingPrayers || [],
        pendingUpdates: transformedUpdates,
        pendingDeletionRequests: transformedDeletionRequests,
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
      const { error } = await supabase
        .from('prayers')
        .update({
          approval_status: 'approved',
          approved_by: 'admin', // In a real app, this would be the current admin user
          approved_at: new Date().toISOString()
        })
        .eq('id', prayerId);

      if (error) throw error;

      // Refresh data after approval
      await fetchAdminData();
    } catch (error) {
      handleSupabaseError(error);
    }
  }, [fetchAdminData]);

  const denyPrayer = useCallback(async (prayerId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('prayers')
        .update({
          approval_status: 'denied',
          approved_by: 'admin',
          approved_at: new Date().toISOString(),
          denial_reason: reason
        })
        .eq('id', prayerId);

      if (error) throw error;

      // Refresh data after denial
      await fetchAdminData();
    } catch (error) {
      handleSupabaseError(error);
    }
  }, [fetchAdminData]);

  const approveUpdate = useCallback(async (updateId: string) => {
    try {
      const { error } = await supabase
        .from('prayer_updates')
        .update({
          approval_status: 'approved',
          approved_by: 'admin',
          approved_at: new Date().toISOString()
        })
        .eq('id', updateId);

      if (error) throw error;

      // Refresh data after approval
      await fetchAdminData();
    } catch (error) {
      handleSupabaseError(error);
    }
  }, [fetchAdminData]);

  const denyUpdate = useCallback(async (updateId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('prayer_updates')
        .update({
          approval_status: 'denied',
          approved_by: 'admin',
          approved_at: new Date().toISOString(),
          denial_reason: reason
        })
        .eq('id', updateId);

      if (error) throw error;

      // Refresh data after denial
      await fetchAdminData();
    } catch (error) {
      handleSupabaseError(error);
    }
  }, [fetchAdminData]);

  const editPrayer = useCallback(async (prayerId: string, updates: { title?: string; description?: string; requester?: string; prayer_for?: string; email?: string | null }) => {
    try {
      const { error } = await supabase
        .from('prayers')
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
          approval_status: 'approved',
          reviewed_by: 'admin',
          reviewed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (approveError) throw approveError;

      // Delete the prayer
      const { error: deleteError } = await supabase
        .from('prayers')
        .delete()
        .eq('id', deletionRequest.prayer_id);

      if (deleteError) throw deleteError;

      // Refresh data after approval
      await fetchAdminData();
    } catch (error) {
      handleSupabaseError(error);
    }
  }, [fetchAdminData]);

  const denyDeletionRequest = useCallback(async (requestId: string, reason: string) => {
    try {
      const { error } = await supabase
        .from('deletion_requests')
        .update({
          approval_status: 'denied',
          reviewed_by: 'admin',
          reviewed_at: new Date().toISOString(),
          denial_reason: reason
        })
        .eq('id', requestId);

      if (error) throw error;

      // Refresh data after denial
      await fetchAdminData();
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
          table: 'deletion_requests',
          filter: 'approval_status=eq.pending'
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
    editPrayer,
    refresh: fetchAdminData
  };
};