import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Baader 200 - Gestión de Repuestos',
        short_name: 'Baader200',
        description: 'Aplicación para gestión visual de repuestos Baader 200',
        theme_color: '#1e40af',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'any',
        start_url: '/Baader-200-Repuestos-app/',
        scope: '/Baader-200-Repuestos-app/',
        icons: []
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Ignorar Firebase Storage - no interceptar estas URLs
        navigateFallbackDenylist: [/^https:\/\/firebasestorage\.googleapis\.com/],
        runtimeCaching: [
          {
            // Firebase Storage - usar NetworkOnly para evitar problemas CORS
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'NetworkOnly'
          }
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB
      }
    })
  ],
  base: '/Baader-200-Repuestos-app/',
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
