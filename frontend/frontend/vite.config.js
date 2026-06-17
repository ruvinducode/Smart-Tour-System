import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      '/tour': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      '/vehicles-test': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      '/seed-all-vehicles': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true,
      },
      '/register': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/login': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/account-role': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/driver': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/admin': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/notifications': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/booking': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/uploads': { target: 'http://127.0.0.1:5001', changeOrigin: true },
      '/osrm': {
        target: 'https://routing.openstreetmap.de/routed-car',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/osrm/, ''),
        headers: {
          'User-Agent': 'SmartTour/1.0 (https://github.com/ruvinducode/Smart-Tour-System)',
        },
      },
    },
  },
})
