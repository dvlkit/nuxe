import type {UserConfig} from 'vite'

export interface AutoImportEntry {
  from: string
  names: string[]
}

export interface VirixConfig {
  port?: number
  vite?: UserConfig,
  autoImport?: AutoImportEntry[]
}

export function defineConfig(config: VirixConfig): VirixConfig {
  return config
}
