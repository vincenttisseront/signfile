
export default defineNuxtConfig({
  compatibilityDate: '2025-06-20',

  modules: [
    '@nuxtjs/tailwindcss',
    '@pinia/nuxt'
  ],

  tailwindcss: {
    configPath: '~/tailwind.config.ts',
    cssPath: '~/assets/css/main.css',
  },

  build: {
    transpile: ['node-forge'],
  },

  app: {
    head: {
      title: 'iBanFirst - Signing App',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'theme-color', content: '#140309' },
        { name: 'color-scheme', content: 'light' }
      ],
      link: [
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' }
      ]
    },
    pageTransition: {
      name: 'page',
      mode: 'out-in'
    }
  },

  runtimeConfig: {
    public: {
      oktaIssuer: process.env.OKTA_ISSUER,
      oktaClientId: process.env.OKTA_CLIENT_ID
    }
  }
})
