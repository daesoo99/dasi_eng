import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { visualizer } from 'rollup-plugin-visualizer'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    visualizer({ 
      filename: 'stats.html', 
      template: 'treemap',
      gzipSize: true,
      brotliSize: true
    })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3500,
    host: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore'],
          utils: ['axios', 'zustand']
        }
      }
    }
  },
})