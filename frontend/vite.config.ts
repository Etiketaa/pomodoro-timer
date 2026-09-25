import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  build: {
    // El build sale directo a public/ en la raíz del repo, que es lo que
    // sirven tanto Vercel como api/index.py en local. public/ es 100%
    // generado: los assets authored viven en frontend/public/ (publicDir).
    outDir: '../public',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      // Reenvía las llamadas /api/* al backend Flask local (api/index.py)
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
})