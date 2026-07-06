import type { SSRContext } from 'vue/server-renderer'
import { NuxeApp, NuxeError } from '../runtime'
import { createStreamableHead } from '@unhead/vue/stream/server'
import { RouteRules } from '../pages/scanner'

export interface NuxeSSRContext extends SSRContext {
  url: string
  modules: Set<string>
  request?: Request
  _renderResponse?: Response
  _spa?: boolean
  error?: NuxeError | null
  head?: ReturnType<typeof createStreamableHead>['head']
  nuxeApp?: NuxeApp
  payload: Record<string, unknown>
  pending: Map<string, Promise<unknown>>
  awaitAll: () => Promise<void>
  routeRules?: RouteRules
}