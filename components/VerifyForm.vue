<template>
  <div class="bg-white p-6 rounded-xl border border-security/20 shadow-sm">
    <h2 class="text-xl font-bold text-security mb-6 flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
      Standard Signature Verification
    </h2>
    
    <form @submit.prevent="verifySignature" class="space-y-6">
      <div class="file-upload-wrapper">
        <label class="block font-medium text-gray-700 mb-2" for="script">Select a file to verify</label>
        <div class="relative border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-security/40 transition-colors duration-300 bg-gray-50">
          <input
            id="script"
            type="file"
            accept=".ps1,.exe,.dll,.msi,.appx,.app"
            @change="handleScriptFile"
            required
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          
          <div class="text-center" v-if="!scriptFile">
            <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p class="mt-1 text-sm text-gray-600">Drag and drop a file here or click to browse</p>
            <p class="mt-1 text-xs text-gray-500">Supported files: PowerShell scripts (.ps1), executables (.exe), libraries (.dll), etc.</p>
          </div>
          
          <div v-else class="flex items-center">
            <div class="flex-shrink-0 p-2 bg-security/10 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8 text-security" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div class="ml-4 flex-1 min-w-0">
              <div class="text-sm font-medium text-gray-900 truncate">{{ scriptFile.name }}</div>
              <div class="text-xs text-gray-500">{{ formatSize(scriptFile.size) }}</div>
            </div>
            <button 
              type="button" 
              @click="clearFile"
              class="flex-shrink-0 ml-4 text-sm font-medium text-energy hover:text-energy/70 focus:outline-none focus:underline"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
      
      <button 
        type="submit" 
        class="w-full py-3 px-4 bg-security hover:bg-security/90 focus:ring-2 focus:ring-offset-2 focus:ring-security/50 text-white font-medium rounded-lg shadow-sm focus:outline-none transition-all duration-200 relative"
        :disabled="!scriptFile || loading"
        :class="{'opacity-80': !scriptFile || loading}"
      >
        <span :class="{'opacity-0': loading}" class="transition-opacity flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Verify File Signature
        </span>
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
          <div class="flex items-center gap-2">
            <div class="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
            <span>Verifying...</span>
          </div>
        </div>
      </button>
    </form>

    <div v-if="error" class="mt-6 p-4 bg-energy/10 rounded-lg border border-energy/20 text-energy flex items-start">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span>{{ error }}</span>
    </div>

    <transition 
      name="fade"
      mode="out-in"
      appear
    >
      <div v-if="result !== null && !loading" 
          class="p-6 rounded-xl border mt-8 shadow-sm" 
          :class="result.valid ? 'border-currency bg-gradient-to-br from-currency/5 to-currency/10' : 'border-energy bg-gradient-to-br from-energy/5 to-energy/10'">
        
        <div class="flex items-center mb-4">
          <div class="rounded-full p-2" :class="result.valid ? 'bg-currency/20' : 'bg-energy/20'">
            <svg v-if="result.valid" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-currency" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-6 w-6 text-energy" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div class="ml-4">
            <h3 class="text-lg font-bold" :class="result.valid ? 'text-currency' : 'text-energy'">
              {{ result.valid ? 'Valid Signature' : 'Invalid or Missing Signature' }}
            </h3>
            <p class="text-gray-700">{{ result.message }}</p>
          </div>
        </div>
        
        <div class="bg-white/60 rounded-lg p-4 border" :class="result.valid ? 'border-currency/20' : 'border-energy/20'">
          <h4 class="font-medium text-gray-900 mb-2">File Details</h4>
          <div class="grid grid-cols-2 gap-4">
            <div class="text-sm">
              <span class="font-medium text-gray-700">Name:</span>
              <span class="ml-2 text-gray-900">{{ result.file?.name }}</span>
            </div>
            <div class="text-sm">
              <span class="font-medium text-gray-700">Size:</span>
              <span class="ml-2 text-gray-900">{{ formatSize(result.file?.size) }}</span>
            </div>
          </div>
        </div>
        
        <div v-if="result.explanation" class="mt-4 p-4 bg-white/60 rounded-lg border border-gray-200">
          <h4 class="font-medium text-gray-900 mb-2">{{ result.explanation.title }}</h4>
          <ul class="list-disc pl-5 space-y-1.5 text-sm text-gray-700">
            <li v-for="(item, index) in result.explanation.content" :key="index">
              {{ item }}
            </li>
          </ul>
        </div>
        
        <div class="mt-6 space-y-3">
          <div v-if="result.details?.signatureBlock" class="bg-white/60 rounded-lg border border-gray-200 overflow-hidden">
            <button 
              @click="toggleSignatureBlock" 
              class="w-full px-4 py-3 flex justify-between items-center focus:outline-none"
            >
              <span class="font-medium text-gray-900 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-security" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Signature Block
              </span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                class="h-5 w-5 text-gray-500 transition-transform"
                :class="{'rotate-180': showSignatureBlock}"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="showSignatureBlock" class="border-t border-gray-200 px-4 py-3">
              <pre class="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-60 font-mono text-gray-700">{{ result.details.signatureBlock }}</pre>
            </div>
          </div>
          
          <div v-if="result.details?.macosCodeSignResult" class="bg-white/60 rounded-lg border border-gray-200 overflow-hidden">
            <button 
              @click="toggleMacOSResult" 
              class="w-full px-4 py-3 flex justify-between items-center focus:outline-none"
            >
              <span class="font-medium text-gray-900 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-security" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
                macOS codesign Result
              </span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                class="h-5 w-5 text-gray-500 transition-transform"
                :class="{'rotate-180': showMacOSResult}"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            <div v-if="showMacOSResult" class="border-t border-gray-200 px-4 py-3">
              <pre class="bg-gray-50 p-3 rounded text-xs overflow-auto max-h-60 font-mono text-gray-700">{{ result.details.macosCodeSignResult }}</pre>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const scriptFile = ref(null)
