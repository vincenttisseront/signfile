<template>
  <div class="page-container" :class="[contentClass, { 'admin-mode': isAdminPage }]" ref="layoutRef">
    <div class="page-content" :style="{maxWidth: containerWidth}">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { useLayout } from '~/composables/useLayout';
import { ref, onMounted, onBeforeUnmount, computed } from 'vue';
import { useRoute } from 'vue-router';

// Use our layout composable to get responsive behavior
const { contentClass, containerWidth, isSmallScreen, isMediumScreen, updateLayout } = useLayout();

// Check if we're on an admin page
const route = useRoute();
const isAdminPage = computed(() => route.path.includes('/admin'));

// Component element ref
const layoutRef = ref(null);

// Make layout adjustments when mounted
onMounted(() => {
  // Apply any specific layout adjustments if needed
  if (isAdminPage.value) {
    document.body.classList.add('admin-layout');
  }
  
  // Force layout update after component is mounted
  setTimeout(() => {
    updateLayout();
  }, 100);
  
  // Update layout on resize
  window.addEventListener('resize', updateLayoutOnResize);
});

// Clean up event listener
onBeforeUnmount(() => {
  window.removeEventListener('resize', updateLayoutOnResize);
  
  // Remove admin layout class if it was added
  if (isAdminPage.value) {
    document.body.classList.remove('admin-layout');
  }
});

// Debounced update function
const updateLayoutOnResize = debounce(() => {
  updateLayout();
}, 100);

// Debounce helper
function debounce(fn, delay) {
  let timeoutId;
  return function(...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), delay);
  };
}
</script>


