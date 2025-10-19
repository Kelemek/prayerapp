import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateSmartDurationPrayer,
  calculateSmartDurationPrompt,
  formatTime,
  applyTheme,
  handleThemeChange
} from './presentationUtils';

describe('presentationUtils', () => {
  describe('calculateSmartDurationPrayer', () => {
    it('should return displayDuration when smartMode is false', () => {
      const prayer = {
        id: '1',
        title: 'Test Prayer',
        prayer_for: 'John Doe',
        description: 'Short prayer',
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrayer(prayer, false, 30);
      expect(result).toBe(30);
    });

    it('should return minimum 10 seconds for very short prayers', () => {
      const prayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: 'Hi',
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrayer(prayer, true, 30);
      expect(result).toBe(10);
    });

    it('should calculate 10 seconds for ~120 characters (1 second per 12 chars)', () => {
      const prayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: 'a'.repeat(120), // Exactly 120 chars
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrayer(prayer, true, 30);
      expect(result).toBe(10);
    });

    it('should calculate 30 seconds for ~360 characters', () => {
      const prayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: 'a'.repeat(360), // 360 chars = 30 seconds
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrayer(prayer, true, 30);
      expect(result).toBe(30);
    });

    it('should calculate 60 seconds for ~720 characters', () => {
      const prayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: 'a'.repeat(720), // 720 chars = 60 seconds
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrayer(prayer, true, 30);
      expect(result).toBe(60);
    });

    it('should cap at maximum 120 seconds for very long prayers', () => {
      const prayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: 'a'.repeat(5000), // Very long prayer
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrayer(prayer, true, 30);
      expect(result).toBe(120);
    });

    it('should include prayer updates in character count', () => {
      const prayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: 'a'.repeat(120), // 120 chars base
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z',
        prayer_updates: [
          {
            id: 'u1',
            content: 'b'.repeat(120), // +120 chars
            author: 'Jane',
            created_at: '2025-01-02T00:00:00Z'
          }
        ]
      };

      // Total: 240 chars = 20 seconds
      const result = calculateSmartDurationPrayer(prayer, true, 30);
      expect(result).toBe(20);
    });

    it('should only count up to 3 most recent updates', () => {
      const prayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: 'a'.repeat(120), // 120 chars
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z',
        prayer_updates: [
          {
            id: 'u1',
            content: 'b'.repeat(120),
            author: 'Jane',
            created_at: '2025-01-02T00:00:00Z'
          },
          {
            id: 'u2',
            content: 'c'.repeat(120),
            author: 'Jane',
            created_at: '2025-01-03T00:00:00Z'
          },
          {
            id: 'u3',
            content: 'd'.repeat(120),
            author: 'Jane',
            created_at: '2025-01-04T00:00:00Z'
          },
          {
            id: 'u4',
            content: 'e'.repeat(120), // This should be ignored (4th update)
            author: 'Jane',
            created_at: '2025-01-05T00:00:00Z'
          }
        ]
      };

      // Total: 120 + (3 * 120) = 480 chars = 40 seconds
      const result = calculateSmartDurationPrayer(prayer, true, 30);
      expect(result).toBe(40);
    });

    it('should use most recent updates when more than 3 exist', () => {
      const prayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: '',
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z',
        prayer_updates: [
          {
            id: 'u1',
            content: 'old update',
            author: 'Jane',
            created_at: '2025-01-02T00:00:00Z'
          },
          {
            id: 'u2',
            content: 'a'.repeat(120),
            author: 'Jane',
            created_at: '2025-01-05T00:00:00Z'
          },
          {
            id: 'u3',
            content: 'b'.repeat(120),
            author: 'Jane',
            created_at: '2025-01-06T00:00:00Z'
          },
          {
            id: 'u4',
            content: 'c'.repeat(120),
            author: 'Jane',
            created_at: '2025-01-07T00:00:00Z' // Most recent
          }
        ]
      };

      // Should use the 3 most recent (u2, u3, u4) = 360 chars = 30 seconds
      const result = calculateSmartDurationPrayer(prayer, true, 30);
      expect(result).toBe(30);
    });

    it('should handle empty description', () => {
      const prayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: '',
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrayer(prayer, true, 30);
      expect(result).toBe(10); // Minimum
    });

    it('should handle missing description', () => {
      const prayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: undefined as any,
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrayer(prayer, true, 30);
      expect(result).toBe(10); // Minimum
    });

    it('should not count prayer_for field (only description and updates)', () => {
      const prayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'a'.repeat(1000), // This should be ignored
        description: 'b'.repeat(120), // Only this counts
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrayer(prayer, true, 30);
      expect(result).toBe(10); // 120 chars = 10 seconds
    });

    it('should handle real-world prayer example', () => {
      const prayer = {
        id: '1',
        title: 'Prayer for Healing',
        prayer_for: 'Sarah Johnson',
        description: 'Please pray for Sarah who is recovering from surgery. She has been in the hospital for two weeks and is facing a long recovery period. The doctors say she is making good progress but still needs our prayers.',
        requester: 'Mark',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z',
        prayer_updates: [
          {
            id: 'u1',
            content: 'Sarah is now out of ICU and moved to a regular room. Thank you for your prayers!',
            author: 'Mark',
            created_at: '2025-01-05T00:00:00Z'
          }
        ]
      };

      // Description: ~240 chars, Update: ~80 chars = 320 total = ~27 seconds
      const result = calculateSmartDurationPrayer(prayer, true, 30);
      expect(result).toBeGreaterThanOrEqual(24);
      expect(result).toBeLessThanOrEqual(30);
    });
  });

  describe('calculateSmartDurationPrompt', () => {
    it('should return displayDuration when smartMode is false', () => {
      const prompt = {
        id: '1',
        title: 'Test Prompt',
        type: 'thanksgiving',
        description: 'Short prompt',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrompt(prompt, false, 25);
      expect(result).toBe(25);
    });

    it('should return minimum 10 seconds for very short prompts', () => {
      const prompt = {
        id: '1',
        title: 'Test',
        type: 'praise',
        description: 'Hi',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrompt(prompt, true, 25);
      expect(result).toBe(10);
    });

    it('should calculate 20 seconds for ~240 characters', () => {
      const prompt = {
        id: '1',
        title: 'Test',
        type: 'confession',
        description: 'a'.repeat(240), // 240 chars = 20 seconds
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrompt(prompt, true, 25);
      expect(result).toBe(20);
    });

    it('should cap at maximum 120 seconds for very long prompts', () => {
      const prompt = {
        id: '1',
        title: 'Test',
        type: 'intercession',
        description: 'a'.repeat(5000), // Very long prompt
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrompt(prompt, true, 25);
      expect(result).toBe(120);
    });

    it('should handle empty description', () => {
      const prompt = {
        id: '1',
        title: 'Test',
        type: 'petition',
        description: '',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrompt(prompt, true, 25);
      expect(result).toBe(10); // Minimum
    });

    it('should handle real-world prompt example', () => {
      const prompt = {
        id: '1',
        title: 'Thanksgiving',
        type: 'thanksgiving',
        description: 'Take a moment to thank God for the blessings in your life. Consider the big and small ways He has shown His love and provision.',
        created_at: '2025-01-01T00:00:00Z'
      };

      // ~150 chars = ~13 seconds
      const result = calculateSmartDurationPrompt(prompt, true, 25);
      expect(result).toBeGreaterThanOrEqual(11);
      expect(result).toBeLessThanOrEqual(15);
    });
  });

  describe('formatTime', () => {
    it('should format 0 seconds correctly', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    it('should format seconds only', () => {
      expect(formatTime(5)).toBe('0:05');
      expect(formatTime(30)).toBe('0:30');
      expect(formatTime(59)).toBe('0:59');
    });

    it('should format minutes and seconds', () => {
      expect(formatTime(60)).toBe('1:00');
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(90)).toBe('1:30');
      expect(formatTime(125)).toBe('2:05');
    });

    it('should pad seconds with leading zero', () => {
      expect(formatTime(61)).toBe('1:01');
      expect(formatTime(305)).toBe('5:05');
    });

    it('should handle large values', () => {
      expect(formatTime(600)).toBe('10:00');
      expect(formatTime(3599)).toBe('59:59');
      expect(formatTime(3661)).toBe('61:01');
    });
  });

  describe('applyTheme', () => {
    let localStorageMock: { [key: string]: string };
    let mockMatchMedia: {
      matches: boolean;
      addEventListener: ReturnType<typeof vi.fn>;
      removeEventListener: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
      localStorageMock = {};

      global.localStorage = {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key];
        }),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0
      };

      mockMatchMedia = {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };

      global.window.matchMedia = vi.fn(() => mockMatchMedia as unknown as MediaQueryList);

      // Mock document.documentElement
      document.documentElement.classList.add = vi.fn();
      document.documentElement.classList.remove = vi.fn();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should apply light theme', () => {
      applyTheme('light');

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    });

    it('should apply dark theme', () => {
      applyTheme('dark');

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'dark');
    });

    it('should apply system theme when system prefers dark', () => {
      mockMatchMedia.matches = true;
      applyTheme('system');

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'system');
    });

    it('should apply system theme when system prefers light', () => {
      mockMatchMedia.matches = false;
      applyTheme('system');

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'system');
    });
  });

  describe('handleThemeChange', () => {
    let localStorageMock: { [key: string]: string };
    let mockMatchMedia: {
      matches: boolean;
      addEventListener: ReturnType<typeof vi.fn>;
      removeEventListener: ReturnType<typeof vi.fn>;
    };
    let setThemeMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      localStorageMock = {};

      global.localStorage = {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key];
        }),
        clear: vi.fn(),
        key: vi.fn(),
        length: 0
      };

      mockMatchMedia = {
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      };

      global.window.matchMedia = vi.fn(() => mockMatchMedia as unknown as MediaQueryList);

      document.documentElement.classList.add = vi.fn();
      document.documentElement.classList.remove = vi.fn();

      setThemeMock = vi.fn();
    });

    afterEach(() => {
      vi.clearAllMocks();
    });

    it('should call setTheme and save to localStorage', () => {
      handleThemeChange('light', setThemeMock);

      expect(setThemeMock).toHaveBeenCalledWith('light');
      expect(localStorage.setItem).toHaveBeenCalledWith('theme', 'light');
    });

    it('should apply light theme immediately', () => {
      handleThemeChange('light', setThemeMock);

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
    });

    it('should apply dark theme immediately', () => {
      handleThemeChange('dark', setThemeMock);

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should apply system theme based on preference (dark)', () => {
      mockMatchMedia.matches = true;
      handleThemeChange('system', setThemeMock);

      expect(document.documentElement.classList.add).toHaveBeenCalledWith('dark');
    });

    it('should apply system theme based on preference (light)', () => {
      mockMatchMedia.matches = false;
      handleThemeChange('system', setThemeMock);

      expect(document.documentElement.classList.remove).toHaveBeenCalledWith('dark');
    });
  });

  describe('Smart Duration Edge Cases', () => {
    it('should round up partial seconds for prayers', () => {
      const prayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: 'a'.repeat(125), // 125/12 = 10.4166... should round to 11
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrayer(prayer, true, 30);
      expect(result).toBe(11);
    });

    it('should handle exactly at maximum threshold', () => {
      const prayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: 'a'.repeat(1440), // 1440/12 = 120 exactly
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrayer(prayer, true, 30);
      expect(result).toBe(120);
    });

    it('should compare short vs medium vs long prayers', () => {
      const shortPrayer = {
        id: '1',
        title: 'Short',
        prayer_for: 'John',
        description: 'Please pray for me.',
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const mediumPrayer = {
        id: '2',
        title: 'Medium',
        prayer_for: 'John',
        description: 'Please pray for my family as we navigate through difficult times. We are facing financial challenges and health issues that require your prayers and support.',
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const longPrayer = {
        id: '3',
        title: 'Long',
        prayer_for: 'John',
        description: 'a'.repeat(600),
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z',
        prayer_updates: [
          {
            id: 'u1',
            content: 'b'.repeat(300),
            author: 'Jane',
            created_at: '2025-01-02T00:00:00Z'
          }
        ]
      };

      const shortDuration = calculateSmartDurationPrayer(shortPrayer, true, 30);
      const mediumDuration = calculateSmartDurationPrayer(mediumPrayer, true, 30);
      const longDuration = calculateSmartDurationPrayer(longPrayer, true, 30);

      // Short prayer should get minimum duration
      expect(shortDuration).toBe(10);
      
      // Medium prayer should be between short and long
      expect(mediumDuration).toBeGreaterThan(shortDuration);
      expect(mediumDuration).toBeLessThan(longDuration);
      
      // Long prayer should get significantly more time
      expect(longDuration).toBeGreaterThanOrEqual(50);
    });
  });

  describe('Tooltip Documentation Validation', () => {
    // These tests validate that the tooltip text in the UI matches the actual implementation
    // If these tests fail, update the tooltip in PrayerPresentation.tsx and MobilePresentation.tsx
    
    it('tooltip reading pace should match actual calculation (120 chars per 10 seconds)', () => {
      const prayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: 'a'.repeat(120), // Tooltip says "~120 characters per 10 seconds"
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrayer(prayer, true, 30);
      
      // 120 chars should equal 10 seconds (as stated in tooltip)
      expect(result).toBe(10);
      
      // Test double the characters = double the time
      const doublePrayer = { ...prayer, description: 'a'.repeat(240) };
      const doubleResult = calculateSmartDurationPrayer(doublePrayer, true, 30);
      expect(doubleResult).toBe(20);
    });

    it('tooltip minimum time should match actual implementation (10 seconds)', () => {
      const veryShortPrayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: 'Hi', // Very short
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrayer(veryShortPrayer, true, 30);
      
      // Tooltip says "Minimum time: 10 seconds per prayer"
      expect(result).toBe(10);
    });

    it('tooltip maximum time should match actual implementation (120 seconds)', () => {
      const veryLongPrayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: 'a'.repeat(10000), // Very long
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrayer(veryLongPrayer, true, 30);
      
      // Tooltip says "Maximum time: 120 seconds (2 minutes) per prayer"
      expect(result).toBe(120);
    });

    it('tooltip example should be accurate (240 chars = ~20 seconds)', () => {
      const examplePrayer = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: 'a'.repeat(240), // Tooltip example: "240 characters will display for about 20 seconds"
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrayer(examplePrayer, true, 30);
      
      // Should be exactly 20 seconds for 240 chars
      expect(result).toBe(20);
    });

    it('tooltip should mention counting up to 3 recent updates', () => {
      const prayerWith4Updates = {
        id: '1',
        title: 'Test',
        prayer_for: 'John',
        description: 'a'.repeat(120), // 10 seconds
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z',
        prayer_updates: [
          {
            id: 'u1',
            content: 'b'.repeat(120), // +10 seconds
            author: 'Jane',
            created_at: '2025-01-02T00:00:00Z'
          },
          {
            id: 'u2',
            content: 'c'.repeat(120), // +10 seconds
            author: 'Jane',
            created_at: '2025-01-03T00:00:00Z'
          },
          {
            id: 'u3',
            content: 'd'.repeat(120), // +10 seconds
            author: 'Jane',
            created_at: '2025-01-04T00:00:00Z'
          },
          {
            id: 'u4',
            content: 'e'.repeat(120), // This 4th update should be IGNORED
            author: 'Jane',
            created_at: '2025-01-05T00:00:00Z'
          }
        ]
      };

      const result = calculateSmartDurationPrayer(prayerWith4Updates, true, 30);
      
      // Tooltip says "up to 3 recent updates"
      // Total should be 40 seconds (description + 3 updates), NOT 50 (which would include 4th update)
      expect(result).toBe(40);
    });

    it('tooltip should mention NOT counting prayer_for field', () => {
      const prayerWithLongPrayerFor = {
        id: '1',
        title: 'Test',
        prayer_for: 'a'.repeat(1000), // Long prayer_for should be IGNORED
        description: 'b'.repeat(120), // Only this should count
        requester: 'Jane',
        status: 'current',
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrayer(prayerWithLongPrayerFor, true, 30);
      
      // Should only count description (120 chars = 10 seconds), not prayer_for
      expect(result).toBe(10);
    });

    it('prompts should follow same reading pace as prayers', () => {
      const prompt = {
        id: 'p1',
        title: 'Test Prompt',
        type: 'thanksgiving',
        description: 'a'.repeat(240), // Same as prayer example
        created_at: '2025-01-01T00:00:00Z'
      };

      const result = calculateSmartDurationPrompt(prompt, true, 25);
      
      // Should have same reading pace: 240 chars = 20 seconds
      expect(result).toBe(20);
    });
  });
});
