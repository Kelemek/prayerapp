# Testing Guide

This project uses **Vitest** and **React Testing Library** for unit and integration testing, with automated testing via GitHub Actions and Netlify preview deployments.

## Table of Contents
- [Quick Start](#quick-start)
- [Running Tests](#running-tests)
- [Writing Tests](#writing-tests)
- [Test Structure](#test-structure)
- [Mocking](#mocking)
- [CI/CD Integration](#cicd-integration)
- [Netlify Preview Testing](#netlify-preview-testing)
- [Best Practices](#best-practices)

## Quick Start

### Install Dependencies
Dependencies are already installed. If you need to reinstall:

```bash
npm install
```

### Run Tests

```bash
# Run tests in watch mode (recommended for development)
npm test

# Run tests once
npm run test:run

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Running Tests

### Watch Mode
Best for development - automatically reruns tests when files change:
```bash
npm test
```

### Single Run
Used in CI/CD pipelines:
```bash
npm run test:run
```

### UI Mode
Interactive browser-based test runner:
```bash
npm run test:ui
```
Then open http://localhost:51204/__vitest__/ in your browser.

### Coverage Report
Generates HTML coverage report in `coverage/` directory:
```bash
npm run test:coverage
```
Open `coverage/index.html` to view detailed coverage.

## Writing Tests

### Test File Location
Place test files next to the components they test:
```
src/
  components/
    BackupStatus.tsx
    BackupStatus.test.tsx  ← Test file
```

### Basic Test Structure

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MyComponent from './MyComponent'

describe('MyComponent', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly', () => {
    render(<MyComponent />)
    expect(screen.getByText('Hello')).toBeInTheDocument()
  })

  it('handles user interaction', async () => {
    const user = userEvent.setup()
    render(<MyComponent />)
    
    const button = screen.getByRole('button', { name: /click me/i })
    await user.click(button)
    
    expect(screen.getByText('Clicked!')).toBeInTheDocument()
  })
})
```

### Testing Async Operations

```typescript
it('fetches and displays data', async () => {
  render(<MyComponent />)
  
  // Wait for async operation to complete
  await waitFor(() => {
    expect(screen.getByText('Data loaded')).toBeInTheDocument()
  })
})
```

### Testing User Events

```typescript
import userEvent from '@testing-library/user-event'

it('handles form submission', async () => {
  const user = userEvent.setup()
  render(<MyForm />)
  
  // Type into input
  const input = screen.getByLabelText(/email/i)
  await user.type(input, 'test@example.com')
  
  // Click button
  const button = screen.getByRole('button', { name: /submit/i })
  await user.click(button)
  
  expect(screen.getByText('Success')).toBeInTheDocument()
})
```

## Test Structure

### Queries
Use the following query priority (in order):

1. **Accessible queries** (preferred):
   - `getByRole` - Best for interactive elements
   - `getByLabelText` - Forms
   - `getByPlaceholderText` - Inputs
   - `getByText` - Text content
   - `getByDisplayValue` - Form values

2. **Semantic queries**:
   - `getByAltText` - Images
   - `getByTitle` - Elements with title attribute

3. **Test IDs** (last resort):
   - `getByTestId` - Use when semantic queries don't work

### Query Variants

- **getBy**: Throws error if not found (use for elements that should exist)
- **queryBy**: Returns null if not found (use to test absence)
- **findBy**: Returns Promise, waits for element (use for async)

```typescript
// Element should exist
expect(screen.getByText('Hello')).toBeInTheDocument()

// Element should not exist
expect(screen.queryByText('Goodbye')).not.toBeInTheDocument()

// Wait for element to appear
const element = await screen.findByText('Loaded')
```

## Mocking

### Mock Supabase

```typescript
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({
            data: [{ id: 1, name: 'Test' }],
            error: null
          }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ error: null })),
      delete: vi.fn(() => Promise.resolve({ error: null }))
    }))
  }
}))
```

### Mock Functions

```typescript
const mockFn = vi.fn()
mockFn.mockReturnValue('test value')
mockFn.mockResolvedValue({ data: 'async value' })

// Verify calls
expect(mockFn).toHaveBeenCalled()
expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2')
expect(mockFn).toHaveBeenCalledTimes(2)
```

### Mock Modules

```typescript
// Mock entire module
vi.mock('./myModule', () => ({
  myFunction: vi.fn(() => 'mocked')
}))

// Partial mock (keep some real, mock others)
vi.mock('./myModule', async () => {
  const actual = await vi.importActual('./myModule')
  return {
    ...actual,
    specificFunction: vi.fn()
  }
})
```

## CI/CD Integration

### GitHub Actions Workflows

#### 1. Test Workflow (`.github/workflows/test.yml`)
Runs on every push and PR to `main` or `develop`:
- Installs dependencies
- Runs linter
- Runs tests
- Generates coverage report
- Comments PR with results

#### 2. Netlify Preview Workflow (`.github/workflows/netlify-preview.yml`)
Runs on PRs to `main`:
- Installs dependencies
- Runs linter
- Runs tests (deployment only proceeds if tests pass)
- Builds project
- Deploys to Netlify preview
- Comments PR with preview URL

### Required GitHub Secrets

Set these in **Repository Settings → Secrets and variables → Actions**:

```
VITE_SUPABASE_URL          # Your Supabase project URL
VITE_SUPABASE_ANON_KEY     # Your Supabase anonymous key
NETLIFY_AUTH_TOKEN         # Netlify personal access token
NETLIFY_SITE_ID            # Your Netlify site ID
```

### Getting Netlify Credentials

1. **NETLIFY_AUTH_TOKEN**:
   - Go to https://app.netlify.com/user/applications
   - Click "New access token"
   - Copy the token

2. **NETLIFY_SITE_ID**:
   - Go to your site settings in Netlify
   - Copy the "API ID" under "Site information"

## Netlify Preview Testing

When you create a PR, the workflow:
1. ✅ Runs all tests
2. ✅ Lints code
3. ✅ Builds the app
4. 🚀 Deploys to a preview URL
5. 💬 Comments on the PR with the preview link

Preview URL format: `https://pr-{number}--your-site.netlify.app`

### Testing Preview Deployments

1. Create a new branch
2. Make changes and push
3. Create a PR to `main`
4. Wait for GitHub Actions to complete
5. Click the preview link in the PR comment
6. Test your changes in the live preview

### Preview Features
- Unique URL per PR
- Auto-updates on new commits
- Deleted when PR is closed/merged
- Full Supabase integration
- Production-like environment

## Best Practices

### 1. Test Behavior, Not Implementation
```typescript
// ❌ Bad - testing implementation
expect(component.state.isOpen).toBe(true)

// ✅ Good - testing behavior
expect(screen.getByRole('dialog')).toBeInTheDocument()
```

### 2. Use Accessible Queries
```typescript
// ❌ Bad
screen.getByTestId('submit-button')

// ✅ Good
screen.getByRole('button', { name: /submit/i })
```

### 3. Avoid Testing Internal State
```typescript
// ❌ Bad
expect(wrapper.find('div').prop('className')).toBe('active')

// ✅ Good
expect(screen.getByText('Active')).toHaveClass('active')
```

### 4. Keep Tests Isolated
```typescript
describe('MyComponent', () => {
  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks()
  })

  it('test 1', () => {
    // Each test is independent
  })

  it('test 2', () => {
    // Doesn't depend on test 1
  })
})
```

### 5. Test Error States
```typescript
it('shows error message when API fails', async () => {
  // Mock error response
  vi.mocked(supabase.from).mockReturnValue({
    select: vi.fn(() => Promise.resolve({
      data: null,
      error: { message: 'Network error' }
    }))
  })

  render(<MyComponent />)

  await waitFor(() => {
    expect(screen.getByText(/error/i)).toBeInTheDocument()
  })
})
```

### 6. Use Descriptive Test Names
```typescript
// ❌ Bad
it('works', () => {})

// ✅ Good
it('displays error message when form submission fails', () => {})
```

### 7. Group Related Tests
```typescript
describe('BackupStatus', () => {
  describe('when loading', () => {
    it('shows loading spinner', () => {})
    it('disables action buttons', () => {})
  })

  describe('when loaded', () => {
    it('displays backup list', () => {})
    it('enables action buttons', () => {})
  })
})
```

## Debugging Tests

### 1. Use `screen.debug()`
```typescript
it('test', () => {
  render(<MyComponent />)
  screen.debug() // Prints current DOM
})
```

### 2. Use Vitest UI
```bash
npm run test:ui
```
Provides interactive debugging with browser DevTools.

### 3. Add `console.log` in Tests
```typescript
it('test', () => {
  const element = screen.getByRole('button')
  console.log(element.textContent)
})
```

### 4. Run Single Test
```typescript
it.only('this test runs alone', () => {
  // Only this test will run
})

describe.only('this suite runs alone', () => {
  // Only tests in this suite will run
})
```

## Code Coverage

### View Coverage
```bash
npm run test:coverage
open coverage/index.html
```

### Coverage Thresholds
Current configuration doesn't enforce thresholds. To add:

```typescript
// vite.config.ts
export default defineConfig({
  test: {
    coverage: {
      lines: 80,
      functions: 80,
      branches: 80,
      statements: 80
    }
  }
})
```

### What to Cover
- ✅ User interactions
- ✅ Error states
- ✅ Edge cases
- ✅ API calls
- ❌ Don't obsess over 100% coverage
- ❌ Don't test implementation details

## Common Issues

### Issue: "Cannot find module"
**Solution**: Make sure test file is in the same directory as the component, or adjust import path.

### Issue: "ReferenceError: document is not defined"
**Solution**: Check that `environment: 'jsdom'` is set in `vite.config.ts`.

### Issue: "Cannot read property of undefined"
**Solution**: Mock the module/dependency properly. Check `setupTests.ts` for global mocks.

### Issue: Tests timeout
**Solution**: Increase timeout or check for missing `await`:
```typescript
it('async test', async () => {
  await waitFor(() => {
    expect(screen.getByText('loaded')).toBeInTheDocument()
  }, { timeout: 5000 })
})
```

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [Common Testing Mistakes](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)
- [Effective Testing Guide](https://kentcdodds.com/blog/write-tests)

## Example Tests

See `src/components/BackupStatus.test.tsx` for a complete example of component testing with:
- Mocking Supabase
- Testing async data fetching
- Testing user interactions
- Testing expandable UI elements
- Testing button clicks
