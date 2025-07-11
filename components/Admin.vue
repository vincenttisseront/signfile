<template>
  <div class="text-modernity relative">
    <!-- Main Content Area -->
    <div class="admin-content">
      <!-- ⚠ Error Message Display -->
      <div v-if="errorMessage" class="mb-3 p-1.5 rounded bg-energy/10 text-energy border border-energy">
        ⚠ {{ errorMessage }}
      </div>
      
      <!-- Authentication Required Message - Only shown when not authenticated -->
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
      
      <!-- All Admin content sections - Only shown when authenticated -->
      <div v-if="isAuthenticated || isLocalAdminAuthenticated">
        
        <SystemInfo 
          v-if="activeTab === 'system'"
          :appVersion="appVersion"
        />

        <!-- NPM Package Management Tab -->
        <PackageManagement 
          v-if="activeTab === 'packages'"
        />
        
        <!-- Configuration Management Tab -->
        <ConfigManagement 
          v-if="activeTab === 'config'"
          :user="user || {}"
          :isAuthenticated="!!isAuthenticated"
          :isLocalAdminAuthenticated="!!isLocalAdminAuthenticated"
          :oktaConfig="oktaConfig || { issuer: '', clientId: '', redirectUri: '', useImplicit: false }"
          :configSaveSuccess="!!configSaveSuccess"
          :configSaveError="configSaveError || null"
          :testingConnection="!!testingConnection"
          :savingOktaConfig="!!savingOktaConfig"
          :oktaRedirectUriPlaceholder="oktaRedirectUriPlaceholder || 'http://localhost:3000/login/callback'"
          @save-okta-config="(config: any) => saveOktaConfig(config || {})"
          @reset-okta-config="() => resetOktaConfig()"
          @test-okta-connection="() => testOktaConnection()"
          @login-with-okta="() => loginWithOkta()"
          @logout="() => logout()"
          @logout-local-admin="() => logoutLocalAdmin()"
          @regenerate-admin-password="() => regenerateAdminPassword()"
        />
        
        <!-- User Admin Rights Tab -->
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
            <div class="text-xs text-security/50">Security Console</div>
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
              </button>                <button 
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
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useOkta } from '@/composables/useOkta';
import SystemInfo from './admin/SystemInfo.vue';
import PackageManagement from './admin/PackageManagement.vue';
import ConfigManagement from './admin/ConfigManagement.vue';
import UserAdmin from './admin/UserAdmin.vue';

// --- ADMIN STATE ---
const errorMessage = ref<string | null>(null);
const isAuthenticated = ref(false);
const isLocalAdminAuthenticated = ref(false);
const showLoginModal = ref(false);
const loginMethod = ref<'local' | 'okta'>('local');
const enteredPassword = ref('');
const localAuthError = ref('');
const sessionDuration = ref(1/6); // 4 hours by default
const user = ref<any>(null);
const userAdminRef = ref<any>(null);
const activeTab = ref('system');
const appVersion = ref('');
const oktaConfig = ref({ issuer: '', clientId: '', redirectUri: '', useImplicit: false });
const oktaRedirectUriPlaceholder = ref('http://localhost:3000/login/callback');
const configSaveSuccess = ref(false);
const configSaveError = ref<string | null>(null);
const savingOktaConfig = ref(false);
const testingConnection = ref(false);
const loading = ref(false);
// Track authentication source for user rights management
const authSource = ref<'local' | 'okta' | null>(null);

// --- OKTA ---
const okta = useOkta() as any;

// --- IMPLEMENTED FUNCTIONS ---

