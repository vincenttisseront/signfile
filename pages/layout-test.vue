<template>
  <div class="min-h-screen bg-security/5 p-4">
    <div class="layout-container">
      <div class="layout-card p-6">
        <h1 class="text-2xl font-bold text-security mb-4">Layout System Test</h1>
        
        <div class="mb-6 p-4 border border-security/20 rounded-lg">
          <h2 class="text-lg font-medium text-security mb-2">Current Layout Information</h2>
          <ul class="space-y-2">
            <li><strong>Screen Width:</strong> {{ screenWidth }}px</li>
            <li><strong>Screen Height:</strong> {{ screenHeight }}px</li>
            <li><strong>Breakpoint:</strong> {{ currentBreakpoint }}</li>
            <li><strong>Content Class:</strong> {{ contentClass }}</li>
            <li><strong>Is Small Screen:</strong> {{ isSmallScreen }}</li>
            <li><strong>Is Medium Screen:</strong> {{ isMediumScreen }}</li>
            <li><strong>Is Large Screen:</strong> {{ isLargeScreen }}</li>
          </ul>
        </div>
        
        <div class="flex justify-center">
          <button @click="$router.push('/')" class="btn btn-primary">
            Return to Home
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useLayout } from '~/composables/useLayout';

// Get layout information using our composable
const { 
  isSmallScreen,
  isMediumScreen, 
  isLargeScreen,
  screenWidth,
  screenHeight,
  contentClass,
  currentBreakpoint,
  updateLayout
} = useLayout();
</script>
