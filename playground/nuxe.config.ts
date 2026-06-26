import { defineConfig } from '@dvlkit/nuxe'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  vite: {
    plugins: [
      tailwindcss(),
    ],
  },
})
