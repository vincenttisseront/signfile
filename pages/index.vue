<template>
  <div class="p-8 md:p-10 max-w-4xl mx-auto">
   
    <!-- Sign file content -->
    <div class="mt-4">
      <SecurityConsole />
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue';
import SecurityConsole from '~/components/SecurityConsole.vue';
import { useLayout } from '~/composables/useLayout';

// Use our layout composable to get responsive behavior
const { isSmallScreen, screenWidth } = useLayout();

// Sample logs for demonstration
const logs = ref('Initializing digital signature tool...\nReady to sign documents.\nLoading cryptographic modules...\nSystem ready.');
</script>
