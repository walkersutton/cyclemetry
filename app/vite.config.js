import path from 'path'
import { fileURLToPath } from 'url'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import tailwindcss from '@tailwindcss/vite'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export default defineConfig({
  base: './',
  plugins: [svelte(), tailwindcss()],
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    target: 'es2020',
    modulePreload: { polyfill: false },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
