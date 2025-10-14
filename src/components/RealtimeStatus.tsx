import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const RealtimeStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Check initial connection
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('prayers').select('count').single();
        setIsConnected(!error);
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();

    // Listen for real-time events to show activity
    const channel = supabase
      .channel('status-monitor')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'prayers' },
        () => {
          setIsLoading(true);
          setTimeout(() => setIsLoading(false), 1000);
        }
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'prayer_updates' },
        () => {
          setIsLoading(true);
          setTimeout(() => setIsLoading(false), 1000);
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 text-red-600 text-sm">
        <WifiOff size={16} />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-green-600 text-sm">
      {isLoading ? (
        <RefreshCw size={16} className="animate-spin" />
      ) : (
        <Wifi size={16} />
      )}
      <span>Live</span>
    </div>
  );
};