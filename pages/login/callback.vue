<script setup lang="ts">
const error = ref<string | null>(null)
const loading = ref(true)

onMounted(async () => {
  const oktaAuth = useOkta()
  if (!oktaAuth) {
    error.value = 'Authentication service is not available'
    loading.value = false
    return
  }

  try {
    const tokens = await oktaAuth.token.parseFromUrl()
    if (tokens?.tokens) {
      if (tokens.tokens.idToken) {
        await oktaAuth.tokenManager.add('idToken', tokens.tokens.idToken)
      }
      if (tokens.tokens.accessToken) {
        await oktaAuth.tokenManager.add('accessToken', tokens.tokens.accessToken)
      }
      return navigateTo('/', { replace: true })
    }

    const urlParams = new URLSearchParams(window.location.search)
    if (urlParams.has('error')) {
      error.value = `Authentication error: ${urlParams.get('error')} - ${urlParams.get('error_description')}`
    } else {
      error.value = 'No tokens found in callback.'
    }
    loading.value = false
  } catch (err) {
    try {
      const authState = await oktaAuth.authStateManager.getAuthState()
      if (authState?.isAuthenticated) {
        return navigateTo('/', { replace: true })
      }
    } catch { /* ignore */ }
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