function attemptLocalLogin() {
  if (!enteredPassword.value) {
    localAuthError.value = "Password is required";
    return;
  }
  
  localAuthError.value = "";
  loading.value = true;

  // First check if we can retrieve the admin password for comparison
  // This can help diagnose issues with the password file
  fetch('/api/admin-data?type=password', {
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to retrieve admin password data: ${response.status} ${response.statusText}`);
    }
    return response.json();
  })
  .then(passData => {
    // Check if admin password file exists

    // Now proceed with password verification
    return fetch('/api/admin-data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        type: 'verify-admin-password', 
        data: enteredPassword.value.trim() // Ensure password is trimmed
      })
    });
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Password verification request failed: ${response.status} ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    // Check for error in the response format
    if (data.error) {
      throw new Error(`API error: ${data.error}`);
    }
    
    if (data.success) {
      isLocalAdminAuthenticated.value = true;
      showLoginModal.value = false;
      
      // Store authentication in localStorage with proper expiry
      try {
        localStorage.setItem('securityconsole_local_admin_auth', 'true');
        localStorage.setItem('securityconsole_local_admin_expiry', new Date(Date.now() + sessionDuration.value * 24 * 60 * 60 * 1000).toISOString());
        
        // Set auth source for user rights tracking
        authSource.value = 'local';
        
        // If UserAdmin component is available, record this authentication
        if (userAdminRef.value && typeof userAdminRef.value.recordUserAuthentication === 'function') {
          // Create a local admin user record
          const localAdminUser = {
            name: 'Local Administrator',
            email: 'local.admin@securityconsole.app',
            isLocalAdmin: true
          };
          userAdminRef.value.recordUserAuthentication(localAdminUser)
            .catch((err: Error) => console.error('[Admin.vue] Error recording authentication:', err));
        }
      } catch (err) {
        console.error('[Admin.vue] Error storing auth data:', err);
      }
    } else {
      // Password verification failed
      localAuthError.value = data.message || "Invalid administrator password";
      
      // If no meaningful error message was provided, set a generic message
      if (!data.message) {
        localAuthError.value = "Authentication failed. Please check your password and try again.";
      }
    }
  })
  .catch(error => {
    console.error('[Admin.vue] Error during admin password verification:', error);
    localAuthError.value = "Authentication error: " + error.message;
  })
  .finally(() => {
    loading.value = false;
  });
}

function saveOktaConfig(config: any) {
  if (!config) {
    configSaveError.value = "Invalid configuration";
    return;
  }
  
  savingOktaConfig.value = true;
  configSaveSuccess.value = false;
  configSaveError.value = null;
  
  // Simulating API request
  setTimeout(() => {
    console.log('Saving Okta config:', config);
    oktaConfig.value = { ...config };
    savingOktaConfig.value = false;
    configSaveSuccess.value = true;
  }, 1000);
}

function resetOktaConfig() {
  oktaConfig.value = { issuer: '', clientId: '', redirectUri: '', useImplicit: false };
  configSaveSuccess.value = false;
  configSaveError.value = null;
}

function testOktaConnection() {
  testingConnection.value = true;
  
  // Simulating API request
  setTimeout(() => {
    console.log('Testing Okta connection with:', oktaConfig.value);
    testingConnection.value = false;
    // Add actual testing logic here
  }, 1500);
}

function loginWithOkta() {
  if (!okta) {
    errorMessage.value = "Okta is not available";
    return;
  }
  
  // Use the okta object to initiate login
  console.log('Starting Okta login process');
  
  // Close modal if open
  showLoginModal.value = false;
  
  // First, perform a thorough initialization of storage
  initializeOktaStorageCompletely();
  
  // Set a flag to track that we need to check admin rights after authentication
  if (process.client && window.sessionStorage) {
    window.sessionStorage.setItem('check_admin_rights_after_auth', 'true');
    window.sessionStorage.setItem('requested_admin_section', activeTab.value);
  }
  
  // Then attempt login with proper error handling
  try {
    // Let's safely initialize the Okta auth
    if (okta && typeof okta.signInWithRedirect === 'function') {
      // Add a short delay to ensure storage is initialized
      setTimeout(() => {
        try {
          // Double-check storage right before redirect
          initializeOktaStorageCompletely();
          
          // Set a flag to track the redirect attempt
          if (process.client && window.sessionStorage) {
            window.sessionStorage.setItem('okta_redirect_attempted', 'true');
          }
          
          // Perform the redirect
          okta.signInWithRedirect().catch((err: any) => {
            console.error('[Admin.vue] Error during signInWithRedirect:', err);
            errorMessage.value = "Authentication redirect failed";
          });
        } catch (redirectError) {
          console.error('[Admin.vue] Error during Okta redirect:', redirectError);
          errorMessage.value = "Failed to start authentication process";
        }
      }, 100);
    } else {
      // Fallback to basic authentication flow if method is not available
      console.error('[Admin.vue] Okta signInWithRedirect method not available');
      errorMessage.value = "Authentication method not available";
    }
  } catch (error) {
    console.error('[Admin.vue] Error during Okta login initialization:', error);
    errorMessage.value = "Failed to initialize authentication process";
  }
}

// Complete Okta storage initialization in one function
function initializeOktaStorageCompletely() {
  if (!process.client) return;
  
  try {
    // Make sure all required storage objects exist
    if (!window.localStorage.getItem('okta-token-storage')) {
      window.localStorage.setItem('okta-token-storage', JSON.stringify({
        idToken: null,
        accessToken: null,
        refreshToken: null,
        tokens: [],
        requests: [],
        responses: [],
        states: []
      }));
    } else {
      // If exists but might be malformed, ensure it has the right structure
      let storage;
      try {
        storage = JSON.parse(window.localStorage.getItem('okta-token-storage') || '{}');
      } catch (e) {
        storage = {};
      }
      
      if (typeof storage !== 'object' || storage === null) {
        storage = {};
      }
      
      // Ensure all required properties exist and are properly initialized
      const updatedStorage = {
        idToken: storage.idToken || null,
        accessToken: storage.accessToken || null,
        refreshToken: storage.refreshToken || null,
        tokens: Array.isArray(storage.tokens) ? storage.tokens : [],
        requests: Array.isArray(storage.requests) ? storage.requests : [],
        responses: Array.isArray(storage.responses) ? storage.responses : [],
        states: Array.isArray(storage.states) ? storage.states : []
      };
      
      window.localStorage.setItem('okta-token-storage', JSON.stringify(updatedStorage));
    }
    
    // Initialize PKCE state storage if needed
    if (!window.localStorage.getItem('okta-pkce-storage')) {
      window.localStorage.setItem('okta-pkce-storage', JSON.stringify({
        codeVerifier: null,
        codeChallenge: null,
        state: null,
        states: []
      }));
    } else {
      // Ensure proper structure if it exists
      let pkceStorage;
      try {
        pkceStorage = JSON.parse(window.localStorage.getItem('okta-pkce-storage') || '{}');
      } catch (e) {
        pkceStorage = {};
      }
      
      if (typeof pkceStorage !== 'object' || pkceStorage === null) {
        pkceStorage = {};
      }
      
      const updatedPkceStorage = {
        codeVerifier: pkceStorage.codeVerifier || null,
        codeChallenge: pkceStorage.codeChallenge || null,
        state: pkceStorage.state || null,
        states: Array.isArray(pkceStorage.states) ? pkceStorage.states : []
      };
      
      window.localStorage.setItem('okta-pkce-storage', JSON.stringify(updatedPkceStorage));
    }
    
    // Ensure transaction metadata storage exists
    if (!window.sessionStorage.getItem('okta-transaction-storage')) {
      window.sessionStorage.setItem('okta-transaction-storage', JSON.stringify({
        states: [],
        requests: [],
        responses: []
      }));
    } else {
      // Ensure proper structure if it exists
      let transactionStorage;
      try {
        transactionStorage = JSON.parse(window.sessionStorage.getItem('okta-transaction-storage') || '{}');
      } catch (e) {
        transactionStorage = {};
      }
      
      if (typeof transactionStorage !== 'object' || transactionStorage === null) {
        transactionStorage = {};
      }
      
      const updatedTransactionStorage = {
        ...transactionStorage,
        states: Array.isArray(transactionStorage.states) ? transactionStorage.states : [],
        requests: Array.isArray(transactionStorage.requests) ? transactionStorage.requests : [],
        responses: Array.isArray(transactionStorage.responses) ? transactionStorage.responses : []
      };
      
      window.sessionStorage.setItem('okta-transaction-storage', JSON.stringify(updatedTransactionStorage));
    }
    
    // Additionally run our utility function to ensure all other arrays are initialized
    ensureOktaStorageArrays();
    
    console.log('[Admin.vue] Okta storage completely initialized');
  } catch (error) {
    console.error('[Admin.vue] Error during complete Okta storage initialization:', error);
  }
}

function logout() {
  console.log('[Admin.vue] Logging out from Okta');
  isAuthenticated.value = false;
  user.value = null;
  authSource.value = null;
  
  // If we're on the user admin page, show the login modal
  if (activeTab.value === 'userAdmin') {
    showLoginModal.value = true;
  }
  
  // Clear any stored tokens
  if (okta) {
    try {
      // Use proper signOut method if available
      if (typeof okta.signOut === 'function') {
        okta.signOut().catch((err: any) => {
          console.error('[Admin.vue] Error during Okta signOut:', err);
        });
      } else if (okta.tokenManager && typeof okta.tokenManager.clear === 'function') {
        // Fallback to token clearing if signOut not available
        okta.tokenManager.clear();
      }
      
      // Ensure all Okta storage is reset to prevent push errors
      window.localStorage.setItem('okta-token-storage', JSON.stringify({
        idToken: null,
        accessToken: null,
        refreshToken: null
      }));
      
      window.localStorage.setItem('okta-pkce-storage', JSON.stringify({
        codeVerifier: null,
        codeChallenge: null,
        state: null
      }));
      
      window.sessionStorage.setItem('okta-transaction-storage', JSON.stringify({}));
    } catch (err) {
      console.error('[Admin.vue] Error clearing tokens:', err);
    }
  }
  
  // Show a message if we're on the user admin section
  if (activeTab.value === 'userAdmin') {
    errorMessage.value = "Authentication required for User Admin Rights Management";
  }
}

function logoutLocalAdmin() {
  console.log('[Admin.vue] Logging out local admin');
  isLocalAdminAuthenticated.value = false;
  authSource.value = null;
  
  try {
    localStorage.removeItem('securityconsole_local_admin_auth');
    localStorage.removeItem('securityconsole_local_admin_expiry');
  } catch (err) {
    console.error('[Admin.vue] Error removing auth data:', err);
  }
  
  // If we're on the user admin page, show the login modal
  if (activeTab.value === 'userAdmin') {
    showLoginModal.value = true;
    errorMessage.value = "Authentication required for User Admin Rights Management";
  }
}

function regenerateAdminPassword() {
  console.log('[Admin.vue] Regenerating admin password');
  
  // Generate a new random password
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let newPassword = '';
  for (let i = 0; i < 16; i++) {
    newPassword += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  // Save the new password to the server
  return fetch('/api/admin-data', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      type: 'password', 
      data: newPassword 
    })
  })
  .then(response => {
    if (!response.ok) {
      throw new Error(`Failed to save new password: ${response.status} ${response.statusText}`);
    }
    return response.json();
  })
  .then(data => {
    if (data.success) {
      console.log('[Admin.vue] Admin password successfully regenerated');
      // Log the new password in the console with styling
      console.log('%c *** NEW ADMIN PASSWORD: ' + newPassword + ' ***', 'background: #8f40ff; color: white; font-size: 16px; padding: 5px 10px; border-radius: 3px;');
      return newPassword;
    } else {
      throw new Error(data.error || 'Failed to regenerate admin password');
    }
  });
}

// --- SAFE NAVIGATION FUNCTION ---
// This function safely handles navigation to admin sections without relying on arrays
function safeNavigateAdmin(section: string) {
  console.log(`[Admin.vue] Safe navigation to admin section: ${section}`);
  
  try {
    // Directly set the active tab without relying on URL params
    activeTab.value = section;
    
    // Only update the URL if we're in a browser environment and window.location is available
    if (process.client && typeof window !== 'undefined' && window.location && 
        window.history && typeof window.history.replaceState === 'function') {
      try {
        // Use replaceState to avoid adding to history and creating potential issues
        const url = new URL(window.location.href);
        url.searchParams.set('section', section);
        window.history.replaceState({}, '', url.toString());
      } catch (urlError) {
        console.error('[Admin.vue] Error updating URL:', urlError);
      }
    }
    
    // Close the mobile sidebar if applicable
    if (process.client && typeof window !== 'undefined' && window.innerWidth < 768 && 
        typeof window.dispatchEvent === 'function') {
      window.dispatchEvent(new CustomEvent('close_sidebar'));
    }
  } catch (err) {
    console.error(`[Admin.vue] Navigation error to section ${section}:`, err);
    // Fallback - just set the activeTab directly
    activeTab.value = section;
  }
  
  return false; // Return false to prevent any default behavior
}

// --- EVENT HANDLERS ---
// Function to handle admin section changes from events
function handleAdminSectionChange(customEvent: any) {
  try {
    if (customEvent && customEvent.detail && customEvent.detail.section) {
      console.log(`[Admin.vue] Received admin_section_change event: ${customEvent.detail.section}`);
      activeTab.value = customEvent.detail.section;
    }
  } catch (err) {
    console.error('[Admin.vue] Error handling admin section change:', err);
  }
}

// --- UTILITY FUNCTIONS ---
// Safely initialize storage arrays to prevent 'push' errors
function ensureOktaStorageArrays() {
  if (!process.client) return;
  
  try {
    // Check all storage locations that might need arrays
    const storageKeys = [
      { type: 'localStorage', key: 'okta-token-storage' },
      { type: 'localStorage', key: 'okta-pkce-storage' },
      { type: 'sessionStorage', key: 'okta-transaction-storage' },
      // Additional Okta storage keys that might be used
      { type: 'localStorage', key: 'okta-cache-storage' },
      { type: 'sessionStorage', key: 'okta-cache-storage' },
      { type: 'localStorage', key: 'okta-shared-transaction-storage' },
      { type: 'sessionStorage', key: 'okta-shared-transaction-storage' }
    ];
    
    storageKeys.forEach(({ type, key }) => {
      const storage = type === 'localStorage' ? localStorage : sessionStorage;
      let data;
      
      try {
        data = JSON.parse(storage.getItem(key) || '{}');
      } catch (e) {
        // If parsing fails, reset to empty object
        data = {};
      }
      
      // Ensure data is an object
      if (typeof data !== 'object' || data === null) {
        data = {};
      }
      
      // Comprehensive list of array properties that might be used with push
      const arrayProps = [
        'tokens', 'responses', 'requests', 'states', 
        'codeVerifiers', 'codeChallenges', 'nonces', 
        'metadata', 'histories', 'transactions', 'auth',
        'authStates', 'tokenResponses', 'redirectStates',
        'settings', 'config', 'origins', 'redirects',
        'cache', 'stateTokens', 'interactionHandles'
      ];
      
      arrayProps.forEach(arrayProp => {
        if (data[arrayProp] === undefined || !Array.isArray(data[arrayProp])) {
          data[arrayProp] = [];
        }
      });
      
      // For token storage, ensure we have necessary properties
      if (key === 'okta-token-storage') {
        if (!data.idToken) data.idToken = null;
        if (!data.accessToken) data.accessToken = null;
        if (!data.refreshToken) data.refreshToken = null;
      }
      
      // Store back the sanitized data
      storage.setItem(key, JSON.stringify(data));
    });
    
    console.log('[Admin.vue] Okta storage arrays successfully initialized');
  } catch (err) {
    console.error('[Admin.vue] Error initializing Okta storage arrays:', err);
  }
}

// --- WATCHERS & LIFECYCLE HOOKS ---
// Watch for URL parameter changes to set active tab with safety checks
watch(() => {
  // Return null during SSR to avoid errors
  if (!process.client || typeof window === 'undefined' || !window.location) {
    return null;
  }
  // Return the search parameter only if we're in the browser
  return window.location.search;
}, (newSearch) => {
  // Only process if we have a valid search string and we're client-side
  if (process.client && newSearch !== null) {
    try {
      const urlParams = new URLSearchParams(newSearch);
      const section = urlParams.get('section');
      if (section) {
        console.log(`[Admin.vue] Setting active tab from URL: ${section}`);
        activeTab.value = section;
      }
    } catch (err) {
      console.error('[Admin.vue] Error parsing URL parameters:', err);
    }
  }
}, { immediate: true });

// Watch for tab changes to ensure authentication for protected sections
watch(() => activeTab.value, (newTab) => {
  if (newTab === 'userAdmin' && !isAuthenticated.value && !isLocalAdminAuthenticated.value) {
    // Show login modal if user tries to access admin rights section without authentication
    showLoginModal.value = true;
  }
});

// Watch for login modal display
watch(() => showLoginModal.value, (showModal) => {
  if (showModal && !isAuthenticated.value && !isLocalAdminAuthenticated.value) {
    console.log('[Admin.vue] Login modal opened');
  }
});

// Watch for authentication changes
watch([isAuthenticated, isLocalAdminAuthenticated], async ([newAuth, newLocalAuth]) => {
  if (newAuth || newLocalAuth) {
    // Load any necessary data when authenticated
    loadAdminData();
    
    // Record user authentication for admin rights management
    if (newAuth && user.value && userAdminRef.value) {
      authSource.value = 'okta';
      try {
        await userAdminRef.value.recordUserAuthentication(user.value);
        console.log('[Admin.vue] Recorded Okta authentication for admin rights');
      } catch (err) {
        console.error('[Admin.vue] Failed to record Okta authentication:', err);
      }
    } else if (newLocalAuth && userAdminRef.value) {
      authSource.value = 'local';
      try {
        // Create a local admin user record
        const localAdminUser = {
          name: 'Local Administrator',
          email: 'local.admin@securityconsole.app',
          isLocalAdmin: true
        };
        await userAdminRef.value.recordUserAuthentication(localAdminUser);
        console.log('[Admin.vue] Recorded local admin authentication for admin rights');
      } catch (err) {
        console.error('[Admin.vue] Failed to record local admin authentication:', err);
      }
    }
  } else {
    // Reset auth source when logged out
    authSource.value = null;
  }
}, { immediate: false });

// Initialize component
onMounted(() => {
  // Only run client-side code
  if (!process.client) {
    return;
  }
  
  console.log('[Admin.vue] Component mounted');
  
  // Define all the initialization in a safe function
  const safeInitialization = () => {
    try {
      // Initialize Okta storage first
      initializeOktaStorageCompletely();
      
      // Check URL parameters for active tab
      if (typeof window !== 'undefined') {
        // First check if window._adminSection is set
        if (window._adminSection) {
          activeTab.value = window._adminSection;
          console.log(`[Admin.vue] Using window._adminSection: ${activeTab.value}`);
        }
        // Then check URL parameters
        else if (window.location && window.location.search) {
          const urlParams = new URLSearchParams(window.location.search);
          const section = urlParams.get('section');
          if (section) {
            activeTab.value = section;
            console.log(`[Admin.vue] Using URL parameter section: ${activeTab.value}`);
          }
        }
        
        // Set up event listeners
        window.removeEventListener('admin_section_change', handleAdminSectionChange);
        window.addEventListener('admin_section_change', handleAdminSectionChange);
        
        // Check if we need to handle admin rights check after auth
        const checkAdminRights = sessionStorage.getItem('check_admin_rights_after_auth');
        const requestedSection = sessionStorage.getItem('requested_admin_section');
        
        if (checkAdminRights === 'true') {
          console.log('[Admin.vue] Need to check admin rights after authentication');
          // Clear the flag
          sessionStorage.removeItem('check_admin_rights_after_auth');
          
          // If a specific section was requested, navigate to it
          if (requestedSection) {
            sessionStorage.removeItem('requested_admin_section');
            activeTab.value = requestedSection;
            console.log(`[Admin.vue] Navigating to requested admin section: ${requestedSection}`);
          }
        }
        
        // Check local admin authentication
        if (window.localStorage) {
          const localAuth = localStorage.getItem('securityconsole_local_admin_auth');
          const expiry = localStorage.getItem('securityconsole_local_admin_expiry');
          
          if (localAuth === 'true' && expiry && new Date(expiry) > new Date()) {
            isLocalAdminAuthenticated.value = true;
            authSource.value = 'local';
          } else if (localAuth === 'true') {
            localStorage.removeItem('securityconsole_local_admin_auth');
            localStorage.removeItem('securityconsole_local_admin_expiry');
          }
        }
      }
      
      // Check Okta auth state
      if (okta && typeof okta.authStateManager?.getAuthState === 'function') {
        let authStateResult;
        try {
          authStateResult = okta.authStateManager.getAuthState();
        } catch (err) {
          console.error('[Admin.vue] Error calling getAuthState:', err);
          authStateResult = null;
        }
        // If it's a Promise, handle async
        if (authStateResult && typeof authStateResult.then === 'function') {
          authStateResult.then((authState: any) => {
            if (authState && authState.isAuthenticated) {
              isAuthenticated.value = true;
              authSource.value = 'okta';
              if (authState.idToken) {
                user.value = authState.idToken.claims;
              } else if (authState.accessToken) {
                user.value = authState.accessToken.claims;
              }
              setTimeout(() => {
                if (userAdminRef.value && typeof userAdminRef.value.recordUserAuthentication === 'function' && user.value) {
                  userAdminRef.value.recordUserAuthentication(user.value)
                    .then(() => console.log('[Admin.vue] Successfully recorded Okta authentication'))
                    .catch((err: Error) => console.error('[Admin.vue] Error recording Okta authentication:', err));
                }
              }, 500);
            }
          }).catch((err: any) => {
            console.error('[Admin.vue] Error getting Okta auth state (Promise):', err);
          });
        } else if (authStateResult && typeof authStateResult === 'object') {
          // Synchronous result
          const authState = authStateResult;
          if (authState && authState.isAuthenticated) {
            isAuthenticated.value = true;
            authSource.value = 'okta';
            if (authState.idToken) {
              user.value = authState.idToken.claims;
            } else if (authState.accessToken) {
              user.value = authState.accessToken.claims;
            }
            setTimeout(() => {
              if (userAdminRef.value && typeof userAdminRef.value.recordUserAuthentication === 'function' && user.value) {
                userAdminRef.value.recordUserAuthentication(user.value)
                  .then(() => console.log('[Admin.vue] Successfully recorded Okta authentication'))
                  .catch((err: Error) => console.error('[Admin.vue] Error recording Okta authentication:', err));
              }
            }, 500);
          }
        }
      }
      
      // Check if we're on the userAdmin tab but not authenticated
      if (activeTab.value === 'userAdmin' && !isAuthenticated.value && !isLocalAdminAuthenticated.value) {
        console.log('[Admin.vue] User trying to access admin rights section without authentication, showing login modal');
        showLoginModal.value = true;
      }
      
      // Load data if authenticated
      if (isAuthenticated.value || isLocalAdminAuthenticated.value) {
        loadAdminData();
      }
    } catch (e) {
      console.error('[Admin.vue] Error during initialization:', e);
    }
  };
  
  // Use setTimeout to ensure we're fully client-side
  setTimeout(safeInitialization, 0);
});

// Clean up on component unmount
onUnmounted(() => {
  if (process.client && typeof window !== 'undefined') {
    try {
      // Remove event listeners
      window.removeEventListener('admin_section_change', handleAdminSectionChange);
    } catch (err) {
      console.error('[Admin.vue] Error cleaning up event listeners:', err);
    }
  }
});

// Function to load admin data
function loadAdminData() {
  loading.value = true;
  
  // Simulated data loading
  setTimeout(() => {
    // You would replace this with actual API calls
    console.log('[Admin.vue] Loading admin data...');
    loading.value = false;
  }, 1000);
}

// --- HELPER FUNCTIONS FOR DEBUGGING ---
// Password-related functions removed

// End of component script
</script>



