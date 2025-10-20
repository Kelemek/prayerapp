import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

const VERIFIED_SESSIONS_KEY = 'prayer_app_verified_sessions';

// Helper functions from useVerification.ts
interface VerifiedSession {
  email: string;
  verifiedAt: number;
  expiresAt: number;
}

const isRecentlyVerified = (email: string, expiryMinutes: number): boolean => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const sessionsData = localStorage.getItem(VERIFIED_SESSIONS_KEY);
    if (!sessionsData) return false;

    const sessions: VerifiedSession[] = JSON.parse(sessionsData);
    const session = sessions.find(s => s.email === normalizedEmail);
    
    if (!session) return false;
    
    // Validate session has required fields
    if (!session.expiresAt || typeof session.expiresAt !== 'number') {
      return false;
    }

    const now = Date.now();
    if (now > session.expiresAt) {
      return false;
    }

    return true;
  } catch (err) {
    return false;
  }
};

const saveVerifiedSession = (email: string, expiryMinutes: number): void => {
  try {
    const normalizedEmail = email.toLowerCase().trim();
    const sessionsData = localStorage.getItem(VERIFIED_SESSIONS_KEY);
    let sessions: VerifiedSession[] = sessionsData ? JSON.parse(sessionsData) : [];
    
    // Remove any existing session for this email
    sessions = sessions.filter(s => s.email !== normalizedEmail);
    
    // Add new session
    const now = Date.now();
    sessions.push({
      email: normalizedEmail,
      verifiedAt: now,
      expiresAt: now + (expiryMinutes * 60 * 1000)
    });
    
    localStorage.setItem(VERIFIED_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (err) {
    console.error('Error saving verification session:', err);
  }
};

const cleanupExpiredSessions = (): void => {
  try {
    const sessionsData = localStorage.getItem(VERIFIED_SESSIONS_KEY);
    if (!sessionsData) return;

    const sessions: VerifiedSession[] = JSON.parse(sessionsData);
    const now = Date.now();
    const activeSessions = sessions.filter(s => s.expiresAt > now);
    
    if (activeSessions.length !== sessions.length) {
      localStorage.setItem(VERIFIED_SESSIONS_KEY, JSON.stringify(activeSessions));
    }
  } catch (err) {
    console.error('Error cleaning up sessions:', err);
  }
};

describe('Email Verification Session Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('saveVerifiedSession', () => {
    it('should save a verification session to localStorage', () => {
      saveVerifiedSession('test@example.com', 15);
      
      const sessions = JSON.parse(localStorage.getItem(VERIFIED_SESSIONS_KEY) || '[]');
      expect(sessions).toHaveLength(1);
      expect(sessions[0].email).toBe('test@example.com');
    });

    it('should normalize email addresses (lowercase)', () => {
      saveVerifiedSession('TEST@EXAMPLE.COM', 15);
      
      const sessions = JSON.parse(localStorage.getItem(VERIFIED_SESSIONS_KEY) || '[]');
      expect(sessions[0].email).toBe('test@example.com');
    });

    it('should normalize email addresses (trim whitespace)', () => {
      saveVerifiedSession('  test@example.com  ', 15);
      
      const sessions = JSON.parse(localStorage.getItem(VERIFIED_SESSIONS_KEY) || '[]');
      expect(sessions[0].email).toBe('test@example.com');
    });

    it('should set correct expiration time', () => {
      const beforeSave = Date.now();
      saveVerifiedSession('test@example.com', 15);
      const afterSave = Date.now();
      
      const sessions = JSON.parse(localStorage.getItem(VERIFIED_SESSIONS_KEY) || '[]');
      const expectedExpiry = 15 * 60 * 1000; // 15 minutes in ms
      
      expect(sessions[0].expiresAt).toBeGreaterThanOrEqual(beforeSave + expectedExpiry);
      expect(sessions[0].expiresAt).toBeLessThanOrEqual(afterSave + expectedExpiry);
    });

    it('should replace existing session for same email', () => {
      saveVerifiedSession('test@example.com', 15);
      saveVerifiedSession('test@example.com', 30);
      
      const sessions = JSON.parse(localStorage.getItem(VERIFIED_SESSIONS_KEY) || '[]');
      expect(sessions).toHaveLength(1);
      
      // Check that expiry was updated (should be ~30 min from now, not 15)
      const expectedExpiry = 30 * 60 * 1000;
      expect(sessions[0].expiresAt).toBeGreaterThan(Date.now() + (25 * 60 * 1000));
    });

    it('should store multiple sessions for different emails', () => {
      saveVerifiedSession('user1@example.com', 15);
      saveVerifiedSession('user2@example.com', 15);
      saveVerifiedSession('user3@example.com', 15);
      
      const sessions = JSON.parse(localStorage.getItem(VERIFIED_SESSIONS_KEY) || '[]');
      expect(sessions).toHaveLength(3);
      expect(sessions.map((s: VerifiedSession) => s.email)).toContain('user1@example.com');
      expect(sessions.map((s: VerifiedSession) => s.email)).toContain('user2@example.com');
      expect(sessions.map((s: VerifiedSession) => s.email)).toContain('user3@example.com');
    });
  });

  describe('isRecentlyVerified', () => {
    it('should return false when no sessions exist', () => {
      expect(isRecentlyVerified('test@example.com', 15)).toBe(false);
    });

    it('should return true for recently verified email', () => {
      saveVerifiedSession('test@example.com', 15);
      expect(isRecentlyVerified('test@example.com', 15)).toBe(true);
    });

    it('should return false for unverified email', () => {
      saveVerifiedSession('verified@example.com', 15);
      expect(isRecentlyVerified('unverified@example.com', 15)).toBe(false);
    });

    it('should be case-insensitive', () => {
      saveVerifiedSession('test@example.com', 15);
      expect(isRecentlyVerified('TEST@EXAMPLE.COM', 15)).toBe(true);
      expect(isRecentlyVerified('Test@Example.Com', 15)).toBe(true);
    });

    it('should handle whitespace in email', () => {
      saveVerifiedSession('test@example.com', 15);
      expect(isRecentlyVerified('  test@example.com  ', 15)).toBe(true);
    });

    it('should return false for expired session', () => {
      // Save with very short expiry
      const sessions = [{
        email: 'test@example.com',
        verifiedAt: Date.now() - (20 * 60 * 1000), // 20 minutes ago
        expiresAt: Date.now() - (5 * 60 * 1000)   // Expired 5 minutes ago
      }];
      localStorage.setItem(VERIFIED_SESSIONS_KEY, JSON.stringify(sessions));
      
      expect(isRecentlyVerified('test@example.com', 15)).toBe(false);
    });

    it('should return true when session is about to expire but still valid', () => {
      const sessions = [{
        email: 'test@example.com',
        verifiedAt: Date.now() - (14 * 60 * 1000), // 14 minutes ago
        expiresAt: Date.now() + (1 * 60 * 1000)    // Expires in 1 minute
      }];
      localStorage.setItem(VERIFIED_SESSIONS_KEY, JSON.stringify(sessions));
      
      expect(isRecentlyVerified('test@example.com', 15)).toBe(true);
    });
  });

  describe('cleanupExpiredSessions', () => {
    it('should remove expired sessions', () => {
      const now = Date.now();
      const sessions = [
        {
          email: 'expired1@example.com',
          verifiedAt: now - (30 * 60 * 1000),
          expiresAt: now - (15 * 60 * 1000) // Expired
        },
        {
          email: 'valid@example.com',
          verifiedAt: now - (5 * 60 * 1000),
          expiresAt: now + (10 * 60 * 1000) // Still valid
        },
        {
          email: 'expired2@example.com',
          verifiedAt: now - (60 * 60 * 1000),
          expiresAt: now - (45 * 60 * 1000) // Expired
        }
      ];
      localStorage.setItem(VERIFIED_SESSIONS_KEY, JSON.stringify(sessions));
      
      cleanupExpiredSessions();
      
      const remaining = JSON.parse(localStorage.getItem(VERIFIED_SESSIONS_KEY) || '[]');
      expect(remaining).toHaveLength(1);
      expect(remaining[0].email).toBe('valid@example.com');
    });

    it('should do nothing when no sessions exist', () => {
      cleanupExpiredSessions();
      expect(localStorage.getItem(VERIFIED_SESSIONS_KEY)).toBeNull();
    });

    it('should keep all sessions when none are expired', () => {
      const now = Date.now();
      const sessions = [
        {
          email: 'valid1@example.com',
          verifiedAt: now - (5 * 60 * 1000),
          expiresAt: now + (10 * 60 * 1000)
        },
        {
          email: 'valid2@example.com',
          verifiedAt: now - (3 * 60 * 1000),
          expiresAt: now + (12 * 60 * 1000)
        }
      ];
      localStorage.setItem(VERIFIED_SESSIONS_KEY, JSON.stringify(sessions));
      
      cleanupExpiredSessions();
      
      const remaining = JSON.parse(localStorage.getItem(VERIFIED_SESSIONS_KEY) || '[]');
      expect(remaining).toHaveLength(2);
    });
  });

  describe('Integration scenarios', () => {
    it('should handle complete verification flow', () => {
      // 1. No verification yet
      expect(isRecentlyVerified('user@example.com', 15)).toBe(false);
      
      // 2. User verifies
      saveVerifiedSession('user@example.com', 15);
      
      // 3. Should skip verification now
      expect(isRecentlyVerified('user@example.com', 15)).toBe(true);
      
      // 4. Different email should still need verification
      expect(isRecentlyVerified('other@example.com', 15)).toBe(false);
    });

    it('should handle multiple users across different sessions', () => {
      saveVerifiedSession('user1@example.com', 15);
      saveVerifiedSession('user2@example.com', 30);
      saveVerifiedSession('user3@example.com', 5);
      
      expect(isRecentlyVerified('user1@example.com', 15)).toBe(true);
      expect(isRecentlyVerified('user2@example.com', 30)).toBe(true);
      expect(isRecentlyVerified('user3@example.com', 5)).toBe(true);
      expect(isRecentlyVerified('user4@example.com', 15)).toBe(false);
    });

    it('should handle session refresh (re-verification)', () => {
      const now = Date.now();
      
      // Initial verification - expires in 5 minutes
      const initialSessions = [{
        email: 'user@example.com',
        verifiedAt: now - (14 * 60 * 1000),
        expiresAt: now + (1 * 60 * 1000) // About to expire
      }];
      localStorage.setItem(VERIFIED_SESSIONS_KEY, JSON.stringify(initialSessions));
      
      // User re-verifies before expiry
      saveVerifiedSession('user@example.com', 15);
      
      // Should have new expiry time
      const sessions = JSON.parse(localStorage.getItem(VERIFIED_SESSIONS_KEY) || '[]');
      expect(sessions[0].expiresAt).toBeGreaterThan(now + (10 * 60 * 1000));
    });
  });

  describe('Error handling', () => {
    it('should handle corrupted localStorage data gracefully', () => {
      localStorage.setItem(VERIFIED_SESSIONS_KEY, 'invalid json{{{');
      
      expect(isRecentlyVerified('test@example.com', 15)).toBe(false);
    });

    it('should handle missing fields in session data', () => {
      // Session with email but expiresAt is null/undefined
      const invalidSessions: any[] = [
        { 
          email: 'test@example.com',
          verifiedAt: Date.now(),
          expiresAt: null // Invalid field
        }
      ];
      localStorage.setItem(VERIFIED_SESSIONS_KEY, JSON.stringify(invalidSessions));
      
      // Should return false because expiresAt validation fails
      expect(isRecentlyVerified('test@example.com', 15)).toBe(false);
    });
  });
});
