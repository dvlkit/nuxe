import type { NuxeConfigInput } from './schema'

export const defineConfig = <T extends NuxeConfigInput>(config: T): T => config

export { NuxeConfigSchema } from './schema'
export type { NuxeConfig, NuxeConfigInput } from './schema'