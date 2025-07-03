<template>
  <div class="text-modernity relative">
    <!-- ⚠ Error Message Display -->
    <div v-if="errorMessage" class="mb-4 p-3 rounded bg-energy/10 text-energy border border-energy">
      ⚠ {{ errorMessage }}
    </div>

    <!-- Authentication State -->
    <div class="min-h-[40px]">
      <div v-if="!isAuthenticated">        <button type="button" @click="loginWithOkta"
          class="btn btn-primary btn-md">
          Login with Okta
        </button>
      </div>
      <div v-else class="flex items-center justify-between mb-6">
        <h2 class="text-lg font-semibold text-currency">
          👋 Welcome, <span class="underline">{{ user?.name || user?.email }}</span>
        </h2>        <button @click="logout"
          class="btn btn-secondary btn-sm ml-2">
          Logout
        </button>
      </div>
    </div>

    <div v-if="isAuthenticated" class="transition-opacity duration-300 space-y-8">
      
      <!-- Certificate Management -->
      <div class="p-4 rounded-lg border border-security/20 bg-care shadow-sm">
        <h2 class="text-xl font-semibold mb-4 text-security border-b border-security/30 pb-2">Certificate Management</h2>        <button @click="fetchCerts"
          class="btn btn-secondary btn-md mb-4">
          Refresh Certificates
        </button>
        <ul class="space-y-2">
          <li v-for="cert in certs" :key="cert.name"
            class="p-2 flex items-center justify-between border-b border-security/10">
            <span class="font-mono text-modernity">{{ cert.name }}</span>            <button @click="deleteCert(cert.name)"
              class="btn btn-danger btn-sm">
              Delete
            </button>
          </li>
        </ul>
      </div>

      <!-- System & Version Info -->
      <div class="p-4 rounded-lg border border-security/20 bg-care shadow-sm">
        <h2 class="text-xl font-semibold mb-4 text-security border-b border-security/30 pb-2">System &amp; Version Info</h2>
        <div v-if="adminVersions">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div class="p-2 rounded bg-security/5"><span class="font-semibold text-currency">jsign version:</span> <span
                class="ml-2">{{ adminVersions.versions.jsign.current }}</span></div>
            <div class="p-2 rounded bg-security/5"><span class="font-semibold text-currency">OpenSSL version:</span>
              <span class="ml-2">{{ adminVersions.versions.openssl.current }}</span>
              <span class="text-xs text-security">(latest: {{ adminVersions.versions.openssl.latest }})</span>
            </div>
            <div class="p-2 rounded bg-security/5"><span class="font-semibold text-currency">OpenJDK version:</span>
              <span class="ml-2">{{ adminVersions.versions.openjdk.current }}</span>
            </div>
            <div class="p-2 rounded bg-security/5"><span class="font-semibold text-currency">Base image:</span> <span
                class="ml-2">{{ adminVersions.baseImage }}</span></div>
          </div>
        </div>
        <div v-else class="text-security/50 italic">Loading version info...</div>
      </div>

      <!-- NPM Package Management -->
      <div class="p-4 rounded-lg border border-security/20 bg-care shadow-sm">
        <h2 class="text-xl font-semibold mb-4 text-security border-b border-security/30 pb-2">NPM Package Management</h2>
        <button @click="fetchPackages"
          class="bg-currency text-modernity hover:bg-security hover:text-care transition-colors duration-200 rounded-lg px-4 py-2 font-medium mb-4">
          Refresh Packages
        </button>
        <ul class="space-y-2 min-h-[50px]">
          <li v-for="pkg in npmPackages" :key="pkg.name"
            class="p-2 flex items-center justify-between bg-security/5 rounded-lg">
            <div>
              <span class="font-mono text-modernity font-medium">{{ pkg.name }}</span>: {{ pkg.current }}
              <span class="text-security/70">(latest: {{ pkg.latest }})</span>
            </div>
            <div class="flex items-center gap-2">
              <span v-if="!pkg.outdated" class="text-green-600 text-lg">✅</span>
              <button v-else @click="updatePackage(pkg.name)"
                class="bg-energy text-care hover:bg-energy/80 transition-colors duration-200 rounded-lg px-3 py-1 text-sm">
                Update
              </button>
            </div>
          </li>
        </ul>
      </div>

      <!-- Loading overlay -->
      <div v-if="isAuthenticated && loading"
        class="absolute inset-0 bg-care/70 flex items-center justify-center rounded-xl z-10 backdrop-blur-sm">
        <div class="flex flex-col items-center">
          <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-security"></div>
          <p class="text-security mt-4 font-medium animate-pulse">Loading data...</p>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, defineEmits } from 'vue'
import { OktaAuth } from '@okta/okta-auth-js'
import { useOkta } from '@/composables/useOkta'

