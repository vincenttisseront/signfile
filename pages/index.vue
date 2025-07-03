<template>
  <div class="p-8 md:p-10 max-w-4xl mx-auto">
    <header class="mb-6">
      <h1 class="font-extrabold text-security font-sans flex items-center gap-3 h-[40px]" 
          :class="{'text-3xl': !isSmallScreen, 'text-2xl': isSmallScreen, 'flex-col items-start': isSmallScreen && screenWidth < 400}">
        <span class="text-security">Digital Signature Tool</span>
        <span class="text-sm font-normal text-currency bg-security/10 px-3 py-1 rounded-full">v1.0.5</span>
      </h1>
    </header>
    
    <!-- Sign file content -->
    <div class="mt-4">
      <UploadForm />
    </div>

    <!-- Logs below the form -->
    <div class="mt-8">
      <label class="form-label mb-2" for="logs">System Logs</label>
      <textarea
        id="logs"
        class="form-input font-mono text-sm"
        style="min-height: 120px"
        rows="5"
        readonly
      >{{ logs }}</textarea>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useLayout } from '~/composables/useLayout';

// Use our layout composable to get responsive behavior
const { isSmallScreen, screenWidth } = useLayout();

// Sample logs for demonstration
const logs = ref('Initializing digital signature tool...\nReady to sign documents.\nLoading cryptographic modules...\nSystem ready.');
</script>
