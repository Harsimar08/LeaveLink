import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true,
    // Uploaded files are linked as relative /api/files/... URLs
    proxy: {
      '/api': 'http://localhost:5000'
    }
  }
})
