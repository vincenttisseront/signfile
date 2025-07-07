<template>
  <div>
    <Admin />
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue';

import { useOkta } from '@/composables/useOkta';
const okta = useOkta();

// Track authentication state
const isAuthenticated = ref(false);
const isLocalAdminAuthenticated = ref(false);

// Check if local admin is authenticated
const checkLocalAdmin = () => {
  if (typeof window !== 'undefined') {
    isLocalAdminAuthenticated.value = localStorage.getItem('signfile_local_admin_auth') === 'true';
  }
};

// Add/remove class based on authentication state
onMounted(async () => {
  // Check Okta auth state
  if (okta) {
    try {
      const authState = await okta.authStateManager.getAuthState();
      isAuthenticated.value = authState?.isAuthenticated || false;
    } catch (err) {
      console.error('[admin.vue] Error getting auth state:', err);
    }
  }
  
  // Check local admin auth
  checkLocalAdmin();
  
  // Get section parameter from URL if available
  // Get section parameter from URL safely
  try {
    if (typeof window !== 'undefined' && window.location && window.location.search) {
      const urlParams = new URLSearchParams(window.location.search);
      const section = urlParams.get('section');
      
      // Pass the section to the Admin component if needed
      if (section) {
        // Set section directly on window to avoid event dispatch issues
        window._adminSection = section;
        
        // Also use custom event as backup approach
        window.dispatchEvent(new CustomEvent('admin_section_change', { 
          detail: { section } 
        }));
        
        console.log('[admin.vue] Set active section:', section);
      }
    }
  } catch (err) {
    console.error('[admin.vue] Error setting section:', err);
  }
  
  // Watch for authentication changes
  window.addEventListener('signfile_auth_change', () => {
    checkLocalAdmin();
  });
});

// Clean up event listeners when component is destroyed
onBeforeUnmount(() => {
  window.removeEventListener('signfile_auth_change', checkLocalAdmin);
});
</script>

// Declare window interface for TypeScript
declare global {
  interface Window {
    _adminSection?: string;
  }
}
