export default defineNuxtConfig({
  modules: [
    '@nuxtjs/tailwindcss'
  ],
  css: ['@/assets/css/tailwind.css'],
  build: {
    transpile: ['node-forge'], // if using it
  },
  nitro: {
    compatibilityDate: '2025-06-20'
  },
  app: {
    head: {
      title: 'iBanFirst - Signing App'
    }
  },
  runtimeConfig: {
    public: {
      oktaIssuer: process.env.OKTA_ISSUER,
      oktaClientId: process.env.OKTA_CLIENT_ID
    }
  }
})
