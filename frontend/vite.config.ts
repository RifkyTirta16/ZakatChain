import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/react-router')) {
            return 'vendor-react'
          }
          if (id.includes('/wagmi/') || id.includes('/viem/') || id.includes('/@wagmi/')) {
            return 'vendor-web3'
          }
          if (id.includes('/@tanstack/')) {
            return 'vendor-query'
          }
          if (id.includes('/lucide-react/')) {
            return 'vendor-icons'
          }
          if (id.includes('/leaflet/') || id.includes('/react-leaflet/')) {
            return 'vendor-map'
          }
          if (id.includes('/recharts/') || id.includes('/d3-') || id.includes('/victory-vendor/')) {
            return 'vendor-charts'
          }
          return 'vendor-misc'
        },
      },
    },
  },
})
