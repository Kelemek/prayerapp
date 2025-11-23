import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';

export interface AdminAuthContextType {
  isAdmin: boolean;
  user: User | null;
  sendMagicLink: (email: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  loading: boolean;
}

export const AdminAuthContext = createContext<AdminAuthContextType | null>(null);
