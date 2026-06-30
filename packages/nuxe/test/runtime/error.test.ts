import { describe, expect, it } from 'vitest'
import { createError, isNuxeError, NuxeError } from '../../lib/runtime/error'

describe('error helpers', () => {
  it('createError builds a NuxeError from payload', () => {
    const err = createError({ statusCode: 404, statusMessage: 'Not Found' })
    expect(err).toBeInstanceOf(NuxeError)
    expect(err.statusCode).toBe(404)
    expect(err.statusMessage).toBe('Not Found')
  })

  it('createError wraps a string', () => {
    const err = createError('Something broke')
    expect(err.statusCode).toBe(500)
    expect(err.message).toBe('Something broke')
  })

  it('createError wraps a plain Error', () => {
    const original = new Error('boom')
    const err = createError(original)
    expect(err.statusCode).toBe(500)
    expect(err.message).toBe('boom')
  })

  it('createError returns the same NuxeError instance', () => {
    const existing = new NuxeError({ statusCode: 403 })
    expect(createError(existing)).toBe(existing)
  })

  it('isNuxeError identifies NuxeError instances', () => {
    expect(isNuxeError(new NuxeError())).toBe(true)
    expect(isNuxeError(new Error())).toBe(false)
    expect(isNuxeError('error')).toBe(false)
  })
})
