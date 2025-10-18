import { createContext } from 'react';
import type { User } from '@supabase/supabase-js';

export interface AdminAuthContextType {
  isAdmin: boolean;
  user: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  changePassword: (newPassword: string) => Promise<boolean>;
  loading: boolean;
}

export const AdminAuthContext = createContext<AdminAuthContextType | null>(null);
