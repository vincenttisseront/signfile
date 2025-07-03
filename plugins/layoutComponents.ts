// Global layout components registration
import { defineNuxtPlugin } from '#app'
import PageLayout from '~/components/layouts/PageLayout.vue'

export default defineNuxtPlugin((nuxtApp) => {
  // Register layout components globally
  nuxtApp.vueApp.component('PageLayout', PageLayout);
});
