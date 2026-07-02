import * as v from 'valibot'
import type { UserConfig } from 'vite'

const runtimeConfigValueSchema: v.GenericSchema<unknown> = v.lazy(() =>
  v.union([
    v.string(),
    v.number(),
    v.boolean(),
    v.null(),
    v.record(v.string(), runtimeConfigValueSchema),
  ]),
)

const runtimeConfigSchema: v.GenericSchema<unknown> = v.lazy(() =>
  v.record(v.string(), v.union([runtimeConfigValueSchema, v.undefined()])),
)

const nuxeConfigSchema = v.object({
  server: v.optional(
    v.object({
      port: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(65535))),
    }),
    {},
  ),
  vite: v.optional(v.custom<UserConfig>(() => true), {}),
  runtimeConfig: v.optional(runtimeConfigSchema, {}),
  baseUrl: v.optional(v.string()),
  apiPrefix: v.optional(
    v.pipe(
      v.string(),
      v.regex(/^\/(?!\/)/, 'apiPrefix must start with "/" (e.g. "/api" or "/v1")'),
      v.check((s) => s.length > 1, 'apiPrefix cannot be just "/"'),
      v.transform((s) => s.replace(/\/+$/, '')),
    ),
    '/api',
  ),
})

export const NuxeConfigSchema: typeof nuxeConfigSchema = nuxeConfigSchema

export type NuxeConfig = v.InferOutput<typeof nuxeConfigSchema>

export type NuxeConfigInput = v.InferInput<typeof nuxeConfigSchema>