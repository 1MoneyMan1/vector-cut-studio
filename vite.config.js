import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// IMPORTANT for GitHub Pages:
// If you deploy to https://<user>.github.io/<repo>/ set base to '/<repo>/'.
// For a user/organization root page (https://<user>.github.io/) use '/'.
// You can also override at build time:  VITE_BASE=/my-repo/ npm run build
export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE || '/vector-cut-studio/',
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 2000,
  },
})
