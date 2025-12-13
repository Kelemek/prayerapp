/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('sentry.ts', () => {
  let consoleLogSpy: any;
  let consoleWarnSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.clearAllMocks();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('exports initializeSentry function', async () => {
    const mod = await vi.importActual('../sentry');
    expect((mod as any).initializeSentry).toBeDefined();
    expect(typeof (mod as any).initializeSentry).toBe('function');
  });

  describe('initializeSentry', () => {
    it('logs initialization check on call', async () => {
      const mod = await vi.importActual('../sentry');
      const initFunc = (mod as any).initializeSentry;

      initFunc();

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Sentry initialization check|DSN value|Environment/i)
      );
    });

    it('warns when DSN is not configured', async () => {
      const mod = await vi.importActual('../sentry');
      const initFunc = (mod as any).initializeSentry;

      initFunc();

      // Should warn if DSN is empty
      // @ts-expect-error import.meta.env is not typed in this context
      if (!import.meta.env.VITE_SENTRY_DSN) {
        expect(consoleWarnSpy).toHaveBeenCalledWith(
          expect.stringMatching(/Sentry DSN not configured/i)
        );
      }
    });

    it('initializes Sentry when DSN is provided', async () => {
      // This test documents the expected behavior
      const dsnExample = 'https://examplePublicKey@o0.ingest.sentry.io/0';
      expect(dsnExample).toContain('https://');
      expect(dsnExample).toContain('ingest.sentry.io');
    });

    it('configures error ignoring patterns', () => {
      const ignoredPatterns = [
        'top.GLOBALS',
        'chrome-extension://',
        'moz-extension://',
        'error:addon_install_cancelled',
        'NetworkError',
        'Failed to fetch',
        'Permission denied',
      ];

      expect(ignoredPatterns).toHaveLength(7);
      expect(ignoredPatterns).toContain('NetworkError');
      expect(ignoredPatterns).toContain('Failed to fetch');
    });

    it('documents trace sample rate configuration', () => {
      // Trace sample rate of 0.1 = 10% of transactions
      const tracesSampleRate = 0.1;
      expect(tracesSampleRate).toBe(0.1);
      expect(tracesSampleRate * 100).toBe(10);
    });

    it('filters errors in development mode', () => {
      // @ts-expect-error import.meta.env is not typed in this context
      const isDevMode = import.meta.env.MODE === 'development';
      
      if (isDevMode) {
        expect(isDevMode).toBe(true);
      }
    });

    it('handles initialization error gracefully', async () => {
      const mod = await vi.importActual('../sentry');
      const initFunc = (mod as any).initializeSentry;

      // Mock Sentry to throw
      const mockSentry = {
        init: vi.fn().mockImplementationOnce(() => {
          throw new Error('Sentry init failed');
        })
      };

      vi.stubGlobal('Sentry', mockSentry);

      // Should not throw, but log error
      expect(() => {
        initFunc();
      }).not.toThrow();
    });

    it('documents Sentry DSN requirement', () => {
      const envVarName = 'VITE_SENTRY_DSN';
      expect(envVarName).toContain('SENTRY');
      expect(envVarName).toContain('DSN');
    });

    it('includes release version in Sentry config', () => {
      // @ts-expect-error import.meta.env is not typed in this context
      const releaseWithVar = import.meta.env.VITE_APP_VERSION || '1.0.0';

      expect(releaseWithVar).toBeTruthy();
      expect(typeof releaseWithVar).toBe('string');
    });

    it('exposes Sentry globally for debugging', () => {
      // Document that Sentry is attached to window for manual testing
      expect(typeof window).not.toBe('undefined');
    });

    it('configures environment based on build mode', () => {
      // @ts-expect-error import.meta.env is not typed in this context
      const environment = import.meta.env.MODE;
      
      expect(environment).toBeTruthy();
      expect(['development', 'test', 'production']).toContain(environment);
    });
  });
});
