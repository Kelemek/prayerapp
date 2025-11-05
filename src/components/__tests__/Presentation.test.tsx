import { describe, it, expect } from 'vitest';

describe('PrayerPresentation Component', () => {
  describe('Component Integration', () => {
    it('exports PrayerPresentation component', async () => {
      const module = await import('../PrayerPresentation');
      expect(module.PrayerPresentation).toBeDefined();
      expect(typeof module.PrayerPresentation).toBe('function');
    });

    it('uses shared presentation utility functions', async () => {
      const utils = await import('../../utils/presentationUtils');
      expect(utils.calculateSmartDurationPrayer).toBeDefined();
      expect(utils.calculateSmartDurationPrompt).toBeDefined();
      expect(utils.formatTime).toBeDefined();
      expect(utils.applyTheme).toBeDefined();
      expect(utils.handleThemeChange).toBeDefined();
    });
  });

  describe('TypeScript Type Safety', () => {
    it('component is a valid React FC', async () => {
      const { PrayerPresentation } = await import('../PrayerPresentation');
      
      // TypeScript compilation ensures this is a valid React component
      expect(PrayerPresentation).toBeTruthy();
    });
  });
});

describe('MobilePresentation Component', () => {
  describe('Component Integration', () => {
    it('exports MobilePresentation component', async () => {
      const module = await import('../MobilePresentation');
      expect(module.MobilePresentation).toBeDefined();
      expect(typeof module.MobilePresentation).toBe('function');
    });

    it('uses shared presentation utility functions', async () => {
      const utils = await import('../../utils/presentationUtils');
      expect(utils.calculateSmartDurationPrayer).toBeDefined();
      expect(utils.calculateSmartDurationPrompt).toBeDefined();
      expect(utils.formatTime).toBeDefined();
      expect(utils.applyTheme).toBeDefined();
      expect(utils.handleThemeChange).toBeDefined();
    });
  });

  describe('TypeScript Type Safety', () => {
    it('component is a valid React FC', async () => {
      const { MobilePresentation } = await import('../MobilePresentation');
      
      // TypeScript compilation ensures this is a valid React component
      expect(MobilePresentation).toBeTruthy();
    });
  });
});

describe('Presentation Components Shared Behavior', () => {
  it('both components use same utility functions from presentationUtils', async () => {
    const utils = await import('../../utils/presentationUtils');
    
    // Verify all 5 utility functions are exported
    expect(Object.keys(utils)).toContain('calculateSmartDurationPrayer');
    expect(Object.keys(utils)).toContain('calculateSmartDurationPrompt');
    expect(Object.keys(utils)).toContain('formatTime');
    expect(Object.keys(utils)).toContain('applyTheme');
    expect(Object.keys(utils)).toContain('handleThemeChange');
  });

  it('utility functions have correct signatures', async () => {
    const { calculateSmartDurationPrayer, calculateSmartDurationPrompt, formatTime } = await import('../../utils/presentationUtils');
    
    // Test calculateSmartDurationPrayer
    const mockPrayer = {
      id: '1',
      title: 'Test',
      prayer_for: 'John',
      description: 'a'.repeat(120),
      requester: 'Jane',
      status: 'current',
      created_at: '2025-01-01'
    };
    
    const duration = calculateSmartDurationPrayer(mockPrayer, true, 30);
    expect(typeof duration).toBe('number');
    expect(duration).toBeGreaterThanOrEqual(10);
    expect(duration).toBeLessThanOrEqual(120);
    
    // Test calculateSmartDurationPrompt
    const mockPrompt = {
      id: 'p1',
      title: 'Test Prompt',
      type: 'thanksgiving',
      description: 'a'.repeat(120),
      created_at: '2025-01-01'
    };
    
    const promptDuration = calculateSmartDurationPrompt(mockPrompt, true, 25);
    expect(typeof promptDuration).toBe('number');
    expect(promptDuration).toBeGreaterThanOrEqual(10);
    expect(promptDuration).toBeLessThanOrEqual(120);
    
    // Test formatTime
    const formattedTime = formatTime(125);
    expect(formattedTime).toBe('2:05');
  });
});
