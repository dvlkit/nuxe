import {
  resolveRuntimeConfig,
  injectRuntimeConfigFromEnv,
  NUXE_RESERVED_ENV,
  camelToUpperSnake,
  type RuntimeConfig,
} from '../config/runtime-config'

export {
  resolveRuntimeConfig,
  injectRuntimeConfigFromEnv,
  NUXE_RESERVED_ENV,
  camelToUpperSnake,
}

export function loadRuntimeConfig(inputConfig: RuntimeConfig = {public: {}}): RuntimeConfig {
  return resolveRuntimeConfig(inputConfig)
}