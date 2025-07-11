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
      
      <form @submit.prevent="saveOktaConfig" class="space-y-4">
        <div class="space-y-2">
          <label for="oktaIssuer" class="block text-sm font-medium text-security">Okta Issuer URL</label>
          <input 
            id="oktaIssuer" 
            v-model="oktaConfig.issuer" 
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
            v-model="oktaConfig.clientId" 
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
            v-model="oktaConfig.redirectUri" 
            type="text" 
            :placeholder="oktaRedirectUriPlaceholder"
            class="w-full px-3 py-2 border border-security-30 rounded-lg bg-care text-modernity focus:ring-2 focus:ring-security focus:border-security outline-none" 
          />
          <p class="text-xs text-modernity-70">The callback URL registered in your Okta application</p>
        </div>
        
        <div class="space-y-2">
          <label class="block text-sm font-medium text-security">Authentication Flow</label>
          <div class="flex gap-4">
            <label class="inline-flex items-center">
              <input type="radio" v-model="oktaConfig.useImplicit" :value="false" class="text-security focus:ring-security" />
              <span class="ml-2">Authorization Code with PKCE (Recommended)</span>
            </label>
            <label class="inline-flex items-center">
              <input type="radio" v-model="oktaConfig.useImplicit" :value="true" class="text-security focus:ring-security" />
              <span class="ml-2">Implicit Flow</span>
            </label>
          </div>
          <p class="text-xs text-modernity-70">Choose the authentication flow that matches your Okta app configuration</p>
        </div>
        
        <div class="pt-4 flex gap-3">
          <button 
            type="submit" 
            class="btn btn-primary btn-md"
            :disabled="savingOktaConfig"
          >
            <span v-if="!savingOktaConfig">Save Configuration</span>
            <span v-else class="flex items-center gap-2">
              <span class="inline-block h-4 w-4 border-2 border-t-transparent border-care animate-spin rounded-full"></span>
              Saving...
            </span>
          </button>
          <button 
            type="button" 
            @click="resetOktaConfig" 
            class="btn btn-outline btn-md"
          >
            Reset to Defaults
          </button>
        </div>
        
        <!-- Configuration status messages -->
        <div v-if="configSaveSuccess" class="p-3 rounded-lg bg-currency-10 border border-currency text-currency">
          ✅ Configuration saved successfully. You'll need to log in again with the new settings.
        </div>
        <div v-if="configSaveError" class="p-3 rounded-lg bg-energy-10 border border-energy text-energy">
          ❌ Error saving configuration: {{ configSaveError }}
        </div>
      </form>
      
      <!-- Current Auth State -->
      <div class="mt-6 border-t border-security-10 pt-4">
        <h4 class="text-sm font-medium text-security mb-2">Current Authentication State</h4>
        <div class="bg-security-5 p-3 rounded-lg text-sm">
          <div class="mb-2 space-y-1">
            <div class="flex items-center">
              <span class="font-semibold mr-2">Authentication Method:</span> 
              <span v-if="isAuthenticated" class="bg-currency-20 text-currency px-2 py-0.5 rounded flex items-center">
                <span class="mr-1">Okta</span> ✅
              </span>
              <span v-else-if="isLocalAdminAuthenticated" class="bg-currency-20 text-currency px-2 py-0.5 rounded flex items-center">
                <span class="mr-1">Local Admin</span> ✅
              </span>
              <span v-else class="bg-energy-20 text-energy px-2 py-0.5 rounded flex items-center">
                <span class="mr-1">None</span> ❌
              </span>
            </div>
            <p v-if="user"><span class="font-semibold">User:</span> {{ user.name || user.email }}</p>
            <p v-if="isLocalAdminAuthenticated"><span class="font-semibold">User:</span> Local Admin</p>
            <p v-if="isAuthenticated"><span class="font-semibold">Auth Flow:</span> {{ oktaConfig.useImplicit ? 'Implicit' : 'Authorization Code (PKCE)' }}</p>
          </div>
        </div>
        
        <div class="mt-4 flex flex-wrap gap-3">
          <button 
            @click="testOktaConnection" 
            class="btn btn-secondary btn-sm"
            :disabled="testingConnection"
          >
            <span v-if="!testingConnection">Test Okta Connection</span>
            <span v-else class="flex items-center gap-2">
              <span class="inline-block h-4 w-4 border-2 border-t-transparent border-care animate-spin rounded-full"></span>
              Testing...
            </span>
          </button>
          
          <!-- Authentication buttons -->
          <div class="flex gap-2">
            <!-- Okta auth buttons -->
            <button 
              v-if="isAuthenticated" 
              @click="logout" 
              class="btn btn-outline btn-sm"
            >
              Log Out (Okta)
            </button>
            <button 
              v-else
              @click="loginWithOkta" 
              class="btn btn-outline btn-sm"
            >
              Log In with Okta
            </button>
            
            <!-- Local admin logout -->
            <button 
              v-if="isLocalAdminAuthenticated" 
              @click="logoutLocalAdmin" 
              class="btn btn-outline btn-sm"
            >
              Log Out (Local Admin)
            </button>
          </div>
          
          <!-- Show local admin password regenerate option -->
          <div v-if="isLocalAdminAuthenticated" class="w-full mt-2">
            <button 
              @click="regenerateAdminPassword" 
              class="text-xs text-security-70 hover-text-security"
            >
              Regenerate local admin password
            </button>
            <p class="text-xs text-modernity-60 mt-1">
              The new password will be logged to the browser console.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { useOkta } from '~/composables/useOkta';
