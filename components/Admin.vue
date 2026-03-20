<template>
  <div class="text-modernity relative">
    <div class="admin-content">
      <!-- Error Message -->
      <div v-if="errorMessage" class="mb-3 p-1.5 rounded bg-energy/10 text-energy border border-energy">
        ⚠ {{ errorMessage }}
      </div>

      <!-- Authentication Required -->
      <div v-if="!isAuthenticated && !isLocalAdminAuthenticated" class="flex items-center justify-center flex-grow">
        <div class="p-5 rounded-lg border border-security/20 bg-care shadow-lg max-w-md w-full text-center animate-fadeIn">
          <div class="flex flex-col items-center justify-center gap-3">
            <div class="text-7xl mb-3 animate-float">🔒</div>
            <h2 class="text-xl font-semibold text-security">Authentication Required</h2>
            <p class="text-modernity-80 mb-5 text-sm">
              Please login to access admin features
            </p>
            <button
              @click="showLoginModal = true"
              class="py-1.5 px-3.5 bg-security text-care rounded-lg text-sm font-medium hover:bg-security/80 transition-colors flex items-center justify-center gap-1.5 shadow-md"
            >
              <span class="text-lg">🔑</span>
              <span>Login to Admin</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Admin content sections -->
      <div v-if="isAuthenticated || isLocalAdminAuthenticated">
        <SystemInfo
          v-if="activeTab === 'system'"
        />
        <PackageManagement
          v-if="activeTab === 'packages'"
        />
        <ConfigManagement
          v-if="activeTab === 'config'"
          :user="user || {}"
          :isAuthenticated="!!isAuthenticated"
          :isLocalAdminAuthenticated="!!isLocalAdminAuthenticated"
          :oktaConfig="oktaConfig"
          :configSaveSuccess="!!configSaveSuccess"
          :configSaveError="configSaveError"
          :testingConnection="!!testingConnection"
          :savingOktaConfig="!!savingOktaConfig"
          :oktaRedirectUriPlaceholder="oktaRedirectUriPlaceholder"
          @save-okta-config="(config: any) => saveOktaConfig(config || {})"
          @reset-okta-config="resetOktaConfig"
          @test-okta-connection="testOktaConnection"
          @login-with-okta="loginWithOkta"
          @logout="logout"
          @logout-local-admin="logoutLocalAdmin"
          @regenerate-admin-password="regenerateAdminPassword"
        />
        <UserAdmin
          v-if="activeTab === 'userAdmin'"
          :user="user"
          ref="userAdminRef"
        />
      </div>

      <!-- Login Modal -->
      <div v-if="showLoginModal" class="fixed inset-0 flex items-center justify-center z-[2000] admin-login-modal-backdrop">
        <div class="admin-login-modal">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-security">Admin Login</h2>
            <div class="text-xs text-security/50">SignFile</div>
          </div>

          <div class="flex gap-3 mb-3 bg-security/5 p-0.5 rounded-lg">
            <button
              @click="loginMethod = 'local'"
              class="flex-1 py-1 px-2 rounded-md transition-all duration-200 font-medium text-sm"
              :class="loginMethod === 'local' ? 'bg-security text-care shadow-sm' : 'bg-transparent text-security hover:bg-security/10'"
            >
              Local Admin
            </button>
            <button
              @click="loginMethod = 'okta'"
              class="flex-1 py-1 px-2 rounded-md transition-all duration-200 font-medium text-sm"
              :class="loginMethod === 'okta' ? 'bg-security text-care shadow-sm' : 'bg-transparent text-security hover:bg-security/10'"
            >
              Okta SSO
            </button>
          </div>

          <!-- Local Admin Login -->
          <form v-if="loginMethod === 'local'" @submit.prevent="attemptLocalLogin" class="space-y-2">
            <div>
              <label class="block text-xs font-medium text-security mb-0.5">Admin Password</label>
              <div class="relative">
                <input
                  v-model="enteredPassword"
                  type="password"
                  class="w-full px-2 py-1 border border-security/30 rounded-lg bg-care text-modernity focus:ring-2 focus:ring-security focus:border-security outline-none transition-all duration-200 hover:border-security/50 shadow-sm"
                  placeholder="Enter admin password"
                  autocomplete="current-password"
                />
                <span class="absolute right-2 top-1.5 text-security opacity-50">🔑</span>
              </div>
            </div>

            <div class="mt-1.5">
              <label class="block text-xs font-medium text-security mb-0.5">Session Duration</label>
              <div class="relative">
                <select
                  v-model="sessionDuration"
                  class="w-full px-2 py-1 border border-security/30 rounded-lg bg-care text-modernity focus:ring-2 focus:ring-security focus:border-security outline-none transition-all duration-200 hover:border-security/50 appearance-none shadow-sm"
                >
                  <option :value="1/6">4 hours</option>
                  <option :value="1">1 day</option>
                  <option :value="7">1 week</option>
                  <option :value="30">30 days</option>
                </select>
                <span class="absolute right-2 top-1.5 text-security opacity-50 pointer-events-none">⌄</span>
              </div>
              <p class="text-[0.675rem] text-modernity-60 mt-0.5">
                How long to stay logged in before re-entering password
              </p>
            </div>

            <div v-if="localAuthError" class="p-1.5 bg-energy/15 text-energy text-xs rounded-lg border border-energy/30 flex items-start gap-1.5 my-1.5 animate-fadeIn shadow-sm">
              <span class="text-base mt-0.5">⚠️</span>
              <div>
                <span>{{ localAuthError }}</span>
              </div>
            </div>

            <div class="flex justify-end gap-2 pt-1.5">
              <button
                type="button"
                @click="showLoginModal = false"
                class="px-2 py-1 border border-security/30 text-security rounded-md hover:bg-security/5 transition-all duration-200 focus:ring-1 focus:ring-security/25 focus:outline-none text-sm"
              >
                Cancel
              </button>
              <button
                type="submit"
                class="bg-security text-care hover:bg-security/80 transition-all duration-200 px-2.5 py-1 rounded-md font-medium focus:ring-1 focus:ring-security/50 focus:ring-offset-1 focus:outline-none shadow-md hover:shadow-md text-sm"
              >
                <span class="flex items-center gap-1">
                  <span>Login</span>
                  <span class="text-xs">→</span>
                </span>
              </button>
            </div>

            <div class="text-[0.675rem] text-modernity/70 mt-3 p-1.5 border border-security/20 rounded-md bg-security/10 shadow-sm">
              <div class="flex items-start gap-1.5">
                <span class="text-security opacity-70 mt-0.5">ℹ️</span>
                <div>
                  <p>The local admin password was randomly generated during first application startup.</p>
                </div>
              </div>
            </div>
          </form>

          <!-- Okta Login -->
          <div v-else class="space-y-2">
            <div class="p-2 rounded-md border border-security/20 bg-security/10 mb-2 shadow-sm">
              <div class="flex items-center mb-1">
                <span class="text-security mr-1">ℹ️</span>
                <h3 class="text-security font-medium">Okta Authentication</h3>
              </div>
              <p class="text-sm text-modernity-75">
                Click the button below to authenticate with Okta Single Sign-On service.
              </p>
            </div>
            <div class="flex justify-end gap-2 pt-1">
              <button
                type="button"
                @click="showLoginModal = false"
                class="px-2 py-1 border border-security/30 text-security rounded-md hover:bg-security/5 transition-all duration-200 focus:ring-1 focus:ring-security/25 focus:outline-none text-sm"
              >
                Cancel
              </button>
              <button
                @click="loginWithOkta"
                class="bg-security text-care hover:bg-security/80 transition-colors duration-200 px-2 py-1 rounded-md font-medium text-sm"
              >
                Continue with Okta
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Loading overlay -->
      <div v-if="(isAuthenticated || isLocalAdminAuthenticated) && loading"
        class="absolute inset-0 bg-care/70 flex items-center justify-center rounded-xl z-10 backdrop-blur-sm">
        <div class="flex flex-col items-center">
          <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-security"></div>
          <p class="text-security mt-2 font-medium animate-pulse text-sm">Loading data...</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import SystemInfo from './admin/SystemInfo.vue'