const okta = useOkta() as OktaAuth | null
const isAuthenticated = ref(false)
const user = ref<any>(null)
const errorMessage = ref<string | null>(null)
const certs = ref<{ name: string }[]>([])
const npmPackages = ref<{ name: string; current: string; latest: string; outdated: boolean }[]>([])
const loading = ref(false)
const adminVersions = ref<any>(null)
const sortedAdminPackages = computed(() => {
  if (!adminVersions.value || !Array.isArray(adminVersions.value.npmPackages)) return []
  return [...adminVersions.value.npmPackages].sort((a, b) => {
    if (a.outdated && !b.outdated) return -1
    if (!a.outdated && b.outdated) return 1
    return a.name.localeCompare(b.name)
  })
})
const emit = defineEmits(['auth-state'])

async function checkOktaSession() {
  if (!process.client || !okta) {
    errorMessage.value = 'Okta is not available. Authentication is disabled.'
    console.warn('[Admin.vue] Okta not available')
    emit('auth-state', false)
    return
  }
  
  try {
    // Try both idToken and accessToken for robustness
    const idToken = await okta.tokenManager.get('idToken')
    const accessToken = await okta.tokenManager.get('accessToken')
    console.log('[Admin.vue] checkOktaSession idToken:', idToken, 'accessToken:', accessToken)
    
    if (idToken && typeof idToken === 'object' && 'claims' in idToken) {
      isAuthenticated.value = true
      user.value = idToken.claims
      errorMessage.value = null // Clear any previous errors on successful authentication
      emit('auth-state', true)
    } else if (accessToken && typeof accessToken === 'object' && 'claims' in accessToken) {
      isAuthenticated.value = true
      user.value = accessToken.claims
      errorMessage.value = null // Clear any previous errors on successful authentication
      emit('auth-state', true)
    } else {
      isAuthenticated.value = false
      user.value = null
      errorMessage.value = 'No valid authentication tokens found.'
      emit('auth-state', false)
    }
  } catch (err) {
    isAuthenticated.value = false
    user.value = null
    errorMessage.value = 'Token validation error: ' + (err as Error).message
    console.error('[Admin.vue] Token error:', err)
    emit('auth-state', false)
  }
}

onMounted(async () => {
  if (!process.client || !okta) {
    errorMessage.value = 'Okta is not available on the client. Authentication is disabled.'
    console.warn('[Admin.vue] Okta not available on mount')
    return
  }
  
  try {
    if (window.location.search.includes('code=')) {
      console.log('[Admin.vue] Handling Okta redirect callback')
      await okta.token.parseFromUrl()
      window.history.replaceState({}, document.title, window.location.pathname)
    }
    await checkOktaSession()
  } catch (err) {
    errorMessage.value = 'Login failed: ' + (err as Error).message
    console.error('[Admin.vue] Okta login error:', err)
  }
})

async function loginWithOkta() {
  if (!process.client || !okta) {
    errorMessage.value = 'Cannot login: Okta is not available.'
    console.warn('[Admin.vue] Okta not available for login')
    return
  }
  
  try {
    console.log('[Admin.vue] loginWithOkta called')
    await okta.token.getWithRedirect({
      responseType: 'code', // Use Authorization Code Flow with PKCE
      scopes: ['openid', 'profile', 'email']
    })
  } catch (err) {
    errorMessage.value = 'Login failed: ' + (err as Error).message
    console.error('[Admin.vue] login error:', err)
  }
}

async function logout() {
  if (!process.client || !okta) {
    errorMessage.value = 'Logout failed: Okta instance missing.'
    console.warn('[Admin.vue] Okta not available for logout')
    return
  }
  
  try {
    console.log('[Admin.vue] logout called')
    await okta.signOut()
    isAuthenticated.value = false
    user.value = null
    errorMessage.value = null // Clear any errors on successful logout
  } catch (err) {
    errorMessage.value = 'Logout error: ' + (err as Error).message
    console.error('[Admin.vue] logout error:', err)
  }
}
// Certificate management
async function fetchCerts() {
  const res = await fetch('/api/certs')
  certs.value = (await res.json()).map((name: any) => ({ name }))
}
async function deleteCert(name: any) {
  await fetch(`/api/certs?name=${encodeURIComponent(name)}`, { method: 'DELETE' })
  await fetchCerts()
}
// NPM package management
async function fetchPackages() {
  const res = await fetch('/api/packages-versions')
  const data = await res.json()
  npmPackages.value = data.npmPackages || []
}
async function updatePackage(name: any) {
  const res = await fetch('/api/npm-update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name })
  })
  const data = await res.json()
  if (data.ok) {
    alert(`Package ${name} updated successfully!`)
    await fetchPackages()
  } else {
    alert(`Failed to update ${name}: ${data.error}`)
  }
}
watch(isAuthenticated, async (val) => {
  if (val) {
    const res = await fetch('/api/packages-versions')
    adminVersions.value = await res.json()
  } else {
    adminVersions.value = null
  }
})
</script>
