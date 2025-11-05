import { describe, it, expect, beforeEach } from 'vitest';
import { saveUserInfo, getUserInfo, clearUserInfo } from '../userInfoStorage';

describe('userInfoStorage utilities', () => {
  beforeEach(() => {
    // Provide a deterministic mock localStorage for tests in case the environment
    // doesn't provide one or it's not behaving as expected.
    let store: Record<string, string> = {};
    globalThis.localStorage = {
      getItem: (key: string) => (key in store ? store[key] : null),
      setItem: (key: string, value: string) => { store[key] = String(value); },
      removeItem: (key: string) => { delete store[key]; },
      clear: () => { store = {}; },
      key: (_i: number) => null,
      length: 0
    } as unknown as Storage;
  });

  it('saves and retrieves user info', () => {
    saveUserInfo('John', 'Doe', 'john@example.com');

    // Verify localStorage keys directly (robust if getUserInfo wrapper has an issue)
    expect(localStorage.getItem('prayerapp_user_first_name')).toBe('John');
    expect(localStorage.getItem('prayerapp_user_last_name')).toBe('Doe');
    expect(localStorage.getItem('prayerapp_user_email')).toBe('john@example.com');

    const info = getUserInfo();
    expect(info.firstName).toBe('John');
    expect(info.lastName).toBe('Doe');
    expect(info.email).toBe('john@example.com');
  });

  it('clears user info', () => {
    saveUserInfo('A', 'B', 'c@d.com');
    clearUserInfo();

    const info = getUserInfo();
    expect(info.firstName).toBe('');
    expect(info.lastName).toBe('');
    expect(info.email).toBe('');
  });

  it('does not save empty values', () => {
    saveUserInfo('', '', '');
    const info = getUserInfo();
    expect(info.firstName).toBe('');
    expect(info.lastName).toBe('');
    expect(info.email).toBe('');
  });
});
