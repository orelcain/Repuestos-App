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
        name: 'Repuestos - App v4.9.82',
        short_name: 'Repuestos v4.9.82',
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
  base: '/Repuestos-App/',
  resolve: {
    alias: {
      '@': '/src'
    }
  }
})
