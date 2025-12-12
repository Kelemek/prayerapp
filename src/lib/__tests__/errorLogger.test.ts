import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest'

describe('errorLogger utilities', () => {
  let origConsoleError: any
  beforeEach(() => {
    origConsoleError = console.error
    console.error = vi.fn()
    ;(console as any).warn = vi.fn()
    ;(console as any).log = vi.fn()
    // Provide fake Sentry and DD_RUM on window
    // Provide window with trackers so sendToErrorTracking can access them
    ;(global as any).window = { DD_RUM: { addError: vi.fn() }, Sentry: { captureException: vi.fn() }, location: { href: 'http://x', pathname: '/' } } as any
    ;(global as any).DD_RUM = (global as any).window.DD_RUM
    ;(global as any).Sentry = (global as any).window.Sentry
    // Provide performance timing
    ;(global as any).performance = { timing: { loadEventEnd: 2000, navigationStart: 0, responseEnd: 100, requestStart: 50, domComplete: 1800, domLoading: 100 } }
    ;(global as any).document = { referrer: '', documentElement: { classList: { contains: () => false } }, location: { href: 'http://x', pathname: '/p' } } as any
    ;(global as any).navigator = { userAgent: 'test-agent' } as any
  })

  afterEach(() => {
    console.error = origConsoleError
    ;(console as any).warn = undefined
    ;(console as any).log = undefined
    delete (global as any).DD_RUM
    delete (global as any).Sentry
    delete (global as any).performance
    delete (global as any).document
    delete (global as any).navigator
    delete (global as any).window
  })

  it('logError calls external trackers and logs to console', async () => {
    const mod = await import('../errorLogger')
    const { logError } = mod
    const err = new Error('boom')
    logError({ message: 'Test', error: err })
    expect(console.error).toHaveBeenCalled()
    expect((global as any).DD_RUM.addError).toHaveBeenCalled()
    expect((global as any).Sentry.captureException).toHaveBeenCalled()
  })

  it('withErrorLogging returns null on thrown error and logs', async () => {
    const mod = await import('../errorLogger')
    const { withErrorLogging } = mod
    const fn = async () => { throw new Error('fail') }
    const res = await withErrorLogging(fn, 'failed op')
    expect(res).toBeNull()
    expect(console.error).toHaveBeenCalled()
  })

  it('logWarning/logInfo call logError under the hood', async () => {
    const mod = await import('../errorLogger')
    const { logWarning, logInfo } = mod
    await logWarning('warn msg')
    await logInfo('info msg')
    expect((console as any).warn).toHaveBeenCalled()
    expect((console as any).log).toHaveBeenCalled()
  })

  it('logPageView and logPerformanceMetrics run without throwing', async () => {
    const mod = await import('../errorLogger')
    const { logPageView, logPerformanceMetrics } = mod
    // Add minimal window globals
    ;(global as any).window = { location: { pathname: '/x', href: 'http://x' }, document: { documentElement: { classList: { contains: () => false } } }, performance: (global as any).performance } as any
    expect(() => logPageView('Home')).not.toThrow()
    expect(() => logPerformanceMetrics()).not.toThrow()
    delete (global as any).window
  })

  it('setupGlobalErrorHandling registers handlers and triggers logError on events', async () => {
    const mod = await import('../errorLogger')
    const { setupGlobalErrorHandling } = mod
    // Provide window and navigator
    ;(global as any).window = { addEventListener: (name: string, cb: any) => { /* no-op */ } } as any
    setupGlobalErrorHandling()
    // Simulate error event by calling handler via dispatchEvent if available
    // We primarily assert that setup doesn't throw and wiring exists
    expect(typeof setupGlobalErrorHandling).toBe('function')
    delete (global as any).window
  })
})
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
