// Force rebuild on each Docker build with this timestamp
const BUILD_TIMESTAMP = Date.now().toString();

export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss'
  ],
  tailwindcss: {
    configPath: '~/tailwind.config.ts',
    exposeConfig: true,
    viewer: false,
    cssPath: '~/assets/css/main.css',
  },
  css: [
    // Main CSS file (contains all styles)
    '@/assets/css/main.css'
  ],
  build: {
    transpile: ['node-forge'], // if using it
  },
  nitro: {
    compatibilityDate: '2025-06-20'
  },
  app: {
    head: {
      title: 'iBanFirst - Signing App',
      htmlAttrs: {
        lang: 'en'
      },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#140309' }, // modernity color
        { name: 'color-scheme', content: 'light' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        // Preconnect to improve performance
        { rel: 'preconnect', href: process.env.OKTA_ISSUER || '' }
      ]
    },
    // Enhanced page transitions to prevent layout shifts
    pageTransition: { 
      name: 'page',
      mode: 'out-in'
    }
  },
  // Improve hydration
  experimental: {
    renderJsonPayloads: true
  },
  runtimeConfig: {
    public: {
      oktaIssuer: process.env.OKTA_ISSUER,
      oktaClientId: process.env.OKTA_CLIENT_ID
    }
  }
})
