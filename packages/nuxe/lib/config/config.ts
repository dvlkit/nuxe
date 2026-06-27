import * as v from 'valibot'
import { NuxeConfigSchema, type NuxeConfig, type NuxeConfigInput } from './schema'
import { resolveRuntimeConfig, type RuntimeConfig } from './runtime-config'

export const defineConfig = <T extends NuxeConfigInput>(config: T): T => config

export interface LoadNuxeConfigOptions {
  cwd: string
}

export type ResolvedNuxeConfig = Omit<NuxeConfig, 'server' | 'runtimeConfig'> & {
  server: {
    port: number
  }
  runtimeConfig: RuntimeConfig
  runtimeConfigInput: RuntimeConfig
}

export async function loadNuxeConfig(opts: LoadNuxeConfigOptions): Promise<ResolvedNuxeConfig> {
  const { loadConfig } = await import('c12')

  const { config } = await loadConfig<NuxeConfigInput>({
    cwd: opts.cwd,
    name: 'nuxe',
    configFile: 'nuxe.config',
    rcFile: false,
    globalRc: false,
    packageJson: false,
    dotenv: false,
  })

  const result = v.safeParse(NuxeConfigSchema, config ?? {})
  if (!result.success) {
    const issues = result.issues
      .map((i) => `  - ${v.getDotPath(i) || `<root>`}: ${i.message}`)
      .join('\n')
    throw new Error(`Invalid nuxe config:\n${issues}`)
  }

  const envPort = process.env.PORT ? Number(process.env.PORT) : undefined
  const resolvedPort = result.output.server.port ?? envPort ?? 3000
  const runtimeConfigInput = result.output.runtimeConfig as RuntimeConfig
  const runtimeConfig = resolveRuntimeConfig(runtimeConfigInput)

  return {
    ...result.output,
    server: {
      port: resolvedPort,
    },
    runtimeConfig,
    runtimeConfigInput,
  }
}