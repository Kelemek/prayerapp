import React from 'react'
import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock supabase used by the component. We'll return nothing for admin_settings by default
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null, error: null }),
        }),
      }),
    }),
  },
}))

// Mock the useVerification hook so we can control verifyCode
const verifySpy = vi.fn(() => Promise.resolve({ actionType: 'mock', actionData: { ok: true }, email: 'x@example.com' }))
vi.mock('../../hooks/useVerification', () => ({
  useVerification: () => ({
    verifyCode: verifySpy,
  }),
}))

import { VerificationDialog } from '../VerificationDialog'

describe('VerificationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders nothing when closed', () => {
    const { container } = render(
      <VerificationDialog isOpen={false} onClose={() => {}} onVerified={() => {}} onResend={async () => {}} email="a@b" codeId="c" expiresAt={new Date().toISOString()} />
    )

    expect(container.firstChild).toBeNull()
  })

  it('fetches code length (defaults to 6 when none) and shows inputs', async () => {
    render(
      <VerificationDialog isOpen={true} onClose={() => {}} onVerified={() => {}} onResend={async () => {}} email="a@b" codeId="c" expiresAt={new Date(Date.now() + 60000).toISOString()} />
    )

    // default code length should render 6 inputs
    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox')
      expect(inputs.length).toBe(6)
    })
  })

  it('shows expired message and disables verify when expiresAt is past', async () => {
    render(
      <VerificationDialog isOpen={true} onClose={() => {}} onVerified={() => {}} onResend={async () => {}} email="a@b" codeId="c" expiresAt={new Date(Date.now() - 1000).toISOString()} />
    )

    await waitFor(() => {
      const matches = screen.getAllByText(/Code expired/i)
      expect(matches.length).toBeGreaterThan(0)
    })

    const verifyBtn = screen.getByRole('button', { name: /verify code/i })
    expect(verifyBtn).toBeDisabled()
  })

  it('pastes full code and triggers verify -> calls onVerified and onClose', async () => {
  const onVerified = vi.fn()
  const onClose = vi.fn()

    render(
      <VerificationDialog isOpen={true} onClose={onClose} onVerified={onVerified} onResend={async () => {}} email="a@b" codeId="c" expiresAt={new Date(Date.now() + 60000).toISOString()} />
    )

    // Wait for inputs
    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBe(6))

  const inputs = screen.getAllByRole('textbox')
  const firstInput = inputs[0]

  // Fire a paste event on the first input with a correct-length code
  fireEvent.paste(firstInput, { clipboardData: { getData: () => '123456' } } as unknown as DataTransfer)

    // Now click Verify
    const user = userEvent.setup()
    const verifyBtn = screen.getByRole('button', { name: /verify code/i })

    // Wait for button to become enabled
    await waitFor(() => expect(verifyBtn).not.toBeDisabled())

    await user.click(verifyBtn)

    await waitFor(() => {
  expect(verifySpy).toHaveBeenCalled()
      expect(onVerified).toHaveBeenCalledWith({ ok: true })
      expect(onClose).toHaveBeenCalled()
    })
  })
})
