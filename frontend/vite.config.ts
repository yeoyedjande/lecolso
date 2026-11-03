/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ mode }) => {
  const appEnv = loadEnv(mode, process.cwd(), 'VITE_').VITE_APP_ENV ?? process.env.VITE_APP_ENV
  // Page /design (design system) : en local et en staging seulement ; absente du build de production
  const designTools = appEnv === 'local' || appEnv === 'staging'

  return {
    plugins: [
      // Doit précéder le plugin React : génère src/routeTree.gen.ts depuis src/routes/
      tanstackRouter({ target: 'react', autoCodeSplitting: true }),
      react(),
      tailwindcss(),
      VitePWA({
        // Service worker écrit à la main (src/sw.ts) : réseau d'abord pour l'API, cache d'abord pour les assets
        strategies: 'injectManifest',
        srcDir: 'src',
        filename: 'sw.ts',
        registerType: 'autoUpdate',
        injectRegister: false,
        manifest: {
          name: 'Lecolso',
          short_name: 'Lecolso',
          lang: 'fr',
          start_url: '/',
          display: 'standalone',
          background_color: '#FBF8F3',
          theme_color: '#1B2559',
          icons: [{ src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
        },
        injectManifest: {
          globPatterns: ['**/*.{js,css,html,svg,png,webp,woff2}'],
        },
      }),
    ],
    resolve: {
      alias: [
        // Hors local et staging, la page /design est remplacée par un module vide : absente du build
        ...(designTools
          ? []
          : [
              {
                find: /^@\/features\/design\/DesignPage$/,
                replacement: fileURLToPath(
                  new URL('./src/features/design/DesignPage.production.tsx', import.meta.url),
                ),
              },
            ]),
        { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
      ],
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      env: {
        VITE_API_URL: 'http://api.test/api/v1',
        VITE_APP_ENV: 'local',
        VITE_DEMO_MODULES: 'true',
      },
    },
  }
})
