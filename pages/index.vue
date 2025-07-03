<template>  <div class="min-h-screen flex items-center justify-center bg-modernity">
    <div class="layout-container" :class="contentClass">
      <div class="layout-card rounded-2xl shadow-xl p-8 md:p-10" :class="{'p-4': isSmallScreen}">
        <div class="layout-tabs-container">          <header class="mb-6">
            <h1 class="font-extrabold text-security font-sans flex items-center gap-3 h-[40px]" 
                :class="{'text-3xl': !isSmallScreen, 'text-2xl': isSmallScreen, 'flex-col items-start': isSmallScreen && screenWidth < 400}">
              <span class="text-security">Digital Signature Tool</span>
              <span class="text-sm font-normal text-currency bg-security/10 px-3 py-1 rounded-full">v1.0.5</span>
            </h1>
              <!-- Tabs navigation -->
            <div class="mt-6 mb-6 border-b border-security/20">
              <nav class="-mb-px flex" :class="{'space-x-6': !isSmallScreen, 'space-x-4': isSmallScreen, 'justify-between': isSmallScreen}">
                <button
                  @click="activeTab = 'sign'"
                  :class="[
                    'whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm transition duration-200',
                    activeTab === 'sign' ? 'border-currency text-currency' : 'border-transparent text-modernity hover:text-security hover:border-security'
                  ]"
                >
                  Sign File
                </button>
                <button
                  @click="activeTab = 'about'"
                  :class="[
                    'whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm transition duration-200',
                    activeTab === 'about' ? 'border-currency text-currency' : 'border-transparent text-modernity hover:text-security hover:border-security'
                  ]"
                >
                  About
                </button>
                <button
                  @click="activeTab = 'admin'"
                  :class="[
                    'whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm transition duration-200',
                    activeTab === 'admin' ? 'border-currency text-currency' : 'border-transparent text-modernity hover:text-security hover:border-security'
                  ]"
                >
                  Admin
                </button>
              </nav>
            </div>
          </header>          <!-- Tab content with consistent height -->
          <div class="layout-tabs-content" :style="{ minHeight: isSmallScreen ? '400px' : '500px' }">
            <Transition name="tab-fade" mode="out-in">
              <div v-if="activeTab === 'sign'" class="tab-content" key="sign">
                <UploadForm />
                <!-- Logs below the form -->
                <div class="mt-8 layout-section">
                  <label class="font-semibold text-security mb-2" for="logs">System Logs</label>
                  <textarea
                    id="logs"
                    class="w-full h-64 min-h-[16rem] border border-security/20 rounded-lg p-3 bg-care/80 text-xs font-mono resize-none text-modernity"
                    readonly
                    :value="logs"
                  ></textarea>
                  <div class="mt-4 flex justify-between items-center">
                    <button 
                      class="btn btn-secondary btn-sm" 
                      title="Clear logs"
                      @click="logs = ''"
                    >
                      Clear Logs
                    </button>
                    <span class="text-xs text-security/50">{{ new Date().toLocaleString() }}</span>
                  </div>
                </div>
              </div>
              <div v-else-if="activeTab === 'about'" class="tab-content" key="about">
                <About />
              </div>
              <div v-else-if="activeTab === 'admin'" class="tab-content" key="admin">
                <Admin @auth-state="updateAuthState" />
              </div>
            </Transition>
          </div>
            <footer class="mt-auto pt-6" :class="{'pt-4': isSmallScreen}">
            <div class="text-xs text-currency text-center">
              © iBanFirst CyberSecurity Team. All rights reserved.
            </div>
          </footer>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, provide, watch, onMounted, nextTick } from 'vue'
import { useState } from '#app'
import UploadForm from '~/components/UploadForm.vue'
import About from '~/components/About.vue'
import Admin from '~/components/Admin.vue'
import { useNuxtApp } from '#app'
import { useOkta } from '~/composables/useOkta'
import { useLayout } from '~/composables/useLayout'
// VerifyForm import removed

// Use layout composable for responsive behavior
const { 
  isSmallScreen, 
  isMediumScreen, 
  isLargeScreen,
  screenWidth,
  contentClass,
  currentBreakpoint,
  updateLayout 
} = useLayout()

// Don't initialize Okta directly in the page component
// We'll only use it through the composable when needed
// This helps prevent multiple initializations

const logs = ref('')
provide('logs', logs)

const activeTab = useState('activeTab', () => 'sign')

const oktaError = ref(false)
const isAuthenticated = ref(false)

function updateAuthState(val) {
  isAuthenticated.value = val
}

onMounted(() => {
  const savedTab = localStorage.getItem('activeTab')
  // Make sure we don't try to set the tab to 'verify' since it's been disabled
  if (savedTab && savedTab !== 'verify') activeTab.value = savedTab
  else if (savedTab === 'verify') activeTab.value = 'sign' // Default to sign if verify was saved
  
  // Check Okta config on mount
  try {
    const oktaIssuer = import.meta.env.OKTA_ISSUER || process.env.OKTA_ISSUER
    const oktaClientId = import.meta.env.OKTA_CLIENT_ID || process.env.OKTA_CLIENT_ID
    if (!oktaIssuer || !oktaClientId || oktaIssuer.includes('your-okta-domain')) {
      oktaError.value = true
    }
  } catch {
    oktaError.value = true
  }
  
  // Update layout after initial render
  nextTick(() => {
    updateLayout()
  })
})

watch(activeTab, (val) => {
  if (process.client) {
    // Save the active tab to localStorage
    localStorage.setItem('activeTab', val)
    
    // Update layout after tab change to ensure proper dimensions
    nextTick(() => {
      updateLayout()
    })
  }
})
</script>
