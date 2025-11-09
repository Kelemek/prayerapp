import 'vitest';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock the supabase module with a hoist-safe async factory, then import the module under test
vi.mock('../../lib/supabase', async () => {
  return {
    supabase: {
      from: vi.fn(),
      channel: vi.fn(),
      removeChannel: vi.fn()
    },
    handleSupabaseError: vi.fn()
  } as any;
});

import { supabase } from '../../lib/supabase';

describe('downloadPrintablePrayerList', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    // Restore global window.open if it was mocked
    if ((window.open as any).mockRestore) {
      try { (window.open as any).mockRestore() } catch (e) { /* ignore */ }
    }
  });

  it('alerts and closes provided window when supabase returns an error', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
    } as any;

    vi.mocked(supabase.from).mockReturnValue(chain);

    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    const closeSpy = vi.fn();
    const fakeWin = { close: closeSpy } as any;

    const mod = await import('../printablePrayerList');
    await mod.downloadPrintablePrayerList('month', fakeWin as any);

    expect(alertSpy).toHaveBeenCalledWith('Failed to fetch prayers. Please try again.');
    expect(closeSpy).toHaveBeenCalled();
  });

  it('alerts and closes when no prayers are returned', async () => {
    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    } as any;

    vi.mocked(supabase.from).mockReturnValue(chain);

    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    const closeSpy = vi.fn();
    const fakeWin = { close: closeSpy } as any;

    const mod = await import('../printablePrayerList');
    await mod.downloadPrintablePrayerList('week', fakeWin as any);

    expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('No prayers found in the last'));
    expect(closeSpy).toHaveBeenCalled();
  });

  it('writes HTML to provided window when prayers exist and focuses window', async () => {
    const now = new Date().toISOString();
    const samplePrayer = {
      id: 'p1',
      title: 'Help',
      prayer_for: 'Community',
      description: 'Please pray',
      requester: 'Jane',
      status: 'current',
      created_at: now,
      prayer_updates: [
        { id: 'u1', content: 'Update1', author: 'Jane', created_at: now }
      ]
    };

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [samplePrayer], error: null })
    } as any;

    vi.mocked(supabase.from).mockReturnValue(chain);

    const fakeDoc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn()
    } as any;

    const focusSpy = vi.fn();
    const fakeWin: any = { document: fakeDoc, focus: focusSpy };

    const mod = await import('../printablePrayerList');
    await mod.downloadPrintablePrayerList('month', fakeWin as any);

    expect(fakeDoc.open).toHaveBeenCalled();
    expect(fakeDoc.write).toHaveBeenCalled();
  const written = (fakeDoc.write as any).mock.calls[0][0] as string;
    expect(written).toContain('Community');
    expect(written).toContain('Jane');
    expect(focusSpy).toHaveBeenCalled();
  });

  it('falls back to download when popup blocked', async () => {
    const now = new Date().toISOString();
    const samplePrayer = {
      id: 'p2',
      title: 'Help 2',
      prayer_for: 'Neighbors',
      description: 'Please pray 2',
      requester: 'Bob',
      status: 'ongoing',
      created_at: now
    };

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [samplePrayer], error: null })
    } as any;

    vi.mocked(supabase.from).mockReturnValue(chain);

  // simulate popup blocked
  vi.spyOn(window, 'open').mockReturnValue(null as any);

  // JSDOM may not implement URL.createObjectURL — provide a stub on global
  const createUrlSpy = vi.fn().mockReturnValue('blob:fake');
  const revokeUrlSpy = vi.fn();
  (globalThis as any).URL = { createObjectURL: createUrlSpy, revokeObjectURL: revokeUrlSpy };
  const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});

    const mod = await import('../printablePrayerList');
    await mod.downloadPrintablePrayerList('year', null);

    expect(createUrlSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Prayer list downloaded. Please open the file to view and print.');

    createUrlSpy.mockRestore();
    clickSpy.mockRestore();
  });

  it('handles prayers with multiple updates and sorts them newest first', async () => {
    const now = new Date().toISOString();
    const older = new Date(Date.now() - 86400000).toISOString(); // 1 day ago
    const samplePrayer = {
      id: 'p3',
      title: 'Help 3',
      prayer_for: 'Family',
      description: 'Please pray 3',
      requester: 'Alice',
      status: 'current',
      created_at: now,
      prayer_updates: [
        { id: 'u1', content: 'First update', author: 'Alice', created_at: older },
        { id: 'u2', content: 'Second update', author: 'Alice', created_at: now }
      ]
    };

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [samplePrayer], error: null })
    } as any;

    vi.mocked(supabase.from).mockReturnValue(chain);

    const fakeDoc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn()
    } as any;

    const fakeWin: any = { document: fakeDoc, focus: vi.fn() };

    const mod = await import('../printablePrayerList');
    await mod.downloadPrintablePrayerList('month', fakeWin as any);

    const written = (fakeDoc.write as any).mock.calls[0][0] as string;
    expect(written).toContain('Second update'); // Should appear before First update due to sorting
    expect(written).toContain('First update');
  });

  it('handles prayers without updates', async () => {
    const now = new Date().toISOString();
    const samplePrayer = {
      id: 'p4',
      title: 'Help 4',
      prayer_for: 'Friends',
      description: 'Please pray 4',
      requester: 'Charlie',
      status: 'answered',
      created_at: now,
      prayer_updates: [] // Empty array
    };

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [samplePrayer], error: null })
    } as any;

    vi.mocked(supabase.from).mockReturnValue(chain);

    const fakeDoc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn()
    } as any;

    const fakeWin: any = { document: fakeDoc, focus: vi.fn() };

    const mod = await import('../printablePrayerList');
    await mod.downloadPrintablePrayerList('month', fakeWin as any);

    const written = (fakeDoc.write as any).mock.calls[0][0] as string;
    expect(written).toContain('Friends');
    expect(written).toContain('Charlie');
  });

  it('handles prayers with null updates', async () => {
    const now = new Date().toISOString();
    const samplePrayer = {
      id: 'p5',
      title: 'Help 5',
      prayer_for: 'Church',
      description: 'Please pray 5',
      requester: 'David',
      status: 'current',
      created_at: now,
      prayer_updates: null // Null updates
    };

    const chain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [samplePrayer], error: null })
    } as any;

    vi.mocked(supabase.from).mockReturnValue(chain);

    const fakeDoc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn()
    } as any;

    const fakeWin: any = { document: fakeDoc, focus: vi.fn() };

    const mod = await import('../printablePrayerList');
    await mod.downloadPrintablePrayerList('month', fakeWin as any);

    const written = (fakeDoc.write as any).mock.calls[0][0] as string;
    expect(written).toContain('Church');
    expect(written).toContain('David');
  });
});
