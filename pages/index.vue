<template>
  <div class="p-8 md:p-10 max-w-4xl mx-auto">
   
    <!-- Sign file content -->
    <div class="mt-4">
      <SignFile />
    </div>

  </div>
</template>

<script setup>
import { ref } from 'vue';
import SignFile from '~/components/SignFile.vue';
import DownloadDiagnostic from '~/components/DownloadDiagnostic.vue';
import TroubleshootingResources from '~/components/TroubleshootingResources.vue';
import { useLayout } from '~/composables/useLayout';

// Use our layout composable to get responsive behavior
const { isSmallScreen, screenWidth } = useLayout();
</script>
