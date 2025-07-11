<template>
  <div class="p-8 md:p-10 max-w-4xl mx-auto">
    <header class="mb-6">
      <h1 class="font-extrabold text-security font-sans text-2xl md:text-3xl flex items-center gap-3">
        <span>About Security Console</span>
      </h1>
    </header>
    <div class="mt-4">
      <About />
    </div>
  </div>
</template>

<script setup>
import { useLayout } from '~/composables/useLayout';

// Use our layout composable to get responsive behavior
const { isSmallScreen } = useLayout();
</script>
