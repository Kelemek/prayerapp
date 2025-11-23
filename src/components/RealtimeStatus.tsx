import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const RealtimeStatus: React.FC = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    // Periodically check connection status
    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('prayers').select('count').limit(1).maybeSingle();
        setIsConnected(!error);
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
    
    // Check every 30 seconds
    const interval = setInterval(checkConnection, 30000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (!isConnected) {
    return (
      <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
        <WifiOff size={16} />
        <span>Offline</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
      <Wifi size={16} />
      <span>Connected</span>
    </div>
  );
};