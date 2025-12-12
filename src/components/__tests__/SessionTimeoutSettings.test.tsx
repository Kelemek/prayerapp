import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { SessionTimeoutSettings } from '../SessionTimeoutSettings';

// Mock supabase client minimal API used by the component
vi.mock('../../lib/supabase', () => {
  return {
    supabase: {
      from: vi.fn((table: string) => {
        if (table === 'admin_settings') {
          return {
            select: vi.fn(() => ({ limit: vi.fn(() => ({ maybeSingle: vi.fn(async () => ({ data: null, error: null })) })) })),
            upsert: vi.fn(async () => ({ error: null }))
          } as any;
        }
        return {} as any;
      })
    }
  };
});

describe('SessionTimeoutSettings', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('loads defaults and allows saving valid settings', async () => {
    render(<SessionTimeoutSettings />);

    // Wait for loading state to disappear
    expect(await screen.findByText(/Session Timeout Configuration/i)).toBeInTheDocument();

    // Inputs have no accessible name; query by role then relative position next to headings
    const spinbuttons = screen.getAllByRole('spinbutton');
    // Order in DOM: inactivity, max session, heartbeat
    const [inactivityInput, maxSessionInput, heartbeatInput] = spinbuttons;

    // Adjust values to valid ones using change events for number inputs
    fireEvent.change(inactivityInput, { target: { value: '15' } });
    fireEvent.change(maxSessionInput, { target: { value: '120' } });
    fireEvent.change(heartbeatInput, { target: { value: '2' } });

    // Save
    const saveButton = screen.getByRole('button', { name: /save settings/i });
    await user.click(saveButton);

    // Success banner appears (primary success criteria)
    expect(await screen.findByText(/Settings saved successfully/i)).toBeInTheDocument();
  });

  it('shows validation errors for invalid values', async () => {
    render(<SessionTimeoutSettings />);
    expect(await screen.findByText(/Session Timeout Configuration/i)).toBeInTheDocument();

    const spinbuttons = screen.getAllByRole('spinbutton');
    const [inactivityInput, maxSessionInput, heartbeatInput] = spinbuttons;

    // Set heartbeat >= inactivity to trigger frequency rule
    fireEvent.change(inactivityInput, { target: { value: '5' } });
    fireEvent.change(heartbeatInput, { target: { value: '5' } });
    await user.click(screen.getByRole('button', { name: /save settings/i }));
    expect(await screen.findByText(/Database heartbeat must be less frequent than inactivity timeout/i)).toBeInTheDocument();
  });
});

// (Removed redundant minimal smoke tests to avoid duplicate suites)
