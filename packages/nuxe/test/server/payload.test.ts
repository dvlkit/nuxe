import { describe, expect, it } from 'vitest'
import { serializePayload } from '../../lib/server/payload'

function evalSerialized<T = Record<string, unknown>>(result: string): T {
  // eslint-disable-next-line no-new-func
  return new Function(`return ${result}`)() as T
}

describe('serializePayload', () => {
  it('serializes plain objects', () => {
    const payload = { greeting: { hello: 'world' } }
    const result = serializePayload(payload)
    expect(result).toContain('hello')
    expect(evalSerialized(result)).toEqual(payload)
  })

  it('serializes rich types supported by devalue', () => {
    const payload = {
      date: new Date('2024-01-01T00:00:00.000Z'),
      set: new Set([1, 2]),
      map: new Map([['a', 1]]),
      regex: /abc/g,
      url: new URL('https://example.com'),
    }
    const result = serializePayload(payload)
    const parsed = evalSerialized<typeof payload>(result)

    expect(parsed.date).toBeInstanceOf(Date)
    expect(parsed.date.toISOString()).toBe('2024-01-01T00:00:00.000Z')
    expect(parsed.set).toBeInstanceOf(Set)
    expect([...parsed.set]).toEqual([1, 2])
    expect(parsed.map).toBeInstanceOf(Map)
    expect([...parsed.map]).toEqual([['a', 1]])
    expect(parsed.regex).toBeInstanceOf(RegExp)
    expect(parsed.url).toBeInstanceOf(URL)
  })

  it('escapes </script> to avoid breaking out of the inline script tag', () => {
    const payload = { xss: '</script><script>alert(1)</script>' }
    const result = serializePayload(payload)
    expect(result).not.toContain('</script>')
    expect(result.toLowerCase()).toContain('\\u003c')
  })

  it('strips dangerous keys to prevent prototype pollution', () => {
    const payload: Record<string, unknown> = { safe: 'value' }
    payload['__proto__'] = { polluted: true }
    payload['constructor'] = { polluted: true }
    payload['prototype'] = { polluted: true }

    const result = serializePayload(payload)
    expect(result).toContain('safe')
    expect(result).not.toContain('polluted')
  })

  it('sanitizes dangerous keys inside Maps', () => {
    const map = new Map<string, number>()
    map.set('__proto__', 1)
    map.set('constructor', 2)
    map.set('safe', 3)

    const result = serializePayload({ map })
    const parsed = evalSerialized<{ map: Map<string, number> }>(result)
    expect(parsed.map.has('safe')).toBe(true)
    expect(parsed.map.has('__sanitized__')).toBe(true)
  })

  it('handles circular references without crashing', () => {
    const obj: Record<string, unknown> = { name: 'self' }
    obj.self = obj
    const result = serializePayload({ circular: obj })
    const parsed = evalSerialized<{ circular: Record<string, unknown> }>(result)
    expect(parsed.circular.name).toBe('self')
  })
})
