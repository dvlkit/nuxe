import { describe, expect, it } from 'vitest'
import { createError, isNuxtError, NuxtError } from '../../lib/runtime/error'

describe('error helpers', () => {
  it('createError builds a NuxtError from payload', () => {
    const err = createError({ statusCode: 404, statusMessage: 'Not Found' })
    expect(err).toBeInstanceOf(NuxtError)
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

  it('createError returns the same NuxtError instance', () => {
    const existing = new NuxtError({ statusCode: 403 })
    expect(createError(existing)).toBe(existing)
  })

  it('isNuxtError identifies NuxtError instances', () => {
    expect(isNuxtError(new NuxtError())).toBe(true)
    expect(isNuxtError(new Error())).toBe(false)
    expect(isNuxtError('error')).toBe(false)
  })
})
