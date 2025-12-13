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

  it('trims whitespace from all fields', () => {
    saveUserInfo('  John  ', '  Doe  ', '  john@example.com  ');
    const info = getUserInfo();
    expect(info.firstName).toBe('John');
    expect(info.lastName).toBe('Doe');
    expect(info.email).toBe('john@example.com');
  });

  it('skips saving whitespace-only fields', () => {
    saveUserInfo('   ', 'Valid', 'test@example.com');
    expect(localStorage.getItem('prayerapp_user_first_name')).toBeNull();
    expect(localStorage.getItem('prayerapp_user_last_name')).toBe('Valid');
    expect(localStorage.getItem('prayerapp_user_email')).toBe('test@example.com');
  });

  it('overwrites previously saved user info', () => {
    saveUserInfo('John', 'Doe', 'john@example.com');
    saveUserInfo('Jane', 'Smith', 'jane@example.com');

    const info = getUserInfo();
    expect(info.firstName).toBe('Jane');
    expect(info.lastName).toBe('Smith');
    expect(info.email).toBe('jane@example.com');
  });

  it('returns empty strings when no user info is saved', () => {
    const info = getUserInfo();
    expect(info).toEqual({
      firstName: '',
      lastName: '',
      email: ''
    });
  });

  it('returns partial user info when only some fields are saved', () => {
    localStorage.setItem('prayerapp_user_first_name', 'Jane');
    localStorage.setItem('prayerapp_user_email', 'jane@example.com');

    const info = getUserInfo();
    expect(info).toEqual({
      firstName: 'Jane',
      lastName: '',
      email: 'jane@example.com'
    });
  });

  it('handles clearing when no user info exists', () => {
    expect(() => clearUserInfo()).not.toThrow();
    const info = getUserInfo();
    expect(info).toEqual({
      firstName: '',
      lastName: '',
      email: ''
    });
  });

  it('workflow: save, retrieve, clear', () => {
    // Save
    saveUserInfo('Charlie', 'Brown', 'charlie@example.com');
    
    // Retrieve
    let info = getUserInfo();
    expect(info.firstName).toBe('Charlie');
    expect(info.lastName).toBe('Brown');
    expect(info.email).toBe('charlie@example.com');

    // Clear
    clearUserInfo();
    info = getUserInfo();
    expect(info).toEqual({
      firstName: '',
      lastName: '',
      email: ''
    });
  });

  it('handles unicode characters in names', () => {
    saveUserInfo('José', 'García', 'jose@example.com');

    const info = getUserInfo();
    expect(info.firstName).toBe('José');
    expect(info.lastName).toBe('García');
  });

  it('handles email with special characters', () => {
    const email = 'test+tag@subdomain.example.co.uk';
    saveUserInfo('Test', 'User', email);

    expect(localStorage.getItem('prayerapp_user_email')).toBe(email);
  });

  it('multiple saves overwrite previous data', () => {
    saveUserInfo('User1', 'One', 'user1@example.com');
    saveUserInfo('User2', 'Two', 'user2@example.com');
    saveUserInfo('User3', 'Three', 'user3@example.com');

    const info = getUserInfo();
    expect(info.firstName).toBe('User3');
    expect(info.lastName).toBe('Three');
    expect(info.email).toBe('user3@example.com');
  });

  it('saves partial user info', () => {
    saveUserInfo('Alex', '', 'alex@example.com');

    expect(localStorage.getItem('prayerapp_user_first_name')).toBe('Alex');
    expect(localStorage.getItem('prayerapp_user_last_name')).toBeNull();
    expect(localStorage.getItem('prayerapp_user_email')).toBe('alex@example.com');
  });
});
