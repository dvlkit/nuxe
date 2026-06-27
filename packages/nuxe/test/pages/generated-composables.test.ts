import { describe, expect, it } from 'vitest'
import { generateNavigateTo, generateUseRoute } from '../../lib/pages/generated-composables'

describe('generated composables', () => {
  it('generateNavigateTo wraps runtime navigateTo with typed raw location', () => {
    const output = generateNavigateTo()
    expect(output).toContain("import { navigateTo as _navigateTo, type NavigateToOptions } from '@dvlkit/nuxe'")
    expect(output).toContain("import type { NuxeRouteLocationRaw } from '../typed-router'")
    expect(output).toContain('export function navigateTo(to: NuxeRouteLocationRaw, options?: NavigateToOptions)')
    expect(output).toContain('return _navigateTo(to as any, options)')
  })

  it('generateUseRoute defines typed useNuxeRoute helper', () => {
    const output = generateUseRoute()
    expect(output).toContain("import { useRoute as _useRoute } from 'vue-router'")
    expect(output).toContain("import type { RouteNamedMap } from '../typed-router'")
    expect(output).toContain('export function useNuxeRoute<Name extends keyof RouteNamedMap = keyof RouteNamedMap>(\n  name?: Name,\n): NuxeRoute<Name>')
  })
})
