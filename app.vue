<template>
  <div class="app-container text-modernity">
    <!-- Sidebar Menu -->
    <aside class="sidebar" :class="{ 'open': isSidebarOpen }">
      <div class="sidebar-logo">
        <span class="text-xl font-bold text-security">SignFile</span>
      </div>
      <nav class="flex flex-col h-[calc(100%-70px)]">
        <div class="flex-grow">
          <NuxtLink to="/" class="menu-item" active-class="active">
            <span class="menu-icon">📝</span>
            <span>Sign File</span>
          </NuxtLink>
          <NuxtLink to="/about" class="menu-item" active-class="active">
            <span class="menu-icon">ℹ️</span>
            <span>About</span>
          </NuxtLink>
          <NuxtLink to="/admin" class="menu-item" active-class="active">
            <span class="menu-icon">⚙️</span>
            <span>Admin</span>
          </NuxtLink>
        </div>
        <div class="mt-auto pt-4 text-xs text-center text-modernity-50 border-t border-security-10">
          &copy; {{ new Date().getFullYear() }} SignFile<br>
          iBanFirst - All Rights Reserved
        </div>
      </nav>
    </aside>

    <!-- Main Content Area -->
    <main class="main-content">
      <button v-if="isSmallScreen" class="menu-toggle" @click="toggleSidebar">
        ☰
      </button>
      <NuxtRouteAnnouncer />
      <NuxtPage />
      <LayoutDebug v-if="isDev" />
    </main>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import LayoutDebug from '~/components/LayoutDebug.vue';
import { useLayout } from '~/composables/useLayout';

// Use our layout composable to get responsive behavior
const { isSmallScreen } = useLayout();

// Sidebar toggle state
const isSidebarOpen = ref(false);

// Toggle sidebar function for mobile view
const toggleSidebar = () => {
  isSidebarOpen.value = !isSidebarOpen.value;
};

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
