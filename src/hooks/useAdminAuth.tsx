import { useState, createContext, useContext, useEffect } from 'react';

interface AdminAuthContextType {
  isAdmin: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  loading: boolean;
}

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within AdminAuthProvider');
  }
  return context;
};

interface AdminAuthProviderProps {
  children: React.ReactNode;
}

export const AdminAuthProvider: React.FC<AdminAuthProviderProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in on mount
  useEffect(() => {
    const adminToken = localStorage.getItem('admin_session');
    if (adminToken) {
      // In a real app, verify the token with the server
      setIsAdmin(true);
    }
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    setLoading(true);
    try {
      // Simple authentication - in a real app, this would call your backend
      // For demo purposes, using hardcoded credentials
      if (username === 'admin' && password === 'admin123') {
        const adminToken = 'admin_session_' + Date.now();
        localStorage.setItem('admin_session', adminToken);
        setIsAdmin(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Admin login error:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('admin_session');
    setIsAdmin(false);
  };

  return (
    <AdminAuthContext.Provider value={{ isAdmin, login, logout, loading }}>
      {children}
    </AdminAuthContext.Provider>
  );
};