// composables/useAppVersion.ts
import { ref, readonly, computed } from 'vue'
import { useNuxtApp } from '#app'
import pkg from '../package.json'

// Create a constant value for the version
// This ensures we have a reliable value even before plugins load
const APP_VERSION = pkg.version || '1.0.7'

// Export a composable that provides access to the version
export function useAppVersion() {
  // Create a computed value for the version - makes it reactive if it ever needs to change
  const version = computed(() => APP_VERSION)

  // Return a readonly version to prevent unintended modifications
  return {
    version: readonly(version),
    // Helper function to format the version with a 'v' prefix
    formattedVersion: () => `v${version.value}`,
    // Helper function for displaying in the UI
    versionWithLabel: () => `Version ${version.value}`,
  }
}
