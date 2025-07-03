<template>
  <div class="page-container" :class="contentClass">
    <div class="page-content" :style="{maxWidth: containerWidth}">
      <slot></slot>
    </div>
  </div>
</template>

<script setup>
import { useLayout } from '~/composables/useLayout';

// Use our layout composable to get responsive behavior
const { contentClass, containerWidth } = useLayout();
</script>

<style scoped>
.page-container {
  width: 100%;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--page-padding, 2rem);
  transition: padding 0.2s ease;
}

.page-content {
  width: 100%;
  min-height: var(--content-min-height, 700px);
  margin: 0 auto;
  position: relative;
  transition: max-width 0.2s ease;
}

/* Responsive classes applied based on screen size */
.layout-content-mobile {
  padding: 1rem 0.5rem;
}

.layout-content-tablet {
  padding: 1.5rem;
}

.layout-content-desktop {
  padding: 2rem;
}
</style>
