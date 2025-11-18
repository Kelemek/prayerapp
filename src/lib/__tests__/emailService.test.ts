import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as emailService from '../emailService';

// Mock supabase
vi.mock('../supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn()
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn().mockResolvedValue({
            data: {
              id: '1',
              template_key: 'verification_code',
              name: 'Verification Code',
              subject: 'Your verification code: {{code}}',
              html_body: '<html><body><p>You requested to {{actionDescription}}.</p><div class="code">{{code}}</div></body></html>',
              text_body: 'You requested to {{actionDescription}}.\n\n{{code}}',
              description: 'Email sent to verify user actions like prayer submissions and deletions',
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            error: null
          })
        }))
      }))
    }))
  }
}));

import { supabase } from '../supabase';

describe('emailService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sendEmail succeeds when supabase function returns success', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({ data: { success: true }, error: null });

    await expect(emailService.sendEmail({ to: 'x@example.com', subject: 'Test' })).resolves.toBeUndefined();
    expect(supabase.functions.invoke).toHaveBeenCalled();
  });

  it('sendEmail throws when supabase function returns error', async () => {
  (supabase.functions.invoke as any).mockResolvedValue({ data: null, error: { message: 'Fail' } });

    await expect(emailService.sendEmail({ to: 'x@example.com', subject: 'Test' })).rejects.toThrow('Fail');
  });

  it('sendEmail throws when data.success is false', async () => {
  (supabase.functions.invoke as any).mockResolvedValue({ data: { success: false, error: 'Bad' }, error: null });

    await expect(emailService.sendEmail({ to: 'x@example.com', subject: 'Test' })).rejects.toThrow('Bad');
  });

  it('sendEmailToAllSubscribers returns BulkEmailResult mapping', async () => {
  (supabase.functions.invoke as any).mockResolvedValue({ data: { success: true, sent: 10, failed: 2, errors: ['a'] }, error: null });

    const res = await emailService.sendEmailToAllSubscribers({ subject: 'S' });
    expect(res).toEqual({ success: true, sent: 10, failed: 2, errors: ['a'] });
  });

  it('sendVerificationCode calls sendEmail with constructed body', async () => {
    // Ensure underlying supabase function returns success so sendEmail does not throw
    (supabase.functions.invoke as any).mockResolvedValue({ data: { success: true }, error: null });

    await emailService.sendVerificationCode({ email: 'u@example.com', code: '123456', actionType: 'prayer_submission' });

    // Verify the supabase function was invoked with expected payload
    expect(supabase.functions.invoke).toHaveBeenCalled();
    const calledArgs = (supabase.functions.invoke as any).mock.calls[0][1];
    const body = calledArgs.body;
    expect(body.to).toBe('u@example.com');
    expect(body.subject).toContain('Your verification code:');
    expect(body.subject).toContain('123456');
    // Variables should be substituted in the body
    expect(body.htmlBody).toContain('123456');
    expect(body.htmlBody).toContain('submit a prayer request');
  });
});
