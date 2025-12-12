import React from 'react'
import { render, waitFor, act } from '@testing-library/react'
import createSupabaseMock from '../../../src/testUtils/supabaseMock'

// We'll dynamically mock lib modules per-test so the hook imports the test supabase
describe('usePrayerManager', () => {
  afterEach(() => {
    // restore module registry so next test can doFresh mocks
    vi.resetModules()
    vi.clearAllMocks()
  })

  test('loadPrayers converts DB prayers and sorts by activity', async () => {
    const fromData = {
      prayers: [
        {
          id: 'p1',
          title: 'First',
          description: null,
          status: 'open',
          requester: 'A',
          prayer_for: 'World',
          email: null,
          is_anonymous: false,
          date_requested: null,
          date_answered: null,
          created_at: '2020-01-01T00:00:00.000Z',
          updated_at: '2020-01-01T00:00:00.000Z',
          approval_status: 'approved',
          'prayer_updates.approval_status': 'approved',
          prayer_updates: [
            { id: 'u1', prayer_id: 'p1', content: 'update1', author: 'Bob', approval_status: 'approved', created_at: '2020-01-02T00:00:00.000Z' }
          ]
        },
        {
          id: 'p2',
          title: 'Second',
          description: 'Desc',
          status: 'answered',
          requester: 'B',
          prayer_for: 'Someone',
          email: null,
          is_anonymous: false,
          date_requested: null,
          date_answered: null,
          created_at: '2021-01-01T00:00:00.000Z',
          updated_at: '2021-01-01T00:00:00.000Z',
          approval_status: 'approved',
          'prayer_updates.approval_status': 'approved',
          prayer_updates: []
        }
      ]
    }

    const sup = createSupabaseMock({ fromData })
    vi.doMock('../../../src/lib/supabase', () => ({ supabase: sup, handleSupabaseError: vi.fn() }))
    vi.doMock('../../../src/lib/emailNotifications', () => ({ sendAdminNotification: vi.fn().mockResolvedValue(null) }))

    const { usePrayerManager } = await import('../../../src/hooks/usePrayerManager')

    let hook: any = null
    function Test() {
      hook = usePrayerManager()
      return null
    }

    render(React.createElement(Test))

    await waitFor(() => expect(hook.loading).toBe(false))

    // Should have two prayers and the first should be the one with latest activity (p2 created_at is newer)
    expect(hook.prayers).toHaveLength(2)
    const ids = hook.prayers.map((p: any) => p.id)
    expect(ids).toEqual(['p2', 'p1'])

    // Converted update is present on p1
    const p1 = hook.prayers.find((p: any) => p.id === 'p1')
    expect(p1.updates[0].content).toBe('update1')
  })

  test('addPrayer auto-subscribes email when provided', async () => {
    const fromData: any = { prayers: [], email_subscribers: [] }
    const sup = createSupabaseMock({ fromData })
    vi.doMock('../../../src/lib/supabase', () => ({ supabase: sup, handleSupabaseError: vi.fn() }))
    vi.doMock('../../../src/lib/emailNotifications', () => ({ sendAdminNotification: vi.fn().mockResolvedValue(null) }))

    const { usePrayerManager } = await import('../../../src/hooks/usePrayerManager')

    let hook: any = null
    function Test() {
      hook = usePrayerManager()
      return null
    }

    render(React.createElement(Test))

    await waitFor(() => expect(hook.loading).toBe(false))

    const newPrayer = {
      title: 'New',
      description: 'd',
      status: 'open',
      requester: 'Req',
      prayer_for: 'All',
      email: 'Me@Example.COM',
      is_anonymous: false
    }

    await act(async () => {
      const data = await hook.addPrayer(newPrayer)
      // addPrayer returns inserted data (mock just echoes)
      expect(data).toBeTruthy()
    })

    // Supabase mock should have added an email_subscribers row
    expect(sup.__testData.email_subscribers).toHaveLength(1)
    expect(sup.__testData.email_subscribers[0].email).toBe('me@example.com')
  })

  test('getFilteredPrayers filters by status and search term (including updates)', async () => {
    const fromData: any = {
      prayers: [
        { id: 'a', title: 'Hello', description: 'one', status: 'open', requester: 'X', prayer_for: '', email: null, is_anonymous: false, created_at: '2020-01-01', updated_at: '2020-01-01', approval_status: 'approved', 'prayer_updates.approval_status': 'approved', prayer_updates: [] },
        { id: 'b', title: 'World', description: 'two', status: 'answered', requester: 'Y', prayer_for: '', email: null, is_anonymous: false, created_at: '2021-01-01', updated_at: '2021-01-01', approval_status: 'approved', 'prayer_updates.approval_status': 'approved', prayer_updates: [ { id: 'u2', prayer_id: 'b', content: 'special update', author: 'Ann', approval_status: 'approved', created_at: '2021-01-02' } ] }
      ]
    }
    const sup = createSupabaseMock({ fromData })
    vi.doMock('../../../src/lib/supabase', () => ({ supabase: sup, handleSupabaseError: vi.fn() }))
    vi.doMock('../../../src/lib/emailNotifications', () => ({ sendAdminNotification: vi.fn().mockResolvedValue(null) }))

    const { usePrayerManager } = await import('../../../src/hooks/usePrayerManager')

    let hook: any = null
    function Test() { hook = usePrayerManager(); return null }
    render(React.createElement(Test))
    await waitFor(() => expect(hook.loading).toBe(false))

    const answered = hook.getFilteredPrayers('answered')
    expect(answered).toHaveLength(1)

    const search = hook.getFilteredPrayers(undefined, 'special')
    expect(search).toHaveLength(1)
    expect(search[0].id).toBe('b')
  })

  test('requestUpdateDeletion returns ok and triggers admin notification', async () => {
    const fromData: any = {
      update_deletion_requests: [],
      prayer_updates: [ { id: 'up1', author: 'Joe', content: 'bad', prayers: { title: 'T1' } } ],
      email_subscribers: [ { id: 1, email: 'admin@example.com', is_admin: true, is_active: true, receive_admin_emails: true } ]
    }
    const sup = createSupabaseMock({ fromData })
    const sendAdminNotification = vi.fn().mockResolvedValue(null)
    vi.doMock('../../../src/lib/supabase', () => ({ supabase: sup, handleSupabaseError: vi.fn() }))
    vi.doMock('../../../src/lib/emailNotifications', () => ({ sendAdminNotification }))

    const { usePrayerManager } = await import('../../../src/hooks/usePrayerManager')
    let hook: any = null
    function Test() { hook = usePrayerManager(); return null }
    render(React.createElement(Test))
    await waitFor(() => expect(hook.loading).toBe(false))

    const res = await act(async () => {
      return await hook.requestUpdateDeletion('up1', 'reason', 'requester', 'r@example.com')
    })

    expect(res.ok).toBe(true)
    expect(sendAdminNotification).toHaveBeenCalled()
  })
})
