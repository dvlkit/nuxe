import { defineConfig } from '@dvlkit/nuxe'
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
