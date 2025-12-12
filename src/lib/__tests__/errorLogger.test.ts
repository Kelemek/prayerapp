import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as errorLogger from '../errorLogger';

// Mock fetch for network logging
const originalFetch = global.fetch;

describe('errorLogger', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // @ts-expect-error allow override
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
  });

  it('logs info messages', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
    errorLogger.logInfo('hello world');
    expect(spy).toHaveBeenCalled();
  });

  it('logs warnings', () => {
    const spy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorLogger.logWarning('be careful');
    expect(spy).toHaveBeenCalled();
  });

  it('logs errors with context', async () => {
    const spyErr = vi.spyOn(console, 'error').mockImplementation(() => {});
    errorLogger.logError({ message: 'failure', error: new Error('boom'), context: { tags: { test: 'yes' } } });
    expect(spyErr).toHaveBeenCalled();
  });

  it('logs info and warning via wrappers', () => {
    const spyLog = vi.spyOn(console, 'log').mockImplementation(() => {});
    const spyWarn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorLogger.logInfo('informational');
    errorLogger.logWarning('careful');
    expect(spyLog).toHaveBeenCalled();
    expect(spyWarn).toHaveBeenCalled();
  });

  afterAll(() => {
    // restore original fetch
    // @ts-expect-error allow restore
    global.fetch = originalFetch;
  });
});
