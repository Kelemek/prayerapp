import 'vitest';
import { describe, it, expect, vi } from 'vitest'
import { createSupabaseMock } from '../supabaseMock'

describe('createSupabaseMock', () => {
  it('provides a spyable from and channel when running under vitest', () => {
    const sup = createSupabaseMock({ fromData: { items: [] } }) as any
    // under vitest these should be mock functions
    expect(typeof sup.from).toBe('function')
    expect(typeof sup.channel).toBe('function')
  // vi should have made them spyable (have a .mock property)
  expect((sup.from as any).mock).toBeDefined()
  expect((sup.channel as any).mock).toBeDefined()
  })

  it('supports chainable queries and maybeSingle/single', async () => {
    const data = { items: [{ id: 1, name: 'a' }, { id: 2, name: 'b' }, { id: 2, name: 'b2' }] }
    const sup = createSupabaseMock({ fromData: data }) as any

    const q1 = sup.from('items').select().eq('id', 1)
    const r1 = await q1.maybeSingle()
    expect(r1.data).toEqual({ id: 1, name: 'a' })

    const q2 = sup.from('items').select().eq('id', 3)
    const r2 = await q2.maybeSingle()
    expect(r2.data).toBeNull()

    // single should return error when multiple match
    const q3 = sup.from('items').select().eq('id', 2)
    const r3 = await q3.single()
    expect(r3.error).toBeTruthy()
  })

  it('insert/update/delete operate on underlying __testData', async () => {
    const data = { items: [{ id: 1, name: 'a' }] }
    const sup = createSupabaseMock({ fromData: data }) as any

    const ins = await sup.from('items').insert({ id: 2, name: 'b' })
    expect(ins.data).toEqual([{ id: 2, name: 'b' }])
    expect(sup.__testData.items.length).toBe(2)

    const upd = await sup.from('items').eq('id', 1).update({ name: 'z' })
    expect(upd.data[0].name).toBe('z')
    expect(sup.__testData.items.find((r: any) => r.id === 1).name).toBe('z')

    const del = await sup.from('items').eq('id', 2).delete()
    // delete() should return the deleted rows array (real supabase returns deleted rows on .select())
    expect(Array.isArray(del.data)).toBe(true)
    expect(del.data.length).toBe(1)
    expect(sup.__testData.items.find((r: any) => r.id === 2)).toBeUndefined()
  })

  it('channel on/subscribe/__trigger calls registered handlers', async () => {
    const sup = createSupabaseMock({}) as any
    const ch = sup.channel('chan')
    const cb = vi.fn()
    ch.on('myevent', cb).subscribe()

    // internal trigger helper should call handler
    ch.__trigger('myevent', { hello: 'world' })
    expect(cb).toHaveBeenCalledWith({ hello: 'world' })

    // support on(event, filter, cb) signature
    const cb2 = vi.fn()
    const ch2 = sup.channel('chan2')
    ch2.on('other', { foo: 'bar' }, cb2).subscribe()
    ch2.__trigger('other', { hi: 1 })
    expect(cb2).toHaveBeenCalledWith({ hi: 1 })
  })

  it('auth.getSession and functions.invoke reflect provided options', async () => {
    const session = { user: { id: 'u1' } }
    const invoke = vi.fn(async (name: string, args?: any) => ({ data: { ok: true, name }, error: null }))
    const sup = createSupabaseMock({ authSession: session, functionsInvoke: invoke }) as any

    const s = await sup.auth.getSession()
    expect(s.data.session).toBe(session)

    const res = await sup.functions.invoke('fn', { a: 1 })
    expect(res.data.ok).toBe(true)
    expect(invoke).toHaveBeenCalledWith('fn', { a: 1 })
  })
})
