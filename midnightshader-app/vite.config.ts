import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkgPath = fileURLToPath(new URL('./package.json', import.meta.url))
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string }

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  // Eigener Port: 5173 ist oft schon von anderen Vite-Projekten belegt.
  server: {
    port: 5183,
    strictPort: true,
    host: true,
  },
  preview: {
    port: 5183,
    strictPort: true,
    host: true,
  },
})
