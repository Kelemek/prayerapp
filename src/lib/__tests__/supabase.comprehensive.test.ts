import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('supabase.ts - utility functions', () => {
  let isNetworkError: any;
  let directQuery: any;
  let directMutation: any;
  let getSupabaseConfig: any;

  beforeEach(async () => {
    // Import actual implementations
    const mod = await vi.importActual('../supabase');
    isNetworkError = (mod as any).isNetworkError;
    directQuery = (mod as any).directQuery;
    directMutation = (mod as any).directMutation;
    getSupabaseConfig = (mod as any).getSupabaseConfig;
  });

  describe('isNetworkError', () => {
    it('returns false for null/undefined', () => {
      expect(isNetworkError(null)).toBe(false);
      expect(isNetworkError(undefined)).toBe(false);
    });

    it('detects "Failed to fetch" in Error message', () => {
      const error = new Error('Failed to fetch');
      expect(isNetworkError(error)).toBe(true);
    });

    it('detects "Network" in Error message', () => {
      const error = new Error('Network error');
      expect(isNetworkError(error)).toBe(true);
    });

    it('detects "Timeout" in Error message', () => {
      const error = new Error('Timeout');
      expect(isNetworkError(error)).toBe(true);
    });

    it('detects "Aborted" in Error message', () => {
      const error = new Error('Aborted');
      expect(isNetworkError(error)).toBe(true);
    });

    it('detects "Connection" in Error message', () => {
      const error = new Error('Connection failed');
      expect(isNetworkError(error)).toBe(true);
    });

    it('returns false for non-network errors', () => {
      expect(isNetworkError(new Error('Invalid syntax'))).toBe(false);
      expect(isNetworkError('database error')).toBe(false);
    });

    it('detects lowercase network patterns in strings', () => {
      // String input with network-related text
      expect(isNetworkError('FAILED TO FETCH')).toBe(true);
      expect(isNetworkError('timeout occurred')).toBe(true);
    });
  });

  describe('directQuery', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('returns data when fetch succeeds', async () => {
      const mockData = [{ id: 1, name: 'Test' }];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: new Headers(),
      });

      const result = await directQuery('test_table', { select: '*' });

      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it('includes query select parameter', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers(),
      });

      await directQuery('prayers', { select: 'id, text' });

      const [url] = (global.fetch as any).mock.calls[0];
      // URL encoding uses + for space or %20, both are valid
      expect(url).toContain('select=id');
      expect(url).toContain('text');
    });

    it('includes eq filters in query', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers(),
      });

      await directQuery('prayers', { eq: { status: 'approved' } });

      const [url] = (global.fetch as any).mock.calls[0];
      expect(url).toContain('status=eq.approved');
    });

    it('includes order parameter', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers(),
      });

      await directQuery('prayers', { order: { column: 'created_at', ascending: false } });

      const [url] = (global.fetch as any).mock.calls[0];
      expect(url).toContain('order=created_at.desc');
    });

    it('includes limit parameter', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers(),
      });

      await directQuery('prayers', { limit: 10 });

      const [url] = (global.fetch as any).mock.calls[0];
      expect(url).toContain('limit=10');
    });

    it('extracts count from content-range header', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
        headers: new Headers({ 'content-range': '0-9/100' }),
      });

      const result = await directQuery('prayers', { count: 'exact' });

      expect(result.count).toBe(100);
    });

    it('returns data with count', async () => {
      const mockData = [{ id: 1 }];
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockData,
        headers: new Headers({ 'content-range': '0-0/5' }),
      });

      const result = await directQuery('prayers', { count: 'exact' });

      expect(result.data).toEqual(mockData);
      expect(result.count).toBe(5);
    });

    it('handles error response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: async () => 'Bad request',
      });

      const result = await directQuery('prayers');

      expect(result.data).toBeNull();
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('400');
    });

    it('handles fetch network error', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network failed'));

      const result = await directQuery('prayers');

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('Network failed');
    });

    it('handles timeout', async () => {
      (global.fetch as any).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          const err = new Error('Abort');
          (err as any).name = 'AbortError';
          reject(err);
        });
      });

      const result = await directQuery('prayers', { timeout: 1000 });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('timed out');
    });
  });

  describe('directMutation', () => {
    beforeEach(() => {
      global.fetch = vi.fn();
    });

    it('performs POST mutation', async () => {
      const mockData = { id: 1, name: 'New Prayer' };
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => mockData,
      });

      const result = await directMutation('prayers', {
        method: 'POST',
        body: { text: 'Help me' },
        returning: true,
      });

      expect(result.data).toEqual(mockData);
      expect(result.error).toBeNull();
    });

    it('performs PATCH with filters', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers({ 'content-type': 'application/json' }),
        json: async () => [{ id: 1, status: 'approved' }],
      });

      await directMutation('prayers', {
        method: 'PATCH',
        eq: { id: '1' },
        body: { status: 'approved' },
      });

      const [url] = (global.fetch as any).mock.calls[0];
      expect(url).toContain('id=eq.1');
    });

    it('performs DELETE mutation', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        headers: new Headers(),
      });

      const result = await directMutation('prayers', {
        method: 'DELETE',
        eq: { id: '1' },
      });

      expect(result.error).toBeNull();
    });

    it('handles mutation error', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: async () => 'Forbidden',
      });

      const result = await directMutation('prayers', {
        method: 'POST',
        body: { text: 'Test' },
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('403');
    });

    it('handles mutation timeout', async () => {
      (global.fetch as any).mockImplementationOnce(() => {
        return new Promise((_, reject) => {
          const err = new Error('Abort');
          (err as any).name = 'AbortError';
          reject(err);
        });
      });

      const result = await directMutation('prayers', {
        method: 'POST',
        timeout: 500,
        body: { text: 'Test' },
      });

      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('timed out');
    });
  });

  describe('getSupabaseConfig', () => {
    it('returns config object with url and anonKey', () => {
      const config = getSupabaseConfig();

      expect(config).toBeDefined();
      expect(config.url).toBeDefined();
      expect(config.anonKey).toBeDefined();
      expect(typeof config.url).toBe('string');
      expect(typeof config.anonKey).toBe('string');
    });

    it('returns non-empty values', () => {
      const config = getSupabaseConfig();

      expect(config.url.length).toBeGreaterThan(0);
      expect(config.anonKey.length).toBeGreaterThan(0);
    });
  });
});
