import { describe, it, expect } from 'vitest';
import { generateApprovalLink } from '../approvalLinks';
import { vi } from 'vitest';
vi.mock('../supabase', () => ({
  directMutation: vi.fn().mockResolvedValue({ error: null })
}));

describe('approvalLinks', () => {
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
});
