# Admin Session Security Guide

## Current Security Features ✅

Your app uses Supabase Auth which provides:
- Automatic token refresh
- Secure token storage
- Session validation
- Built-in XSS protection

## Recommended Security Enhancements

### 1. Configure Session Duration

In your Supabase Dashboard → Authentication → Settings:

- **JWT Expiry Time**: Default is 3600 seconds (1 hour)
- **Refresh Token Expiry**: Default is 2,592,000 seconds (30 days)

**Recommended for Admin Portal:**
- JWT Expiry: 3600 seconds (1 hour) - Tokens expire after 1 hour of inactivity
- Refresh Token Expiry: 604,800 seconds (7 days) - Must re-login after 7 days

### 2. Add "Remember Me" Option (Optional)

Allow admins to choose session length:

```typescript
// Short session (1 hour)
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
  options: {
    // Session expires after browser closes
    persistSession: false
  }
});

// Long session (30 days)
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
  options: {
    // Session persists across browser sessions
    persistSession: true
  }
});
```

### 3. Add Auto-Logout on Inactivity

Automatically log out admins after a period of inactivity:

```typescript
// In AdminAuthProvider
const [lastActivity, setLastActivity] = useState(Date.now());
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

useEffect(() => {
  if (!isAdmin) return;

  // Track user activity
  const updateActivity = () => setLastActivity(Date.now());
  
  window.addEventListener('mousemove', updateActivity);
  window.addEventListener('keypress', updateActivity);
  window.addEventListener('click', updateActivity);
  window.addEventListener('scroll', updateActivity);

  // Check for inactivity
  const interval = setInterval(() => {
    if (Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
      logout();
    }
  }, 60000); // Check every minute

  return () => {
    window.removeEventListener('mousemove', updateActivity);
    window.removeEventListener('keypress', updateActivity);
    window.removeEventListener('click', updateActivity);
    window.removeEventListener('scroll', updateActivity);
    clearInterval(interval);
  };
}, [isAdmin, lastActivity]);
```

### 4. Add Multi-Factor Authentication (MFA)

Enable MFA in Supabase Dashboard → Authentication → Settings → MFA

```typescript
// After successful password login, prompt for MFA
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});

if (data.user && !error) {
  // Check if MFA is required
  const { data: factors } = await supabase.auth.mfa.listFactors();
  
  if (factors && factors.length > 0) {
    // Prompt for MFA code
    const code = prompt('Enter your 6-digit code');
    
    const { data: verified } = await supabase.auth.mfa.verify({
      factorId: factors[0].id,
      code: code,
    });
  }
}
```

### 5. Use Server-Side Sessions (Most Secure)

For maximum security, use Supabase's server-side auth with httpOnly cookies:

```typescript
// In supabase client initialization
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      storage: {
        // Use secure cookie storage instead of localStorage
        getItem: (key) => {
          // Implement server-side cookie retrieval
        },
        setItem: (key, value) => {
          // Implement server-side cookie setting
        },
        removeItem: (key) => {
          // Implement server-side cookie removal
        },
      },
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
);
```

### 6. Add IP Address Tracking

Log admin sessions with IP addresses for audit trail:

```typescript
const login = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (data.user) {
    // Log the login event
    await supabase.from('admin_login_logs').insert({
      user_id: data.user.id,
      email: data.user.email,
      login_time: new Date().toISOString(),
      // You'd need a backend service to get the real IP
      ip_address: 'tracked_via_backend',
    });
  }

  return !!data.user;
};
```

### 7. Add Session Expiry Warning

Warn admins before their session expires:

```typescript
useEffect(() => {
  if (!isAdmin || !user) return;

  // Get the current session
  const checkSessionExpiry = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      const expiresAt = new Date(session.expires_at! * 1000);
      const now = new Date();
      const minutesUntilExpiry = (expiresAt.getTime() - now.getTime()) / 60000;
      
      // Warn if session expires in less than 5 minutes
      if (minutesUntilExpiry < 5 && minutesUntilExpiry > 0) {
        alert('Your session will expire soon. Please save your work.');
      }
    }
  };

  const interval = setInterval(checkSessionExpiry, 60000); // Check every minute
  return () => clearInterval(interval);
}, [isAdmin, user]);
```

## Current Best Practice Setup

Your current setup is already secure for most use cases. The session:
- ✅ Auto-refreshes tokens (admin stays logged in)
- ✅ Expires after 1 hour of token inactivity (JWT expiry)
- ✅ Requires re-authentication after 30 days (refresh token expiry)
- ✅ Stores tokens securely in browser storage
- ✅ Validates admin status on each session change

## Quick Wins

1. **No changes needed** - Your current setup is secure
2. **Optional**: Add inactivity timeout (30 minutes recommended for admin portals)
3. **Optional**: Enable MFA in Supabase Dashboard for added security
4. **Optional**: Add session expiry warnings for better UX

## Security Checklist

- [x] Using Supabase Auth (secure by default)
- [x] Auto token refresh enabled
- [x] Session validation on auth state changes
- [ ] Optional: Inactivity timeout
- [ ] Optional: MFA enabled
- [ ] Optional: Session expiry warnings
- [ ] Optional: Admin login audit logs
