import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Mock Supabase client using the shared test factory so chainable methods (.select/.eq/.order
// .maybeSingle/.single/etc) are available by default in all tests. Individual test files may
// still override `vi.mock('../../lib/supabase')` with custom behavior when needed.
import { createSupabaseMock } from './testUtils/supabaseMock'

const defaultSupabase = createSupabaseMock()

vi.mock('./lib/supabase', () => ({
  supabase: defaultSupabase,
  handleSupabaseError: (e: any) => e?.message || 'Unknown'
}))

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock environment variables
vi.stubEnv('VITE_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
vi.stubEnv('VITE_SUPABASE_SERVICE_KEY', 'test-service-role-key')

// Mock supabaseAdmin with the same mock as supabase
vi.mock('./lib/supabaseAdmin', () => ({
  supabaseAdmin: defaultSupabase
}))

// Mock window.matchMedia for dark mode tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock window.localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
global.localStorage = localStorageMock as Storage

// Mock window.alert and window.confirm
global.alert = vi.fn()
global.confirm = vi.fn(() => true)

// Extend expect matchers
declare module 'vitest' {
  interface Assertion {
    toBeInTheDocument(): void
    toHaveTextContent(text: string | RegExp): void
    toHaveClass(className: string): void
  }
}

// Suppress noisy React act(...) warnings during test runs while we incrementally fix tests.
// These warnings are benign here (tests exercise async effects) but flood CI logs.
// We'll keep this temporary suppression to make triage manageable; individual tests should
// still be updated to await async updates or wrap in act() as a follow-up.
const _consoleError = console.error.bind(console)
console.error = (...args: any[]) => {
  try {
    const joined = args.map(a => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
    if (joined.includes('not wrapped in act(') || 
        joined.includes('wrap-tests-with-act') ||
        joined.includes('Error checking verification setting') ||
        joined.includes('Error loading preferences') ||
        joined.includes('Error saving preferences')) {
      return
    }
  } catch (e) {
    // fall through to original
  }
  _consoleError(...args)
}