import PackageManagement from './admin/PackageManagement.vue'
import ConfigManagement from './admin/ConfigManagement.vue'
import UserAdmin from './admin/UserAdmin.vue'

const route = useRoute()
const okta = useOkta()

// --- State ---
const errorMessage = ref<string | null>(null)
const isAuthenticated = ref(false)
const isLocalAdminAuthenticated = ref(false)
const showLoginModal = ref(false)
const loginMethod = ref<'local' | 'okta'>('local')
const enteredPassword = ref('')
const localAuthError = ref('')
const sessionDuration = ref(1 / 6)
const user = ref<any>(null)
const userAdminRef = ref<any>(null)
const activeTab = ref('system')
const oktaConfig = ref({ issuer: '', clientId: '', redirectUri: '', useImplicit: false })
const oktaRedirectUriPlaceholder = ref('http://localhost:3000/login/callback')
const configSaveSuccess = ref(false)
const configSaveError = ref<string | null>(null)
const savingOktaConfig = ref(false)
const testingConnection = ref(false)
const loading = ref(false)

// Sync activeTab with route query
watch(() => route.query.section as string | undefined, (section) => {
  if (section) activeTab.value = section
}, { immediate: true })

// Show login modal if accessing protected tab without auth
watch(activeTab, (newTab) => {
  if (newTab === 'userAdmin' && !isAuthenticated.value && !isLocalAdminAuthenticated.value) {
    showLoginModal.value = true
  }
})

