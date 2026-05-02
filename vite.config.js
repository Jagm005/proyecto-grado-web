import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@assets': path.resolve(__dirname, 'assets'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: '_static',  // evita conflicto con la ruta SPA /assets
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://18.223.120.46:3000',
        changeOrigin: true,
      },
    },
  },
})
