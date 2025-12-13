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

  it('applyTemplateVariables replaces single placeholder', () => {
    const result = emailService.applyTemplateVariables('Hello {{name}}!', { name: 'John' });
    expect(result).toBe('Hello John!');
  });

  it('applyTemplateVariables replaces multiple placeholders', () => {
    const result = emailService.applyTemplateVariables(
      'Hello {{name}}, your code is {{code}}',
      { name: 'Jane', code: '12345' }
    );
    expect(result).toBe('Hello Jane, your code is 12345');
  });

  it('applyTemplateVariables ignores missing variables', () => {
    const result = emailService.applyTemplateVariables(
      'Hello {{name}}, code: {{code}}',
      { name: 'Bob' }
    );
    // Missing 'code' variable is not replaced
    expect(result).toBe('Hello Bob, code: {{code}}');
  });

  it('applyTemplateVariables handles whitespace around placeholder', () => {
    const result = emailService.applyTemplateVariables(
      'Code: {{ code }} and {{ name }}',
      { code: 'ABC', name: 'Test' }
    );
    expect(result).toBe('Code: ABC and Test');
  });

  it('applyTemplateVariables handles empty string values', () => {
    const result = emailService.applyTemplateVariables(
      'Name: {{name}}, Email: {{email}}',
      { name: '', email: 'test@example.com' }
    );
    expect(result).toBe('Name: , Email: test@example.com');
  });

  it('getTemplate returns template data on success', async () => {
    const result = await emailService.getTemplate('verification_code');
    expect(result).toBeDefined();
    expect(result?.template_key).toBe('verification_code');
    expect(result?.subject).toContain('verification code');
  });

  it('getTemplate returns null on error', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Not found')
          })
        })
      })
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await emailService.getTemplate('nonexistent');
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it('sendEmail includes all optional parameters', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({ data: { success: true }, error: null });

    await emailService.sendEmail({
      to: ['user1@example.com', 'user2@example.com'],
      subject: 'Test Subject',
      htmlBody: '<html><body>HTML</body></html>',
      textBody: 'Plain text',
      replyTo: 'reply@example.com',
      fromName: 'Sender'
    });

    const calledArgs = (supabase.functions.invoke as any).mock.calls[0];
    expect(calledArgs[0]).toBe('send-email');
    expect(calledArgs[1].body).toEqual({
      to: ['user1@example.com', 'user2@example.com'],
      subject: 'Test Subject',
      htmlBody: '<html><body>HTML</body></html>',
      textBody: 'Plain text',
      replyTo: 'reply@example.com',
      fromName: 'Sender'
    });
  });

  it('sendEmail throws with default message when error has no message', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({ data: null, error: {} });

    await expect(
      emailService.sendEmail({ to: 'test@example.com', subject: 'Test' })
    ).rejects.toThrow('Failed to send email');
  });

  it('sendEmail throws with data error when success is false', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { success: false, error: 'Custom error message' },
      error: null
    });

    await expect(
      emailService.sendEmail({ to: 'test@example.com', subject: 'Test' })
    ).rejects.toThrow('Custom error message');
  });

  it('sendEmailToAllSubscribers uses send_to_all_subscribers action', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { success: true, sent: 5, failed: 0, errors: [] },
      error: null
    });

    await emailService.sendEmailToAllSubscribers({
      subject: 'Broadcast',
      htmlBody: '<p>To all</p>',
      textBody: 'To all'
    });

    const calledArgs = (supabase.functions.invoke as any).mock.calls[0];
    expect(calledArgs[1].body.action).toBe('send_to_all_subscribers');
    expect(calledArgs[1].body.subject).toBe('Broadcast');
  });

  it('sendEmailToAllSubscribers returns defaults when data is missing', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: { success: false },
      error: null
    });

    const result = await emailService.sendEmailToAllSubscribers({ subject: 'Test' });

    expect(result.success).toBe(false);
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it('sendEmailToAllSubscribers throws on function error', async () => {
    (supabase.functions.invoke as any).mockResolvedValue({
      data: null,
      error: { message: 'Function failed' }
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      emailService.sendEmailToAllSubscribers({ subject: 'Test' })
    ).rejects.toThrow('Function failed');

    consoleSpy.mockRestore();
  });

  it('sendVerificationCode throws when template not found', async () => {
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: new Error('Not found')
          })
        })
      })
    });

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      emailService.sendVerificationCode({
        email: 'test@example.com',
        code: '12345',
        actionType: 'prayer_submission'
      })
    ).rejects.toThrow('Email template not configured');

    consoleSpy.mockRestore();
  });

  it('sendVerificationCode handles all action types', async () => {
    // Reset and set mock for these tests
    vi.clearAllMocks();
    (supabase.functions.invoke as any).mockResolvedValue({ data: { success: true }, error: null });
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: '1',
              template_key: 'verification_code',
              name: 'Verification Code',
              subject: 'Your verification code: {{code}}',
              html_body: '<html><body><p>You requested to {{actionDescription}}.</p><div class="code">{{code}}</div></body></html>',
              text_body: 'You requested to {{actionDescription}}.\n\n{{code}}',
              description: 'Email template',
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            error: null
          })
        })
      })
    });

    const actionTypes = [
      'prayer_submission',
      'prayer_update',
      'deletion_request',
      'update_deletion_request',
      'status_change_request',
      'preference_change'
    ];

    for (const actionType of actionTypes) {
      vi.clearAllMocks();
      (supabase.functions.invoke as any).mockResolvedValue({ data: { success: true }, error: null });
      (supabase.from as any).mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: '1',
                template_key: 'verification_code',
                name: 'Verification Code',
                subject: 'Your verification code: {{code}}',
                html_body: '<html><body><p>You requested to {{actionDescription}}.</p><div class="code">{{code}}</div></body></html>',
                text_body: 'You requested to {{actionDescription}}.\n\n{{code}}',
                description: 'Email template',
                created_at: '2025-01-01T00:00:00Z',
                updated_at: '2025-01-01T00:00:00Z'
              },
              error: null
            })
          })
        })
      });

      await emailService.sendVerificationCode({
        email: 'test@example.com',
        code: '12345',
        actionType
      });

      expect(supabase.functions.invoke).toHaveBeenCalled();
    }
  });

  it('sendVerificationCode uses default description for unknown action type', async () => {
    vi.clearAllMocks();
    (supabase.functions.invoke as any).mockResolvedValue({ data: { success: true }, error: null });
    (supabase.from as any).mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: '1',
              template_key: 'verification_code',
              name: 'Verification Code',
              subject: 'Your verification code: {{code}}',
              html_body: '<html><body><p>You requested to {{actionDescription}}.</p><div class="code">{{code}}</div></body></html>',
              text_body: 'You requested to {{actionDescription}}.\n\n{{code}}',
              description: 'Email template',
              created_at: '2025-01-01T00:00:00Z',
              updated_at: '2025-01-01T00:00:00Z'
            },
            error: null
          })
        })
      })
    });

    await emailService.sendVerificationCode({
      email: 'test@example.com',
      code: '99999',
      actionType: 'unknown_action'
    });

    const calledArgs = (supabase.functions.invoke as any).mock.calls[0][1];
    const body = calledArgs.body;
    expect(body.htmlBody).toContain('perform an action');
  });
});
