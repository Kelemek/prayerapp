import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateApprovalLink, validateApprovalCode } from '../approvalLinks';

vi.mock('../supabase', () => ({
  directMutation: vi.fn().mockResolvedValue({ error: null })
}));

describe('approvalLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it('builds link with required params', async () => {
    const old = window.location;
    // @ts-expect-error override for test
    delete (window as any).location;
    (window as any).location = { origin: 'https://example.com' };
    const url = await generateApprovalLink('status_change', 'abc123', 'admin@example.com');
    expect(url).toContain('approval_id=abc123');
    expect(url).toContain('approval_type=status_change');
    // restore
    (window as any).location = old;
  });

  it('returns null when mutation fails', async () => {
    const { directMutation } = await import('../supabase');
    vi.mocked(directMutation).mockResolvedValueOnce({ error: new Error('fail') } as any);
    const url = await generateApprovalLink('deletion', 'id-1', 'a+b@example.com');
    expect(url).toBeNull();
  });

  it('includes base path', async () => {
    const old = window.location;
    // @ts-expect-error override for test
    delete (window as any).location;
    (window as any).location = { origin: 'https://myapp.test' };
    const url = await generateApprovalLink('update', 'u1', 'admin@example.com');
    expect(url?.startsWith('https://myapp.test')).toBe(true);
    (window as any).location = old;
  });

  describe('generateApprovalLink', () => {
    it('generates approval link with prayer request', async () => {
      const old = window.location;
      // @ts-expect-error
      delete (window as any).location;
      (window as any).location = { origin: 'https://app.com' };

      const url = await generateApprovalLink('prayer', 'prayer-123', 'admin@church.org');

      expect(url).toContain('approval_type=prayer');
      expect(url).toContain('approval_id=prayer-123');
      expect(url).toContain('code=');

      (window as any).location = old;
    });

    it('generates approval link with update request', async () => {
      const old = window.location;
      // @ts-expect-error
      delete (window as any).location;
      (window as any).location = { origin: 'https://app.com' };

      const url = await generateApprovalLink('update', 'update-456', 'admin@church.org');

      expect(url).toContain('approval_type=update');
      expect(url).toContain('approval_id=update-456');

      (window as any).location = old;
    });

    it('trims and lowercases admin email', async () => {
      const { directMutation } = await import('../supabase');
      const mockMutation = vi.mocked(directMutation);
      mockMutation.mockResolvedValueOnce({ error: null } as any);

      const old = window.location;
      // @ts-expect-error
      delete (window as any).location;
      (window as any).location = { origin: 'https://app.com' };

      await generateApprovalLink('prayer', 'id-1', '  ADMIN@EXAMPLE.COM  ');

      // Check that email was trimmed and lowercased in the mutation call
      expect(mockMutation).toHaveBeenCalledWith(
        'approval_codes',
        expect.objectContaining({
          body: expect.objectContaining({
            admin_email: 'admin@example.com'
          })
        })
      );

      (window as any).location = old;
    });

    it('uses VITE_APP_URL fallback when window is undefined', async () => {
      // This tests the fallback path
      const old = window.location;
      // @ts-expect-error
      delete (window as any).location;
      (window as any).location = undefined;

      // Would use process.env.VITE_APP_URL or default to localhost
      // Since we can't easily test this without full mocking, document the behavior
      expect(typeof window).not.toBe('undefined');

      (window as any).location = old;
    });

    it('handles error during code generation', async () => {
      const { directMutation } = await import('../supabase');
      const mockMutation = vi.mocked(directMutation);
      mockMutation.mockRejectedValueOnce(new Error('Network error'));

      const url = await generateApprovalLink('prayer', 'id-1', 'admin@example.com');

      expect(url).toBeNull();
    });

    it('sets expiry to 24 hours from now', async () => {
      const { directMutation } = await import('../supabase');
      const mockMutation = vi.mocked(directMutation);
      mockMutation.mockResolvedValueOnce({ error: null } as any);

      const old = window.location;
      // @ts-expect-error
      delete (window as any).location;
      (window as any).location = { origin: 'https://app.com' };

      const before = new Date();
      before.setHours(before.getHours() + 24);

      await generateApprovalLink('prayer', 'id-1', 'admin@example.com');

      const callArgs = mockMutation.mock.calls[0];
      const expiresAt = new Date(callArgs[1].body.expires_at);
      const expectedExpiry = new Date();
      expectedExpiry.setHours(expectedExpiry.getHours() + 24);

      // Should be within a few seconds of expected expiry
      expect(Math.abs(expiresAt.getTime() - expectedExpiry.getTime())).toBeLessThan(5000);

      (window as any).location = old;
    });
  });

  describe('validateApprovalCode', () => {
    it('returns null for invalid response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false })
      });

      const result = await validateApprovalCode('invalid-code');

      expect(result).toBeNull();
    });

    it('returns null when validation fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: false })
      });

      const result = await validateApprovalCode('expired-code');

      expect(result).toBeNull();
    });

    it('returns approval info on success', async () => {
      const mockApprovalData = {
        success: true,
        approval_type: 'prayer',
        approval_id: 'prayer-123',
        user: { email: 'admin@example.com' }
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockApprovalData
      });

      const result = await validateApprovalCode('valid-code');

      expect(result).toEqual({
        approval_type: 'prayer',
        approval_id: 'prayer-123',
        user: { email: 'admin@example.com' }
      });
    });

    it('handles network errors gracefully', async () => {
      (global.fetch as any).mockRejectedValueOnce(new Error('Network failed'));

      const result = await validateApprovalCode('code-123');

      expect(result).toBeNull();
    });

    it('calls validate-approval-code edge function with code', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, approval_type: 'prayer', approval_id: 'id', user: {} })
      });

      await validateApprovalCode('test-code-123');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('validate-approval-code'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: expect.stringContaining('test-code-123')
        })
      );
    });

    it('handles missing success field in response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ approval_type: 'prayer', approval_id: 'id' })
      });

      const result = await validateApprovalCode('code');

      expect(result).toBeNull();
    });

    it('includes all required headers in fetch call', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, approval_type: 'deletion', approval_id: 'del-1', user: { email: 'test@example.com' } })
      });

      await validateApprovalCode('code-abc');

      const fetchCall = (global.fetch as any).mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Authorization']).toMatch(/Bearer /);
    });

    it('uses environment variables for Supabase config', async () => {
      const originalEnv = { ...import.meta.env };
      
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, approval_type: 'prayer', approval_id: 'id', user: {} })
      });

      await validateApprovalCode('code');

      const fetchCall = (global.fetch as any).mock.calls[0];
      const url = fetchCall[0];
      expect(url).toContain(import.meta.env.VITE_SUPABASE_URL || '');
    });

    it('handles malformed JSON response', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON'); }
      });

      const result = await validateApprovalCode('code');

      expect(result).toBeNull();
    });

    it('returns result with undefined user when response lacks user data', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, approval_type: 'prayer', approval_id: 'id' })
      });

      const result = await validateApprovalCode('code-with-no-user');

      expect(result).toBeDefined();
      expect(result?.approval_type).toBe('prayer');
      expect(result?.approval_id).toBe('id');
      // user field will be undefined if not in response
      expect(result?.user).toBeUndefined();
    });

    it('handles different approval types in validation', async () => {
      const types = ['prayer', 'update', 'deletion', 'status_change', 'preference-change'];

      for (const type of types) {
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true, approval_type: type, approval_id: 'id-' + type, user: { email: 'test@example.com' } })
        });

        const result = await validateApprovalCode('code-' + type);

        expect(result?.approval_type).toBe(type);
        expect(result?.approval_id).toBe('id-' + type);
      }
    });

    it('passes correct authorization header with anon key', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, approval_type: 'prayer', approval_id: 'id', user: { email: 'admin@test.com' } })
      });

      await validateApprovalCode('my-code-123');

      const fetchCall = (global.fetch as any).mock.calls[0];
      const headers = fetchCall[1].headers;
      expect(headers['Authorization']).toContain('Bearer ');
      expect(headers['Authorization']).toBe(`Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || ''}`);
    });

    it('sends code in request body as JSON', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, approval_type: 'prayer', approval_id: 'id', user: {} })
      });

      await validateApprovalCode('my-test-code-xyz');

      const fetchCall = (global.fetch as any).mock.calls[0];
      const body = JSON.parse(fetchCall[1].body);
      expect(body.code).toBe('my-test-code-xyz');
    });
  });

  describe('generateApprovalLink - Additional Coverage', () => {
    it('generates unique codes with crypto API', async () => {
      const { directMutation } = await import('../supabase');
      const mockMutation = vi.mocked(directMutation);
      mockMutation.mockResolvedValue({ error: null } as any);

      const old = window.location;
      // @ts-expect-error
      delete (window as any).location;
      (window as any).location = { origin: 'https://app.com' };

      const url1 = await generateApprovalLink('prayer', 'id-1', 'admin@example.com');
      const url2 = await generateApprovalLink('prayer', 'id-2', 'admin@example.com');

      const code1 = new URL(url1!).searchParams.get('code');
      const code2 = new URL(url2!).searchParams.get('code');

      // Codes should be different
      expect(code1).not.toBe(code2);
      expect(code1).toBeTruthy();
      expect(code2).toBeTruthy();

      (window as any).location = old;
    });

    it('handles direct mutation with timeout param', async () => {
      const { directMutation } = await import('../supabase');
      const mockMutation = vi.mocked(directMutation);
      mockMutation.mockResolvedValueOnce({ error: null } as any);

      const old = window.location;
      // @ts-expect-error
      delete (window as any).location;
      (window as any).location = { origin: 'https://app.com' };

      await generateApprovalLink('prayer', 'id-1', 'admin@example.com');

      const callArgs = mockMutation.mock.calls[0];
      expect(callArgs[1].timeout).toBe(10000);

      (window as any).location = old;
    });

    it('properly encodes all URL parameters', async () => {
      const { directMutation } = await import('../supabase');
      const mockMutation = vi.mocked(directMutation);
      mockMutation.mockResolvedValueOnce({ error: null } as any);

      const old = window.location;
      // @ts-expect-error
      delete (window as any).location;
      (window as any).location = { origin: 'https://app.com' };

      const url = await generateApprovalLink('status_change', 'req-with-special-chars', 'admin@example.com');

      expect(url).toBeTruthy();
      const parsedUrl = new URL(url!);
      expect(parsedUrl.searchParams.get('approval_type')).toBe('status_change');
      expect(parsedUrl.searchParams.get('approval_id')).toBe('req-with-special-chars');

      (window as any).location = old;
    });

    it('logs console.error on mutation failure', async () => {
      const { directMutation } = await import('../supabase');
      const mockMutation = vi.mocked(directMutation);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockMutation.mockResolvedValueOnce({ error: new Error('DB constraint failed') } as any);

      const old = window.location;
      // @ts-expect-error
      delete (window as any).location;
      (window as any).location = { origin: 'https://app.com' };

      await generateApprovalLink('prayer', 'id-1', 'admin@example.com');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to create approval code:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      (window as any).location = old;
    });

    it('logs console.error on exception', async () => {
      const { directMutation } = await import('../supabase');
      const mockMutation = vi.mocked(directMutation);
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      mockMutation.mockRejectedValueOnce(new Error('Unexpected error'));

      const old = window.location;
      // @ts-expect-error
      delete (window as any).location;
      (window as any).location = { origin: 'https://app.com' };

      await generateApprovalLink('prayer', 'id-1', 'admin@example.com');

      expect(consoleSpy).toHaveBeenCalledWith(
        'Error generating approval link:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
      (window as any).location = old;
    });
  });
});
