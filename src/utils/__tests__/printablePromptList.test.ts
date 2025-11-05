/// <reference types="vitest" />
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

describe('downloadPrintablePromptList', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    if ((window.open as any).mockRestore) {
      try { (window.open as any).mockRestore() } catch (e) {}
    }
  });

  it('alerts and closes provided window when supabase returns an error', async () => {
    const chainPrompts = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB error' } })
    } as any;

    const chainTypes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => table === 'prayer_prompts' ? chainPrompts : chainTypes as any);

    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    const closeSpy = vi.fn();
    const fakeWin = { close: closeSpy } as any;

    const mod = await import('../printablePromptList');
    await mod.downloadPrintablePromptList(fakeWin as any);

    expect(alertSpy).toHaveBeenCalledWith('Failed to fetch prayer prompts. Please try again.');
    expect(closeSpy).toHaveBeenCalled();
  });

  it('alerts and closes when no prompts are returned', async () => {
    const chainPrompts = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    } as any;

    const chainTypes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => table === 'prayer_prompts' ? chainPrompts : chainTypes as any);

    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});
    const closeSpy = vi.fn();
    const fakeWin = { close: closeSpy } as any;

    const mod = await import('../printablePromptList');
    await mod.downloadPrintablePromptList(fakeWin as any);

    expect(alertSpy).toHaveBeenCalledWith('No prayer prompts found.');
    expect(closeSpy).toHaveBeenCalled();
  });

  it('writes HTML to provided window when prompts exist and focuses window', async () => {
    const now = new Date().toISOString();
    const samplePrompt = {
      id: 'pp1',
      title: 'Pray for City',
      type: 'Supplication',
      description: 'Pray for safety',
      created_at: now
    } as any;

    const chainPrompts = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [samplePrompt], error: null })
    } as any;

    const chainTypes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [{ name: 'Supplication', display_order: 1 }], error: null })
    } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => table === 'prayer_prompts' ? chainPrompts : chainTypes as any);

    const fakeDoc = {
      open: vi.fn(),
      write: vi.fn(),
      close: vi.fn()
    } as any;

    const focusSpy = vi.fn();
    const fakeWin: any = { document: fakeDoc, focus: focusSpy };

    const mod = await import('../printablePromptList');
    await mod.downloadPrintablePromptList(fakeWin as any);

    expect(fakeDoc.open).toHaveBeenCalled();
    expect(fakeDoc.write).toHaveBeenCalled();
    const written = (fakeDoc.write as any).mock.calls[0][0] as string;
    expect(written).toContain('Pray for City');
    expect(written).toContain('Supplication');
    expect(focusSpy).toHaveBeenCalled();
  });

  it('falls back to download when popup blocked', async () => {
    const now = new Date().toISOString();
    const samplePrompt = {
      id: 'pp2',
      title: 'Pray for Neighbors',
      type: 'Praise',
      description: 'Thanks',
      created_at: now
    } as any;

    const chainPrompts = {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [samplePrompt], error: null })
    } as any;

    const chainTypes = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null })
    } as any;

    vi.mocked(supabase.from).mockImplementation((table: string) => table === 'prayer_prompts' ? chainPrompts : chainTypes as any);

    // simulate popup blocked
    vi.spyOn(window, 'open').mockReturnValue(null as any);

    // JSDOM may not implement URL.createObjectURL — provide a stub on global
    const createUrlSpy = vi.fn().mockReturnValue('blob:fake');
    const revokeUrlSpy = vi.fn();
    (globalThis as any).URL = { createObjectURL: createUrlSpy, revokeObjectURL: revokeUrlSpy };
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const alertSpy = vi.spyOn(globalThis, 'alert').mockImplementation(() => {});

    const mod = await import('../printablePromptList');
    await mod.downloadPrintablePromptList(null);

    expect(createUrlSpy).toHaveBeenCalled();
    expect(clickSpy).toHaveBeenCalled();
    expect(alertSpy).toHaveBeenCalledWith('Prayer prompts downloaded. Please open the file to view and print.');

    createUrlSpy.mockRestore();
    clickSpy.mockRestore();
  });
});