import { useRuntimeConfig } from '#app';

export default {
  name: 'ConfigManagement',
  setup() {
    const { 
      isAuthenticated,
      isLocalAdminAuthenticated, 
      user,
      loginWithOkta,
      logout,
      logoutLocalAdmin
    } = useOkta();
    
    return {
      isAuthenticated,
      isLocalAdminAuthenticated,
      user,
      loginWithOkta,
      logout,
      logoutLocalAdmin
    };
  },
  data() {
    return {
      oktaConfig: {
        issuer: '',
        clientId: '',
        redirectUri: '',
        useImplicit: false
      },
      oktaRedirectUriPlaceholder: window?.location?.origin 
        ? `${window.location.origin}/login/callback` 
        : 'http://your-app-url/login/callback',
      savingOktaConfig: false,
      configSaveSuccess: false,
      configSaveError: null,
      testingConnection: false,
    }
  },
  mounted() {
    this.loadOktaConfig();
  },
  methods: {
    loadOktaConfig() {
      // Try to load config from local storage
      try {
        const storedConfig = localStorage.getItem('securityconsole_okta_config');
        if (storedConfig) {
          console.log('[ConfigManagement] Loading Okta config from localStorage');
          this.oktaConfig = JSON.parse(storedConfig);
        } else {
          // Load from environment or defaults using runtime config
          const runtimeConfig = useRuntimeConfig();
          this.oktaConfig = {
            issuer: runtimeConfig.public.oktaIssuer || '',
            clientId: runtimeConfig.public.oktaClientId || '',
            redirectUri: runtimeConfig.public.oktaRedirectUri || this.oktaRedirectUriPlaceholder,
            useImplicit: runtimeConfig.public.oktaUseImplicit === 'true' || false
          };
          console.log('[ConfigManagement] Loading Okta config from environment variables');
        }
        console.log('[ConfigManagement] Loaded config:', JSON.stringify(this.oktaConfig));
      } catch (error) {
        console.error('[ConfigManagement] Error loading Okta configuration:', error);
      }
    },
    
    resetOktaConfig() {
      localStorage.removeItem('securityconsole_okta_config');
      this.loadOktaConfig();
      this.configSaveSuccess = true;
      this.configSaveError = null;
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        this.configSaveSuccess = false;
      }, 3000);
      
      // Dispatch event for other components to know config has changed
      window.dispatchEvent(new Event('okta_config_changed'));
    },
    
    async saveOktaConfig() {
      this.savingOktaConfig = true;
      this.configSaveError = null;
      this.configSaveSuccess = false;
      
      try {
        // Validate the config
        if (!this.oktaConfig.issuer) {
          throw new Error('Issuer URL is required');
        }
        if (!this.oktaConfig.clientId) {
          throw new Error('Client ID is required');
        }
        if (!this.oktaConfig.redirectUri) {
          throw new Error('Redirect URI is required');
        }
        
        // Save to local storage
        localStorage.setItem('securityconsole_okta_config', JSON.stringify(this.oktaConfig));
        console.log('[ConfigManagement] Saved Okta config to localStorage');
        
        this.configSaveSuccess = true;
        
        // Dispatch event for other components to know config has changed
        window.dispatchEvent(new Event('okta_config_changed'));
      } catch (error) {
        this.configSaveError = error.message;
      } finally {
        this.savingOktaConfig = false;
        
        // Hide success message after 3 seconds
        if (this.configSaveSuccess) {
          setTimeout(() => {
            this.configSaveSuccess = false;
          }, 3000);
        }
      }
    },
    
    async testOktaConnection() {
      this.testingConnection = true;
      this.configSaveError = null;
      
      try {
        // Test the connection by checking if the issuer is valid
        const response = await fetch(`${this.oktaConfig.issuer}/.well-known/openid-configuration`, {
          method: 'GET',
          headers: {
            Accept: 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Okta connection test failed: ${response.status}`);
        }
        
        // Successfully connected
        alert('Successfully connected to Okta');
      } catch (error) {
        this.configSaveError = `Connection test failed: ${error.message}`;
      } finally {
        this.testingConnection = false;
      }
    },
    
    async regenerateAdminPassword() {
      if (!confirm('Are you sure you want to regenerate the local admin password? The new password will be displayed in the console.')) {
        return;
      }
      
      try {
        const response = await fetch('/api/admin-data?type=regenerate-password', {
          method: 'POST'
        });
        
        if (!response.ok) {
          throw new Error(`Error regenerating password: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('New admin password:', data.password);
        alert('New password has been generated and logged to the console.');
      } catch (error) {
        console.error('Error regenerating password:', error);
        alert(`Failed to regenerate password: ${error.message}`);
      }
    }
  }
}
</script>
