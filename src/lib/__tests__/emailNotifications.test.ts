import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock the email service and supabase client
vi.mock('../emailService', () => ({
  sendEmail: vi.fn(),
  sendEmailToAllSubscribers: vi.fn(),
  getTemplate: vi.fn(),
  applyTemplateVariables: (content: string, variables: Record<string, string>) => {
    let result = content;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || '');
    }
    return result;
  }
}));

vi.mock('../supabase', () => ({
  supabase: {
    from: vi.fn()
  }
}));

import * as emailNotifications from '../emailNotifications';
import { supabase } from '../supabase';
import { sendEmail, sendEmailToAllSubscribers } from '../emailService';

describe('emailNotifications', () => {
  let consoleError: any;
  let consoleWarn: any;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    // ensure window.location.origin exists for HTML generation
    if (typeof window !== 'undefined') {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: { origin: 'http://localhost' }
      });
    }
  });

  afterEach(() => {
    vi.resetAllMocks();
    consoleError.mockRestore();
    consoleWarn.mockRestore();
  });

  it('sends admin notification when admins exist and sendEmail resolves', async () => {
    // Arrange: make a chainable supabase.from(...).select().eq().eq().eq() => Promise<{data, error}>
    const finalResult = Promise.resolve({ data: [{ email: 'admin@example.com' }], error: null });
    const chain3 = { eq: () => finalResult };
    const chain2 = { eq: () => chain3 };
    const chain1 = { eq: () => chain2 };
    const selectChain = { select: () => chain1 };
    (supabase.from as any).mockReturnValue(selectChain);

    (sendEmail as any).mockResolvedValue(undefined);

    // Act
    await emailNotifications.sendAdminNotification({ type: 'prayer', title: 'Test Prayer' });

    // Assert
    expect(supabase.from).toHaveBeenCalledWith('email_subscribers');
    expect(sendEmail).toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('warns and returns when no admins are configured', async () => {
    const finalResult = Promise.resolve({ data: [], error: null });
    const chain3 = { eq: () => finalResult };
    const chain2 = { eq: () => chain3 };
    const chain1 = { eq: () => chain2 };
    const selectChain = { select: () => chain1 };
    (supabase.from as any).mockReturnValue(selectChain);

    await emailNotifications.sendAdminNotification({ type: 'prayer', title: 'No Admins' });

    expect(consoleWarn).toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('warns when requester email is missing for requester approval', async () => {
    await emailNotifications.sendRequesterApprovalNotification({
      title: 'T',
      description: 'D',
      requester: 'Bob',
      requesterEmail: '' as any,
      prayerFor: 'All'
    });

    expect(consoleWarn).toHaveBeenCalled();
  });

  it('logs error when sendEmail throws for requester approval', async () => {
    (sendEmail as any).mockRejectedValue(new Error('send-failed'));

    await emailNotifications.sendRequesterApprovalNotification({
      title: 'T',
      description: 'D',
      requester: 'Bob',
      requesterEmail: 'bob@example.com',
      prayerFor: 'All'
    });

    // The internal invokeSendNotification should catch and return an error which causes logging
    expect(consoleError).toHaveBeenCalled();
  });

  it('calls sendEmailToAllSubscribers for approved prayer notification', async () => {
    (sendEmailToAllSubscribers as any).mockResolvedValue({ ok: true });

    await emailNotifications.sendApprovedPrayerNotification({
      title: 'T',
      description: 'D',
      requester: 'Alice',
      requesterEmail: 'alice@example.com',
      prayerFor: 'World',
      status: 'open'
    } as any);

    expect(sendEmailToAllSubscribers).toHaveBeenCalled();
  });

  it('warns when denied prayer requester email is missing', async () => {
    await emailNotifications.sendDeniedPrayerNotification({
      title: 'Bad',
      description: 'D',
      requester: 'NoEmail',
      requesterEmail: '' as any,
      denialReason: 'reason'
    });

    expect(consoleWarn).toHaveBeenCalled();
  });

  it('warns when denied update author email is missing', async () => {
    await emailNotifications.sendDeniedUpdateNotification({
      prayerTitle: 'P',
      content: 'C',
      author: 'X',
      authorEmail: '' as any,
      denialReason: 'nope'
    });

    expect(consoleWarn).toHaveBeenCalled();
  });

  it('sends preference change admin notification when subscribers exist', async () => {
    // Make supabase.from(...).select() chainable and return one admin email
  const finalResult = Promise.resolve({ data: [{ email: 'admin2@example.com' }], error: null });
  // For preference change, code calls select().eq('is_active', true) once — make eq return the final promise
  const selectChain = { select: () => ({ eq: () => finalResult }) };
    (supabase.from as any).mockReturnValue(selectChain);

    (sendEmail as any).mockResolvedValue(undefined);

    await emailNotifications.sendPreferenceChangeNotification({ name: 'Sam', email: 'sam@example.com', receiveNotifications: true });

    expect(sendEmail).toHaveBeenCalled();
  });

  it('sends approved update notification via sendEmailToAllSubscribers and logs on failure', async () => {
    // Mock getTemplate to return a template
    const { getTemplate } = await import('../emailService');
    (getTemplate as any).mockResolvedValue({
      id: 'test-id',
      template_key: 'approved_update',
      name: 'Approved Update',
      subject: 'Prayer Update: {{prayerTitle}}',
      html_body: 'Update: {{content}}',
      text_body: 'Update: {{content}}',
      description: 'Test template'
    });

    // success path
    (sendEmailToAllSubscribers as any).mockResolvedValue({ ok: true });

    await emailNotifications.sendApprovedUpdateNotification({
      prayerTitle: 'PT',
      content: 'C',
      author: 'A',
      markedAsAnswered: false
    } as any);

    expect(sendEmailToAllSubscribers).toHaveBeenCalled();

    // failure path - force it to throw and expect console.error
    (sendEmailToAllSubscribers as any).mockRejectedValue(new Error('bulk-fail'));
    
    // Mock getTemplate again for the second call
    (getTemplate as any).mockResolvedValue({
      id: 'test-id-2',
      template_key: 'prayer_answered',
      name: 'Prayer Answered',
      subject: 'Prayer Answered: {{prayerTitle}}',
      html_body: 'Prayer answered: {{content}}',
      text_body: 'Prayer answered: {{content}}',
      description: 'Test template'
    });

    await emailNotifications.sendApprovedUpdateNotification({
      prayerTitle: 'PT2',
      content: 'C2',
      author: 'A2',
      markedAsAnswered: true
    } as any);

    expect(consoleError).toHaveBeenCalled();
  });

  it('sends approved preference change notification and handles send errors', async () => {
    (sendEmail as any).mockResolvedValue(undefined);
    await emailNotifications.sendApprovedPreferenceChangeNotification({ name: 'N', email: 'n@example.com', receiveNotifications: true });
    expect(sendEmail).toHaveBeenCalled();

    (sendEmail as any).mockRejectedValue(new Error('boom'));
    await emailNotifications.sendApprovedPreferenceChangeNotification({ name: 'N2', email: 'n2@example.com', receiveNotifications: false });
    expect(consoleError).toHaveBeenCalled();
  });

  it('sends denied preference change notification and handles send errors', async () => {
    (sendEmail as any).mockResolvedValue(undefined);
    await emailNotifications.sendDeniedPreferenceChangeNotification({ name: 'D', email: 'd@example.com', receiveNotifications: true, denialReason: 'r' });
    expect(sendEmail).toHaveBeenCalled();

    (sendEmail as any).mockRejectedValue(new Error('boom2'));
    await emailNotifications.sendDeniedPreferenceChangeNotification({ name: 'D2', email: 'd2@example.com', receiveNotifications: false, denialReason: 'r2' });
    expect(consoleError).toHaveBeenCalled();
  });
});
