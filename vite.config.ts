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
        name: 'Repuestos - App v4.9.94',
        short_name: 'Repuestos v4.9.94',
        description: 'Aplicación para gestión visual de repuestos multi-máquina',
        theme_color: '#1e40af',
        background_color: '#f8fafc',
        display: 'standalone',
        orientation: 'any',
        start_url: '/Repuestos-App/',
        scope: '/Repuestos-App/',
        icons: []
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // Firebase Storage (mapas/fotos): CacheFirst para PWA (más rápido y funciona offline con lo ya visitado)
            urlPattern: /^https:\/\/firebasestorage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'firebase-storage',
              cacheableResponse: {
                statuses: [0, 200]
              },
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 días
              }
            }
          },
          {
            // Algunos assets pueden venir de storage.googleapis.com según configuración
            urlPattern: /^https:\/\/storage\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gcs-storage',
              cacheableResponse: {
                statuses: [0, 200]
              },
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30
              }
            }
          }
        ],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024 // 5MB
      }
    })
  ],
  base: '/Repuestos-App/',
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
