<template>
  <div class="min-h-screen flex items-center justify-center bg-modernity">
    <div class="bg-care rounded-2xl shadow-xl p-10 w-full max-w-5xl border border-gray-200 flex flex-col md:flex-row gap-8">
      <!-- Left: Tabs + Forms -->
      <div class="w-full md:w-2/3">
        <h1 class="text-3xl font-extrabold text-security mb-6 font-sans">
          Digital Signature Tool
        </h1>

        <!-- Tabs -->
        <div class="mb-6 border-b border-gray-200">
          <nav class="-mb-px flex space-x-6">
            <button
              @click="activeTab = 'sign'"
              :class="activeTab === 'sign' ? 'border-currency text-currency' : 'border-transparent text-modernity hover:text-security hover:border-security'"
              class="whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm"
            >
              Sign File
            </button>
            <button
              @click="activeTab = 'about'"
              :class="activeTab === 'about' ? 'border-currency text-currency' : 'border-transparent text-modernity hover:text-security hover:border-security'"
              class="whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm"
            >
              About
            </button>
            <button
              @click="activeTab = 'admin'"
              :class="activeTab === 'admin' ? 'border-currency text-currency' : 'border-transparent text-modernity hover:text-security hover:border-security'"
              class="whitespace-nowrap pb-2 px-1 border-b-2 font-medium text-sm"
            >
              Admin
            </button>
          </nav>
        </div>

        <!-- Tab content -->
        <div>
          <div v-if="activeTab === 'sign'">
            <UploadForm />
          </div>
          <div v-else-if="activeTab === 'about'">
            <About />
          </div>
          <div v-else-if="activeTab === 'admin'"> 
            <Admin />
          </div>
        </div>
        <div class="text-xs text-gray-400 mt-4 text-center"> © iBanFirst. All rights reserved. </div>
      </div>
      <!-- Right: Logs -->
      <div class="w-full md:w-1/3 flex flex-col">
        <label class="font-semibold text-modernity mb-2" for="logs">Logs</label>
        <textarea
          id="logs"
          class="w-full h-64 border border-gray-300 rounded-lg p-3 bg-care text-xs font-mono resize-none text-modernity"
          readonly
          :value="logs"
        ></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, provide, watch, onMounted } from 'vue'
import { useState } from '#app'
import UploadForm from '~/components/UploadForm.vue'
import About from '~/components/About.vue'
import Admin from '~/components/Admin.vue'
import { useNuxtApp } from '#app'
import { useOkta } from '~/composables/useOkta'

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
  if (savedTab) activeTab.value = savedTab
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
})

watch(activeTab, (val) => {
  if (process.client) localStorage.setItem('activeTab', val)
})
</script>
