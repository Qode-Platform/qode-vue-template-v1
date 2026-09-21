import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vueDevTools from 'vite-plugin-vue-devtools'

// Fleet contract: nginx forwards the whole /direct/<agent>:<port> prefix
// UNCHANGED, so every route and asset must be served under $BASE_PATH. Vite
// bakes this in at BUILD time. Empty/unset => serve at the host root.
const raw = (process.env.BASE_PATH ?? '').trim()
const basePath = raw ? `/${raw.replace(/^\/+|\/+$/g, '')}` : ''

// https://vite.dev/config/
export default defineConfig({
  base: basePath ? `${basePath}/` : '/',
  plugins: [
    vue(),
    vueDevTools(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
