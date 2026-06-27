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
})

export const NuxeConfigSchema: typeof nuxeConfigSchema = nuxeConfigSchema

export type NuxeConfig = v.InferOutput<typeof nuxeConfigSchema>

export type NuxeConfigInput = v.InferInput<typeof nuxeConfigSchema>