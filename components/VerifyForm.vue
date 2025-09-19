<template>
  <div class="bg-security/5 p-4 rounded-lg border border-security/20 shadow-sm">
    <h2 class="text-lg font-semibold text-security border-b border-security/20 pb-2 mb-4">
      Signature Verification
    </h2>
    
    <form @submit.prevent="verifySignature" class="space-y-4">
      <div>
        <label class="form-label" for="script">Select a file to verify</label>
        <input
          id="script"
          type="file"
          accept=".ps1,.exe,.dll,.msi,.appx,.app"
          @change="handleScriptFile"
          required
          class="form-input input-file"
        />
        <p class="text-xs text-modernity/80 mt-1">
          Supported files: PowerShell scripts (.ps1), executables (.exe), libraries (.dll), etc.
        </p>
      </div>
      
      <button 
        type="submit" 
        class="btn btn-security btn-md relative w-full"
        :disabled="!scriptFile || loading"
      >
        <span :class="{'opacity-0': loading}" class="transition-opacity">Verify Signature</span>
        <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
          <div class="flex items-center gap-2">
            <div class="animate-spin rounded-full h-4 w-4 border-2 border-security border-t-transparent"></div>
            <span>Verifying...</span>
          </div>
        </div>
      </button>
    </form>

    <div v-if="error" class="mt-4 p-3 bg-energy/10 rounded-lg text-energy text-sm">
      {{ error }}
    </div>

    <div v-if="result !== null && !loading" 
         class="p-4 rounded-lg border mt-6" 
         :class="result.valid ? 'border-currency bg-currency/5' : 'border-energy bg-energy/5'">
      
      <div class="font-semibold text-lg flex items-center gap-2 mb-3"
          :class="result.valid ? 'text-currency' : 'text-energy'">
        <template v-if="result.valid">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="10" fill="#64ffa2/20"/>
            <path stroke="#64ffa2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2l4-4"/>
          </svg>
          Valid signature
        </template>
        <template v-else>
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="10" fill="#ff5249/20"/>
            <path stroke="#ff5249" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          Invalid or missing signature
        </template>
      </div>
      
      <p class="text-sm text-modernity mb-3">{{ result.message }}</p>
      
      <div v-if="result.file" class="text-xs text-modernity/80 p-2 bg-security/10 rounded">
        <div><strong>File:</strong> {{ result.file.name }}</div>
        <div><strong>Size:</strong> {{ formatSize(result.file.size) }}</div>
      </div>
      
      <div v-if="result.explanation" class="mt-4 p-3 bg-care/30 rounded-lg text-xs">
        <h4 class="font-medium text-security mb-1">{{ result.explanation.title }}</h4>
        <ul class="list-disc pl-4 space-y-1 text-modernity">
          <li v-for="(item, index) in result.explanation.content" :key="index">
            {{ item }}
          </li>
        </ul>
      </div>
      
      <div v-if="result.details?.signatureBlock" class="mt-4">
        <details>
          <summary class="text-sm font-medium text-security cursor-pointer">Show signature block</summary>
          <pre class="mt-2 p-2 bg-security/10 rounded text-xs overflow-auto max-h-40">{{ result.details.signatureBlock }}</pre>
        </details>
      </div>
      
      <div v-if="result.details?.macosCodeSignResult" class="mt-4">
        <details>
          <summary class="text-sm font-medium text-security cursor-pointer">macOS codesign result</summary>
          <pre class="mt-2 p-2 bg-security/10 rounded text-xs overflow-auto max-h-40">{{ result.details.macosCodeSignResult }}</pre>
        </details>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const scriptFile = ref(null)
const result = ref(null)
const loading = ref(false)
const error = ref('')

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
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
</script>
