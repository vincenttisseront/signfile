<template>
  <div class="fixed bottom-4 right-4 bg-security/80 text-care p-2 rounded-lg text-xs z-50 shadow-lg" v-if="isVisible">
    <div class="flex items-center justify-between mb-1">
      <span class="font-bold">Layout Debug</span>
      <button @click="isVisible = false" class="ml-2 px-1 hover:bg-security/50 rounded">×</button>
    </div>
    <div class="space-y-1">
      <div><strong>Screen:</strong> {{ screenWidth }}×{{ screenHeight }}px</div>
      <div><strong>Breakpoint:</strong> {{ currentBreakpoint }}</div>
      <div><strong>Content Class:</strong> <code>{{ contentClass }}</code></div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useLayout } from '~/composables/useLayout';

const props = defineProps({
  show: {
    type: Boolean,
    default: process.env.NODE_ENV === 'development'
  }
});

const isVisible = ref(props.show);
const { screenWidth, screenHeight, currentBreakpoint, contentClass } = useLayout();
</script>
