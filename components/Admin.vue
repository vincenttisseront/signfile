<template>
  <div>
    <h1 class="text-2xl font-bold mb-4">Admin Panel</h1>

    <!-- ⚠ Error Message Display -->
    <div v-if="errorMessage" class="mb-4 p-3 rounded bg-energy/10 text-energy border border-energy">
      ⚠ {{ errorMessage }}
    </div>

    <div v-if="!isAuthenticated">
      <button type="button" @click="loginWithOkta" class="px-3 py-1 rounded bg-security text-care hover:bg-currency hover:text-modernity">Login with Okta</button>
    </div>
    <div v-else>
      <p class="mb-4">Welcome, {{ user?.name || user?.email }}! <button @click="logout" class="text-sm px-2 py-1 rounded bg-currency hover:bg-energy ml-2 text-modernity">Logout</button></p>
      <div class="mb-8">
        <h2 class="text-xl font-semibold mb-2 text-security">Certificate Management</h2>
        <div>
          <button @click="fetchCerts" class="px-3 py-1 rounded bg-currency hover:bg-energy text-modernity mb-2">Refresh Certificates</button>
          <ul>
            <li v-for="cert in certs" :key="cert.name" class="mb-1 flex items-center">
              <span class="font-mono text-modernity">{{ cert.name }}</span>
              <button @click="deleteCert(cert.name)" class="text-xs px-2 py-0.5 rounded bg-energy hover:bg-security ml-2 text-care">Delete</button>
            </li>
          </ul>
        </div>
      </div>
      <div class="mb-8">
        <h2 class="text-xl font-semibold mb-2 text-security">System &amp; Version Info</h2>
        <div v-if="adminVersions">
          <div class="mb-2"><span class="font-semibold text-currency">jsign version:</span> <span class="ml-2">{{ adminVersions.versions.jsign.current }}</span></div>
          <div class="mb-2"><span class="font-semibold text-currency">OpenSSL version:</span> <span class="ml-2">{{ adminVersions.versions.openssl.current }}</span> <span class="text-xs text-gray-500">(latest: {{ adminVersions.versions.openssl.latest }})</span></div>
          <div class="mb-2"><span class="font-semibold text-currency">OpenJDK version:</span> <span class="ml-2">{{ adminVersions.versions.openjdk.current }}</span></div>
          <div class="mb-2"><span class="font-semibold text-currency">Base image:</span> <span class="ml-2">{{ adminVersions.baseImage }}</span></div>
          <div class="mb-2"><span class="font-semibold text-currency">NPM Packages:</span></div>
          <ul class="ml-4 mt-2">
            <li v-for="pkg in sortedAdminPackages" :key="pkg.name" :class="pkg.outdated ? 'bg-energy/10 text-energy rounded px-2 py-1 mb-1' : 'mb-1'">
              <span class="font-mono">{{ pkg.name }}</span>: {{ pkg.current }} <span class="text-gray-500">(latest: {{ pkg.latest }})</span>
              <span v-if="pkg.outdated" class="text-energy"> ⚠</span>
            </li>
          </ul>
        </div>
        <div v-else class="text-gray-400">Loading version info...</div>
      </div>
      <div>
        <h2 class="text-xl font-semibold mb-2 text-security">NPM Package Management</h2>
        <button @click="fetchPackages" class="px-3 py-1 rounded bg-currency hover:bg-energy text-modernity mb-2">Refresh Packages</button>
        <ul>
          <li v-for="pkg in npmPackages" :key="pkg.name" class="mb-1 flex items-center">
            <span class="font-mono text-modernity">{{ pkg.name }}</span>: {{ pkg.current }} <span class="text-gray-500">(latest: {{ pkg.latest }})</span>
            <button v-if="pkg.outdated" @click="updatePackage(pkg.name)" class="text-xs px-2 py-0.5 rounded bg-energy text-care hover:bg-security ml-2">Update</button>
          </li>
        </ul>
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
