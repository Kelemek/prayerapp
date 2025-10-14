import { useState, useEffect, useCallback } from 'react';
import { supabase, handleSupabaseError } from '../lib/supabase';
import { PrayerStatus } from '../types/prayer';
import type { PrayerRequest } from '../types/prayer';
import type { Database } from '../lib/database.types';

type DbPrayer = Database['public']['Tables']['prayers']['Row'];
type DbPrayerUpdate = Database['public']['Tables']['prayer_updates']['Row'];

export const usePrayerManager = () => {
  const [prayers, setPrayers] = useState<PrayerRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Convert database prayer to app prayer format
  const convertDbPrayer = (dbPrayer: DbPrayer, updates: DbPrayerUpdate[] = []): PrayerRequest => {
    // Filter to only show approved updates
    const approvedUpdates = updates.filter(update => update.approval_status === 'approved');
    
    return {
      id: dbPrayer.id,
      title: dbPrayer.title,
      description: dbPrayer.description,
      status: dbPrayer.status as PrayerStatus,
      requester: dbPrayer.requester,
      prayer_for: dbPrayer.prayer_for,
      email: dbPrayer.email,
      is_anonymous: dbPrayer.is_anonymous,
      date_requested: dbPrayer.date_requested,
      date_answered: dbPrayer.date_answered,
      created_at: dbPrayer.created_at,
      updated_at: dbPrayer.updated_at,
      updates: approvedUpdates.map(update => ({
        id: update.id,
        prayer_id: update.prayer_id,
        content: update.content,
        author: update.author,
        created_at: update.created_at
      }))
    };
  };

  // Load prayers from Supabase
  const loadPrayers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch approved prayers with their approved updates
      const { data: prayersData, error: prayersError } = await supabase
        .from('prayers')
        .select(`
          *,
          prayer_updates (*)
        `)
        .eq('approval_status', 'approved')
        .order('created_at', { ascending: false });

      if (prayersError) throw prayersError;

      const formattedPrayers = prayersData?.map(prayer => 
        convertDbPrayer(prayer, prayer.prayer_updates || [])
      ) || [];

      setPrayers(formattedPrayers);
    } catch (error: any) {
      console.error('Failed to load prayers:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load prayers on mount
  useEffect(() => {
    loadPrayers();
  }, [loadPrayers]);

  // Set up real-time subscription for changes from OTHER clients
  useEffect(() => {
    const prayersSubscription = supabase
      .channel('prayers-realtime', {
        config: {
          broadcast: { self: false }, // Don't trigger for our own changes
        },
      })
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'prayers' },
        (payload) => {
          if (payload.new) {
            const newPrayer = convertDbPrayer(payload.new as any);
            setPrayers(prev => [newPrayer, ...prev]);
          }
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'prayers' },
        (payload) => {
          if (payload.new) {
            const updatedPrayer = convertDbPrayer(payload.new as any);
            setPrayers(prev => prev.map(p => 
              p.id === updatedPrayer.id ? { ...updatedPrayer, updates: p.updates } : p
            ));
          }
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'prayers' },
        (payload) => {
          if (payload.old) {
            setPrayers(prev => prev.filter(p => p.id !== (payload.old as any).id));
          }
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'prayer_updates' },
        () => {
          loadPrayers();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(prayersSubscription);
    };
  }, [loadPrayers]);

  const addPrayer = async (prayer: Omit<PrayerRequest, 'id' | 'date_requested' | 'created_at' | 'updated_at' | 'updates'>) => {
    try {
      // Prepare the base prayer data
      const prayerData: any = {
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
      
      // Don't add to local state since it's pending approval
      // Show success message that prayer is submitted for review
      return data; // Return the data but don't add to local state
    } catch (error: any) {
      console.error('Error adding prayer:', error);
      handleSupabaseError(error);
    }
  };

  const updatePrayerStatus = async (id: string, status: PrayerStatus) => {
    try {
      const updateData: any = { status };
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
        // Revert optimistic update on error
        loadPrayers();
        throw error;
      }
    } catch (error: any) {
      handleSupabaseError(error);
    }
  };

  const addPrayerUpdate = async (prayerId: string, content: string, author: string) => {
    try {
      // Don't optimistically update since updates need approval
      const { error } = await supabase
        .from('prayer_updates')
        .insert({
          prayer_id: prayerId,
          content,
          author,
          approval_status: 'pending' // New updates need approval
        });

      if (error) {
        throw error;
      }

      // Return success but don't update local state
      // Update will appear after admin approval
      return null;
    } catch (error: any) {
      handleSupabaseError(error);
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
        throw error;
      }
    } catch (error: any) {
      handleSupabaseError(error);
    }
  };

  const getFilteredPrayers = (status?: PrayerStatus, searchTerm?: string) => {
    return prayers.filter(prayer => {
      if (status && prayer.status !== status) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          prayer.title.toLowerCase().includes(term) ||
          (prayer.description && prayer.description.toLowerCase().includes(term)) ||
          prayer.requester.toLowerCase().includes(term)
        );
      }
      return true;
    });
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
    refresh: loadPrayers
  };
};