<template>
  <div class="bg-care text-modernity min-h-screen">
    <NuxtRouteAnnouncer />
    <NuxtPage />
    <LayoutDebug v-if="isDev" />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import LayoutDebug from '~/components/LayoutDebug.vue';

// Check if we're in development mode
const isDev = computed(() => process.env.NODE_ENV === 'development');

// Optimize loading performance and prevent layout shifts
useHead({
  link: [
    // Preload key assets to prevent layout shifts
    { rel: 'preload', href: '/favicon.ico', as: 'image' }
  ],
  script: [
    // Prevent Flash Of Unstyled Content (FOUC)
    { children: `
      (function() {
        document.documentElement.classList.add('js-loaded');
        
        // Mark when DOM is loaded to trigger smoother transitions
        document.addEventListener('DOMContentLoaded', function() {
          document.documentElement.classList.add('dom-loaded');
        });
        
        // Use Content-Visibility optimization for offscreen content
        if ('IntersectionObserver' in window) {
          const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
              if (entry.target.classList.contains('optimize-render')) {
                if (entry.isIntersecting) {
                  entry.target.style.contentVisibility = 'auto';
                } else {
                  entry.target.style.contentVisibility = 'hidden';
                }
              }
            });
          });
          
          // Observe elements when the DOM is fully loaded
          window.addEventListener('load', () => {
            document.querySelectorAll('.optimize-render').forEach(el => {
              observer.observe(el);
            });
          });
        }
      })();
    `, type: 'text/javascript' }
  ],
  // Add CSS variables for consistent layout
  style: [
    { children: `
      :root {
        --content-max-width: 1024px;
        --content-min-height: 700px;
        --page-padding: 2rem;
        --section-spacing: 2rem;
        --form-max-width: 650px;
        --card-radius: 1rem;
        --transition-speed: 200ms;
      }
    `, type: 'text/css' }
  ]
})
</script>

<!-- All styles moved to utilities.css for better Tailwind integration -->
