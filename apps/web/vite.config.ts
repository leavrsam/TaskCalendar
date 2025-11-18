import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@taskcalendar/core': fileURLToPath(
        new URL('../../packages/core/src', import.meta.url),
      ),
      '@taskcalendar/design-tokens': fileURLToPath(
        new URL('../../packages/design-tokens/src', import.meta.url),
      ),
    },
  },
})
