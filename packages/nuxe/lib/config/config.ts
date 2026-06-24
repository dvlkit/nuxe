import * as v from 'valibot'
import { loadConfig } from 'c12'
import { NuxeConfigSchema, type NuxeConfig, type NuxeConfigInput } from './schema'

export const defineConfig = <T extends NuxeConfigInput>(config: T): T => config

export interface LoadNuxeConfigOptions {
  cwd: string
}

export type ResolvedNuxeConfig = Omit<NuxeConfig, 'server'> & {
  server: {
    port: number
  }
}

export async function loadNuxeConfig(opts: LoadNuxeConfigOptions): Promise<ResolvedNuxeConfig> {
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

  return {
    ...result.output,
    server: {
      port: resolvedPort,
    },
  }
}