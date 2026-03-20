<template>
  <div class="p-4 rounded-lg border border-security-20 bg-care shadow-sm">
    <h2 class="text-xl font-semibold mb-4 text-security border-b border-security-30 pb-2">Application Configuration</h2>

    <!-- Okta Configuration Section -->
    <div class="mb-8">
      <h3 class="text-lg text-security font-medium mb-3">Okta Authentication Settings</h3>

      <div class="bg-security-5 p-4 rounded-lg mb-4">
        <p class="text-sm text-modernity-80 mb-2">
          Current Okta configuration is loaded from environment variables. Changes made here will be stored in the browser
          and will override environment variables until the browser is refreshed or the page is reloaded.
        </p>
      </div>

      <form @submit.prevent="handleSaveConfig" class="space-y-4">
        <div class="space-y-2">
          <label for="oktaIssuer" class="block text-sm font-medium text-security">Okta Issuer URL</label>
          <input
            id="oktaIssuer"
            v-model="localConfig.issuer"
            type="text"
            placeholder="https://your-org.okta.com/oauth2/default"
            class="w-full px-3 py-2 border border-security-30 rounded-lg bg-care text-modernity focus:ring-2 focus:ring-security focus:border-security outline-none"
          />
          <p class="text-xs text-modernity-70">The base URL for your Okta organization with /oauth2/default</p>
        </div>

        <div class="space-y-2">
          <label for="oktaClientId" class="block text-sm font-medium text-security">Okta Client ID</label>
          <input
            id="oktaClientId"
            v-model="localConfig.clientId"
            type="text"
            placeholder="0oa1234567890abcDEF"
            class="w-full px-3 py-2 border border-security-30 rounded-lg bg-care text-modernity focus:ring-2 focus:ring-security focus:border-security outline-none"
          />
          <p class="text-xs text-modernity-70">The Client ID from your Okta application</p>
        </div>

        <div class="space-y-2">
          <label for="oktaRedirectUri" class="block text-sm font-medium text-security">Redirect URI</label>
          <input
            id="oktaRedirectUri"
            v-model="localConfig.redirectUri"
            type="text"
            :placeholder="props.oktaRedirectUriPlaceholder"
            class="w-full px-3 py-2 border border-security-30 rounded-lg bg-care text-modernity focus:ring-2 focus:ring-security focus:border-security outline-none"
          />
          <p class="text-xs text-modernity-70">The callback URL registered in your Okta application</p>
        </div>

        <div class="space-y-2">
          <label class="block text-sm font-medium text-security">Authentication Flow</label>
          <div class="flex gap-4">
            <label class="inline-flex items-center">
              <input type="radio" v-model="localConfig.useImplicit" :value="false" class="text-security focus:ring-security" />
              <span class="ml-2">Authorization Code with PKCE (Recommended)</span>
            </label>
            <label class="inline-flex items-center">
              <input type="radio" v-model="localConfig.useImplicit" :value="true" class="text-security focus:ring-security" />
              <span class="ml-2">Implicit Flow</span>
            </label>
          </div>
        </div>

        <div class="pt-4 flex gap-3">
          <button type="submit" class="btn btn-primary btn-md" :disabled="props.savingOktaConfig">
            <span v-if="!props.savingOktaConfig">Save Configuration</span>
            <span v-else class="flex items-center gap-2">
              <span class="inline-block h-4 w-4 border-2 border-t-transparent border-care animate-spin rounded-full"></span>
              Saving...
            </span>
          </button>
          <button type="button" @click="handleResetConfig" class="btn btn-outline btn-md">
            Reset to Defaults
          </button>
        </div>

        <div v-if="props.configSaveSuccess" class="p-3 rounded-lg bg-currency-10 border border-currency text-currency">
          ✅ Configuration saved successfully. You'll need to log in again with the new settings.
        </div>
        <div v-if="props.configSaveError" class="p-3 rounded-lg bg-energy-10 border border-energy text-energy">
          ❌ Error saving configuration: {{ props.configSaveError }}
        </div>
      </form>

      <!-- Current Auth State -->
      <div class="mt-6 border-t border-security-10 pt-4">
        <h4 class="text-sm font-medium text-security mb-2">Current Authentication State</h4>
        <div class="bg-security-5 p-3 rounded-lg text-sm">
          <div class="mb-2 space-y-1">
            <div class="flex items-center">
              <span class="font-semibold mr-2">Authentication Method:</span>
              <span v-if="props.isAuthenticated" class="bg-currency-20 text-currency px-2 py-0.5 rounded flex items-center">
                <span class="mr-1">Okta</span> ✅
              </span>
              <span v-else-if="props.isLocalAdminAuthenticated" class="bg-currency-20 text-currency px-2 py-0.5 rounded flex items-center">
                <span class="mr-1">Local Admin</span> ✅
              </span>
              <span v-else class="bg-energy-20 text-energy px-2 py-0.5 rounded flex items-center">
                <span class="mr-1">None</span> ❌
              </span>
            </div>
            <p v-if="props.user?.name || props.user?.email"><span class="font-semibold">User:</span> {{ props.user.name || props.user.email }}</p>
            <p v-if="props.isLocalAdminAuthenticated && !props.isAuthenticated"><span class="font-semibold">User:</span> Local Admin</p>
            <p v-if="props.isAuthenticated"><span class="font-semibold">Auth Flow:</span> {{ localConfig.useImplicit ? 'Implicit' : 'Authorization Code (PKCE)' }}</p>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-3">
          <button
            @click="emit('testOktaConnection')"
            class="btn btn-secondary btn-sm"
            :disabled="props.testingConnection"
          >
            <span v-if="!props.testingConnection">Test Okta Connection</span>
            <span v-else class="flex items-center gap-2">
              <span class="inline-block h-4 w-4 border-2 border-t-transparent border-care animate-spin rounded-full"></span>
              Testing...
            </span>
          </button>

          <div class="flex gap-2">
            <button
              v-if="props.isAuthenticated"
              @click="emit('logout')"
              class="btn btn-outline btn-sm"
            >
              Log Out (Okta)
            </button>
            <button
              v-else
              @click="emit('loginWithOkta')"
              class="btn btn-outline btn-sm"
            >
              Log In with Okta
            </button>
            <button
              v-if="props.isLocalAdminAuthenticated"
              @click="emit('logoutLocalAdmin')"
              class="btn btn-outline btn-sm"
            >
              Log Out (Local Admin)
            </button>
          </div>

          <div v-if="props.isLocalAdminAuthenticated" class="w-full mt-2">
            <button
              @click="emit('regenerateAdminPassword')"
              class="text-xs text-security-70 hover-text-security"
            >
              Regenerate local admin password
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  user: Record<string, any>
  isAuthenticated: boolean
  isLocalAdminAuthenticated: boolean
  oktaConfig: { issuer: string; clientId: string; redirectUri: string; useImplicit: boolean }
  configSaveSuccess: boolean
  configSaveError: string | null
  testingConnection: boolean
  savingOktaConfig: boolean
  oktaRedirectUriPlaceholder: string
}>()

