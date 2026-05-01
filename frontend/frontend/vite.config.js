import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
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
