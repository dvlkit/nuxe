import * as v from 'valibot'
import type { UserConfig } from 'vite'

const nuxeConfigSchema = v.object({
  server: v.optional(
    v.object({
      port: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(65535))),
    }),
    {},
  ),
  vite: v.optional(v.custom<UserConfig>(() => true), {})
})

export const NuxeConfigSchema: typeof nuxeConfigSchema = nuxeConfigSchema

export type NuxeConfig = v.InferOutput<typeof nuxeConfigSchema>

export type NuxeConfigInput = v.InferInput<typeof nuxeConfigSchema>