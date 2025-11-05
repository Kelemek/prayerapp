/* A small, reusable supabase mock factory for tests.
   Usage:
     import { createSupabaseMock } from '../testUtils/supabaseMock'
     const supabase = createSupabaseMock({ fromData: { prayers: [ ... ] } })
     vi.mock('../../lib/supabase', () => ({ supabase }))

   The mock implements a chainable .from(...).select().eq().order().maybeSingle()/single()
   as well as auth.getSession / auth.onAuthStateChange, functions.invoke and channel(...)
*/

type Row = Record<string, any>

export function createSupabaseMock(opts: {
  fromData?: Record<string, Row[]>
  authSession?: any
  functionsInvoke?: (name: string, args?: any) => Promise<any>
} = {}) {
  const fromData = opts.fromData || {}

  class Query {
    table: string
    selected: string | null = null
    filters: Array<(r: Row) => boolean> = []
    orderBy: { col: string; asc?: boolean } | null = null

    constructor(table: string) {
      this.table = table
    }

    select(_cols?: string) {
      this.selected = _cols || null
      return this
    }

    eq(column: string, value: any) {
      this.filters.push(r => r[column] === value)
      return this
    }

    order(_col: string, opts?: { ascending?: boolean }) {
      this.orderBy = { col: _col, asc: opts?.ascending }
      return this
    }

    async maybeSingle() {
      const all = (fromData[this.table] || []).slice()
      const matched = all.filter(r => this.filters.every(f => f(r)))
      const row = matched.length ? matched[0] : null
      return { data: row, error: null }
    }

    async single() {
      const all = (fromData[this.table] || []).slice()
      const matched = all.filter(r => this.filters.every(f => f(r)))
      if (matched.length === 1) return { data: matched[0], error: null }
      return { data: null, error: { message: 'Not single' } }
    }

    // Allow awaiting the query directly: await supabase.from(...).select()
    then(cb: any) {
      const all = (fromData[this.table] || []).slice()
      const matched = all.filter(r => this.filters.every(f => f(r)))
      return cb({ data: matched, error: null })
    }

    // simple insert/update/delete helpers used by tests
  insert(payload: any) {
      const rows = fromData[this.table] || (fromData[this.table] = [])
      const toInsert = Array.isArray(payload) ? payload : [payload]
      rows.push(...toInsert)
      // Return an object that supports chained .select() calls
      return {
        data: toInsert,
        error: null,
        select: async () => ({ data: toInsert, error: null }),
        then: (cb: any) => cb({ data: toInsert, error: null })
      }
    }

  update(payload: any) {
      const rows = fromData[this.table] || []
      const matched = rows.filter(r => this.filters.every(f => f(r)))
      matched.forEach(r => Object.assign(r, payload))
      return {
        data: matched,
        error: null,
        select: async () => ({ data: matched, error: null }),
        then: (cb: any) => cb({ data: matched, error: null })
      }
    }

    delete() {
      // Return a chainable object so callers can do .delete().eq(...).select()
      const self = this
      const ret: any = {
        eq: (column: string, value: any) => {
          self.filters.push((r: Row) => r[column] === value)
          return ret
        },
        select: async () => {
          const rows = fromData[self.table] || []
          const before = rows.length
          const remaining = rows.filter(r => !self.filters.every(f => f(r)))
          const deletedRows = rows.filter(r => self.filters.every(f => f(r)))
          fromData[self.table] = remaining
          return { data: deletedRows, error: null }
        },
        then: (cb: any) => {
          // mirror the behavior of select(): compute deleted rows and return them
          const rows = fromData[self.table] || []
          const remaining = rows.filter(r => !self.filters.every(f => f(r)))
          const deletedRows = rows.filter(r => self.filters.every(f => f(r)))
          fromData[self.table] = remaining
          return cb({ data: deletedRows, error: null })
        }
      }

      return ret
    }
  }

  const channel = (name: string) => {
    const handlers: Array<{ event: string; filter?: any; cb: Function }> = []
    const ch: any = {
      on: (event: string, filterOrCb: any, maybeCb?: Function) => {
        // Support both .on(event, callback) and .on(event, filter, callback)
        if (typeof maybeCb === 'function') {
          handlers.push({ event, filter: filterOrCb, cb: maybeCb });
        } else {
          handlers.push({ event, cb: filterOrCb });
        }
        // Return the same channel so calls can be chained
        return ch
      },
      subscribe: async () => ({ data: null, error: null }),
      // helper used by tests to trigger events
      __trigger: (eventName: string, payload: any) => {
        handlers.forEach(h => {
          if (h.event === eventName) {
            try { h.cb(payload) } catch (e) { /* ignore */ }
          }
        })
      }
    }
    return ch
  }

  const auth = {
    getSession: async () => ({ data: { session: opts.authSession || null } }),
    onAuthStateChange: (cb: Function) => {
      // return a subscription like supabase does
      const sub = { data: null, unsubscribe: () => {} }
      return sub
    }
  }

  const functions = {
    invoke: async (name: string, args?: any) => {
      if (opts.functionsInvoke) return opts.functionsInvoke(name, args)
      return { data: null, error: null }
    }
  }

  // If running under Vitest, expose spy-able functions (vi.fn) so tests can mockReturnValue
  const maybeVi = (globalThis as any).vi
  const fromFn = maybeVi ? maybeVi.fn((table: string) => new Query(table)) : ((table: string) => new Query(table))
  const channelFn = maybeVi ? maybeVi.fn((name: string) => channel(name)) : ((name: string) => channel(name))

  const supabaseMock = {
    from: fromFn,
    channel: channelFn,
    auth,
    functions,
    removeChannel: (ch: any) => { /* no-op for tests */ },
    // allow tests to inspect/change underlying data
    __testData: fromData
  }

  return supabaseMock as any
}

export default createSupabaseMock
