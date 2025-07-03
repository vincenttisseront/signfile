
<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useOkta } from '@/composables/useOkta'

const error = ref<string | null>(null)
const loading = ref(true)

onMounted(async () => {
  if (!process.client) return

  const oktaAuth = useOkta()
  if (!oktaAuth) {
    error.value = 'Authentication service is not available'
    loading.value = false
    return
  }

  try {
    // This will handle the authorization code (PKCE) flow
    // Note: parseFromUrl() will exchange the code for tokens automatically
    const tokens = await oktaAuth.token.parseFromUrl()
    if (tokens && tokens.tokens) {
      if (tokens.tokens.idToken) {
        await oktaAuth.tokenManager.add('idToken', tokens.tokens.idToken)
      }
      if (tokens.tokens.accessToken) {
        await oktaAuth.tokenManager.add('accessToken', tokens.tokens.accessToken)
      }
      // Success! Redirect to home
      window.location.replace('/')
      return
    }
    error.value = 'No tokens found in callback. Check URL parameters for authorization code.'
    console.error('Callback error: No tokens returned from parseFromUrl()')
    // Log URL params for debugging (without the code for security)
    const urlParams = new URLSearchParams(window.location.search)
    const hasCode = urlParams.has('code')
    const hasError = urlParams.has('error')
    console.log('URL has code parameter:', hasCode)
    if (hasError) {
      console.error('Error in URL:', urlParams.get('error'))
      console.error('Error description:', urlParams.get('error_description'))
      error.value = `Authentication error: ${urlParams.get('error')} - ${urlParams.get('error_description')}`
    }
    loading.value = false
  } catch (err) {
    // If already authenticated, just redirect
    try {
      const authState = await oktaAuth.authStateManager.getAuthState()
      if (authState?.isAuthenticated) {
        window.location.replace('/')
        return
      }
    } catch (stateErr) {
      console.error('Error checking auth state:', stateErr)
    }
    console.error('Authentication error:', err)
    error.value = 'Authentication failed: ' + (err as Error).message
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
          <p class="text-modernity">Authenticating, please wait...</p>
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
