<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { navigateTo } from '#app'
import { useOkta } from '@/composables/useOkta'

const error = ref<string | null>(null)
const loading = ref(true)
const message = ref('Processing login...')

onMounted(async () => {
  if (!process.client) return
  
  try {
    // Use the enhanced composable for better reliability
    const okta = useOkta()
    
    if (!okta) {
      console.error('[callback.vue] Okta instance is not available')
      error.value = 'Authentication service is not available'
      loading.value = false
      return
    }
    
    console.log('[callback.vue] Processing Okta callback...')
    
    // First check if we have a code parameter in the URL
    const hasAuthorizationCode = window.location.search.indexOf('code=') >= 0
    
    if (!hasAuthorizationCode) {
      error.value = 'No authorization code found in the URL'
      loading.value = false
      return
    }
    
    message.value = 'Exchanging authorization code for tokens...'
    
    // Handle the redirect to exchange the code for tokens
    // This is equivalent to okta.handleRedirect()
    try {
      await okta.token.parseFromUrl()
      
      // Verify tokens were obtained
      const tokens = await okta.tokenManager.getTokens()
      console.log('[callback.vue] Tokens received:', tokens)
      
      if (!tokens || Object.keys(tokens).length === 0) {
        throw new Error('No tokens received from authorization server')
      }
      
      message.value = 'Login successful! Redirecting...'
      
      // Give a moment for tokens to be properly stored
      setTimeout(() => {
        // Navigate back to main page
        navigateTo('/')
      }, 500)
      
    } catch (tokenErr) {
      console.error('[callback.vue] Token exchange error:', tokenErr)
      error.value = `Failed to exchange code for tokens: ${(tokenErr as Error).message}`
      loading.value = false
    }
  } catch (err) {
    console.error('[callback.vue] Login error:', err)
    error.value = `Login error: ${(err as Error).message}`
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-modernity p-4">
    <div class="layout-container">
      <div class="layout-card rounded-lg shadow-xl p-8 max-w-md mx-auto text-center">
        <h1 class="text-2xl font-bold text-security mb-6">Okta Authentication</h1>
        <div v-if="loading" class="flex flex-col items-center">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-currency mb-4"></div>
          <p class="text-modernity">{{ message }}</p>
        </div>
        <div v-else-if="error" class="bg-energy/10 p-4 rounded-lg border border-energy/30">
          <p class="mb-4 text-energy font-medium">{{ error }}</p>
          <button 
            @click="() => navigateTo('/')" 
            class="bg-security text-care hover:bg-currency hover:text-modernity transition-colors duration-200 rounded-lg px-4 py-2 font-medium"
          >
            Return to Home
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
