import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/auth': 'http://localhost:3000',
      '/olympiads': 'http://localhost:3000',
      '/tasks': 'http://localhost:3000',
      '/submissions': 'http://localhost:3000',
      '/admin': 'http://localhost:3000',
    },
  },
})
