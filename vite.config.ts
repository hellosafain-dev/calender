import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(() => {
  return {
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        injectRegister: 'auto',
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'icons/*.png',
        ],
        manifest: {
          name: 'My Calender',
          short_name: 'My Calender',
          description: 'Your private digital memory garden. Every memory becomes a flower.',
          theme_color: '#EC708B',
          background_color: '#0D0D0D',
          display: 'standalone',
          display_override: ['standalone', 'minimal-ui'],
          orientation: 'portrait-primary',
          scope: '/',
          start_url: '/',
          id: '/',
          lang: 'en',
          icons: [
            {
              src: '/icons/icon-192.png?v=6',
              sizes: '192x192',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-384.png?v=6',
              sizes: '384x384',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-512.png?v=6',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'any',
            },
            {
              src: '/icons/icon-512-maskable.png?v=6',
              sizes: '512x512',
              type: 'image/png',
              purpose: 'maskable',
            },
          ],
          categories: ['lifestyle', 'productivity'],
          shortcuts: [
            {
              name: 'Calendar View',
              short_name: 'Calendar',
              description: 'Open memory calendar',
              url: '/?tab=0',
              icons: [{ src: '/icons/icon-192.png?v=6', sizes: '192x192' }],
            },
            {
              name: 'Timeline',
              short_name: 'Timeline',
              description: 'Browse memory timeline',
              url: '/?tab=1',
              icons: [{ src: '/icons/icon-192.png?v=6', sizes: '192x192' }],
            },
            {
              name: 'Reminders',
              short_name: 'Reminders',
              description: 'View reminders',
              url: '/?tab=2',
              icons: [{ src: '/icons/icon-192.png?v=6', sizes: '192x192' }],
            },
          ],
          related_applications: [],
          prefer_related_applications: false,
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,webp}'],
          cleanupOutdatedCaches: true,
          skipWaiting: true,
          clientsClaim: true,
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/picsum\.photos\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'memory-images-cache',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/images\.unsplash\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'unsplash-images-cache',
                expiration: {
                  maxEntries: 50,
                  maxAgeSeconds: 60 * 60 * 24 * 30,
                },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /\/api\/memories/i,
              handler: 'NetworkFirst',
              options: {
                cacheName: 'api-memories',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 5,
                },
                networkTimeoutSeconds: 10,
              },
            },
          ],
        },
        devOptions: {
          enabled: true,       // ← Enable in dev so you can test install prompt
          type: 'module',
          navigateFallback: '/',
        },
      }),
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