const emit = defineEmits<{
  saveOktaConfig: [config: any]
  resetOktaConfig: []
  testOktaConnection: []
  loginWithOkta: []
  logout: []
  logoutLocalAdmin: []
  regenerateAdminPassword: []
}>()

const localConfig = reactive({
  issuer: '',
  clientId: '',
  redirectUri: '',
  useImplicit: false
})

onMounted(() => {
  loadOktaConfig()
})

function loadOktaConfig() {
  const stored = localStorage.getItem('signfile_okta_config')
  if (stored) {
    try {
      Object.assign(localConfig, JSON.parse(stored))
      return
    } catch { /* ignore corrupt data */ }
  }
  const runtimeConfig = useRuntimeConfig()
  localConfig.issuer = String(runtimeConfig.public.oktaIssuer || '')
  localConfig.clientId = String(runtimeConfig.public.oktaClientId || '')
  localConfig.redirectUri = String(runtimeConfig.public.oktaRedirectUri || props.oktaRedirectUriPlaceholder)
  localConfig.useImplicit = runtimeConfig.public.oktaUseImplicit === 'true'
}

function handleSaveConfig() {
  if (!localConfig.issuer || !localConfig.clientId || !localConfig.redirectUri) return
  localStorage.setItem('signfile_okta_config', JSON.stringify({ ...localConfig }))
  emit('saveOktaConfig', { ...localConfig })
}

function handleResetConfig() {
  localStorage.removeItem('signfile_okta_config')
  loadOktaConfig()
  emit('resetOktaConfig')
}
</script>
