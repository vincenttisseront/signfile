// This plugin registers Pinia for Nuxt 3
import { defineNuxtPlugin } from '#app'
import { createPinia } from 'pinia'

export default defineNuxtPlugin((nuxtApp) => {
  const pinia = createPinia()
  nuxtApp.vueApp.use(pinia)
})
