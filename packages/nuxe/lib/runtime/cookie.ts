import { ref, watch, type Ref } from 'vue'
import { useNuxeApp } from '../plugins/runtime'

export interface CookieOptions {
  maxAge?: number
  expires?: Date
  httpOnly?: boolean
  secure?: boolean
  sameSite?: 'strict' | 'lax' | 'none'
  domain?: string
  path?: string
}

export function parseCookieValue(cookieHeader: string, name: string): string | undefined {
  const match = cookieHeader.match(
    new RegExp('(?:^|; )' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'),
  )
  return match ? decodeURIComponent(match[1]) : undefined
}

export function serializeCookie(name: string, value: string, options: CookieOptions = {}): string {
  let cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`
  if (options.maxAge !== undefined) cookie += `; Max-Age=${options.maxAge}`
  if (options.expires) cookie += `; Expires=${options.expires.toUTCString()}`
  if (options.path) cookie += `; Path=${options.path}`
  if (options.domain) cookie += `; Domain=${options.domain}`
  if (options.sameSite) cookie += `; SameSite=${options.sameSite}`
  if (options.secure) cookie += '; Secure'
  if (options.httpOnly) cookie += '; HttpOnly'
  return cookie
}

export function useCookie(name: string, options: CookieOptions = {}): Ref<string | undefined> {
  const nuxeApp = useNuxeApp()
  const isClient = typeof window !== 'undefined'

  let initial: string | undefined
  if (isClient) {
    initial = parseCookieValue(document.cookie, name)
  } else {
    const request = (nuxeApp.ssrContext as { request?: Request } | undefined)?.request
    const cookieHeader = request?.headers.get('cookie')
    initial = cookieHeader ? parseCookieValue(cookieHeader, name) : undefined
  }

  const cookie = ref<string | undefined>(initial)

  if (isClient) {
    watch(cookie, (value) => {
      if (value === undefined) {
        document.cookie = serializeCookie(name, '', { ...options, maxAge: -1 })
      } else {
        document.cookie = serializeCookie(name, value, options)
      }
    })
  }

  return cookie
}
