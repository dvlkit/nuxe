import * as v from 'valibot'
import type { UserConfig } from 'vite'

const AutoImportEntrySchema = v.object({
  from: v.string(),
  names: v.array(v.string())
})

export const NuxeConfigSchema = v.object({
  server: v.optional(
    v.object({
      port: v.optional(v.pipe(v.number(), v.minValue(1), v.maxValue(65535))),
    }),
    {},
  ),
  vite: v.optional(v.custom<UserConfig>(() => true), {}),
  autoImport: v.optional(v.array(AutoImportEntrySchema), [])
})

export type NuxeConfig = v.InferOutput<typeof NuxeConfigSchema>

export type NuxeConfigInput = v.InferInput<typeof NuxeConfigSchema>