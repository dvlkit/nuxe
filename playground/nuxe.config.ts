import { defineConfig } from '@dvlkit/nuxe/config'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  runtimeConfig: {
    apiSecret: 'default-secret',
    public: {
      apiBase: '/api',
    },
  },
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})