const result = ref(null)
const loading = ref(false)
const error = ref('')
const showSignatureBlock = ref(false)
const showMacOSResult = ref(false)

function handleScriptFile(event) {
  const file = event.target.files[0]
  if (!file) {
    scriptFile.value = null
    return
  }
  
  scriptFile.value = file
  result.value = null
  error.value = ''
}

function clearFile() {
  scriptFile.value = null
  result.value = null
  error.value = ''
}

function toggleSignatureBlock() {
  showSignatureBlock.value = !showSignatureBlock.value
}

function toggleMacOSResult() {
  showMacOSResult.value = !showMacOSResult.value
}

async function verifySignature() {
  if (!scriptFile.value) {
    error.value = 'Please select a file to verify'
    return
  }
  
  loading.value = true
  result.value = null
  error.value = ''
  
  try {
    // Prepare data for sending
    const formData = new FormData()
    formData.append('script', scriptFile.value)
    
    // Call the signature verification API
    const response = await fetch('/api/verify-signature', {
      method: 'POST',
      body: formData
    })
    
    if (response.ok) {
      result.value = await response.json()
      // Reset accordion states
      showSignatureBlock.value = false
      showMacOSResult.value = false
    } else {
      const errorText = await response.text()
      error.value = `Error verifying: ${response.status} ${response.statusText}. ${errorText}`
    }
  } catch (err) {
    error.value = `Error verifying: ${err.message}`
  } finally {
    loading.value = false
  }
}

function formatSize(bytes) {
  if (bytes === 0 || !bytes) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>

<style scoped>
/* Fade animation for results */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(10px);
}

/* Custom file input styling */
.file-upload-wrapper input[type="file"] {
  z-index: 2;
}

.file-upload-wrapper:hover {
  cursor: pointer;
}
</style>
