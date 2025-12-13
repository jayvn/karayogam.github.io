import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/choreo/',
  build: {
    outDir: '.',
    assetsDir: 'assets',
    emptyOutDir: false
  }
})