// --- Functions ---

function attemptLocalLogin() {
  if (!enteredPassword.value) {
    localAuthError.value = 'Password is required'
    return
  }

  localAuthError.value = ''
  loading.value = true

  fetch('/api/admin-data?type=password', {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  })
    .then(response => {
      if (!response.ok) throw new Error(`Failed to retrieve admin password data: ${response.status}`)
      return response.json()
    })
    .then(() => {
      return fetch('/api/admin-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'verify-admin-password', data: enteredPassword.value.trim() })
      })
    })
    .then(response => {
      if (!response.ok) throw new Error(`Password verification failed: ${response.status}`)
      return response.json()
    })
    .then(data => {
      if (data.error) throw new Error(data.error)

      if (data.success) {
        isLocalAdminAuthenticated.value = true
        showLoginModal.value = false
        localStorage.setItem('signfile_local_admin_auth', 'true')
        localStorage.setItem('signfile_local_admin_expiry',
          new Date(Date.now() + sessionDuration.value * 86400000).toISOString())
      } else {
        localAuthError.value = data.message || 'Invalid administrator password'
      }
    })
    .catch(err => {
      localAuthError.value = 'Authentication error: ' + err.message
    })
    .finally(() => {
      loading.value = false
    })
}

function saveOktaConfig(config: any) {
  if (!config) {
    configSaveError.value = 'Invalid configuration'
    return
  }
  savingOktaConfig.value = true
  configSaveSuccess.value = false
  configSaveError.value = null

  // TODO: replace with real API call
  setTimeout(() => {
    oktaConfig.value = { ...config }
    savingOktaConfig.value = false
    configSaveSuccess.value = true
  }, 1000)
}

function resetOktaConfig() {
  oktaConfig.value = { issuer: '', clientId: '', redirectUri: '', useImplicit: false }
  configSaveSuccess.value = false
  configSaveError.value = null
}

function testOktaConnection() {
  testingConnection.value = true
  // TODO: replace with real API call
  setTimeout(() => {
    testingConnection.value = false
  }, 1500)
}

function loginWithOkta() {
  if (!okta) {
    errorMessage.value = 'Okta is not available'
    return
  }
  showLoginModal.value = false
  okta.signInWithRedirect().catch(() => {
    errorMessage.value = 'Authentication redirect failed'
  })
}

function logout() {
  isAuthenticated.value = false
  user.value = null
  if (okta) {
    okta.signOut().catch(() => {})
  }
}

function logoutLocalAdmin() {
  isLocalAdminAuthenticated.value = false
  localStorage.removeItem('signfile_local_admin_auth')
  localStorage.removeItem('signfile_local_admin_expiry')
}

function regenerateAdminPassword() {
  // Use crypto API for secure random password generation
  const array = new Uint8Array(16)
  crypto.getRandomValues(array)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const newPassword = Array.from(array, b => chars[b % chars.length]).join('')

  return fetch('/api/admin-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'password', data: newPassword })
  })
    .then(response => {
      if (!response.ok) throw new Error(`Failed to save new password: ${response.status}`)
      return response.json()
    })
    .then(data => {
      if (data.success) return newPassword
      throw new Error(data.error || 'Failed to regenerate admin password')
    })
}

// --- Lifecycle ---

onMounted(async () => {
  // Check local admin session
  const localAuth = localStorage.getItem('signfile_local_admin_auth')
  const expiry = localStorage.getItem('signfile_local_admin_expiry')
  if (localAuth === 'true' && expiry && new Date(expiry) > new Date()) {
    isLocalAdminAuthenticated.value = true
  } else if (localAuth === 'true') {
    localStorage.removeItem('signfile_local_admin_auth')
    localStorage.removeItem('signfile_local_admin_expiry')
  }

  // Check Okta auth state
  if (okta) {
    try {
      const state = await okta.authStateManager.getAuthState()
      if (state?.isAuthenticated) {
        isAuthenticated.value = true
        const idToken = await okta.tokenManager.get('idToken')
        if (idToken && typeof idToken === 'object' && 'claims' in idToken) {
          user.value = (idToken as any).claims
        }
      }
    } catch { /* Okta not ready */ }
  }
})
</script>
