<template>
  <div class="bg-security/5 p-4 rounded-lg border border-security/20 shadow-sm">
    <h2 class="text-lg font-semibold text-security border-b border-security/20 pb-2 mb-4">
      Advanced Signature Verification
    </h2>
    
    <form ref="uploadForm" @submit.prevent="verifyFile" class="space-y-4">
      <div>
        <label class="form-label" for="fileUpload">Select a file to verify</label>
        <input
          id="fileUpload"
          type="file"
          accept=".ps1,.cmd,.bat,.exe,.dll,.msi,.appx,.app"
          @change="onFileSelected"
          required
          class="form-input input-file"
          ref="fileInput"
        />
        <p class="text-xs text-modernity/80 mt-1">
          Supported files: PowerShell scripts (.ps1), CMD scripts (.cmd, .bat), executables (.exe), etc.
        </p>
      </div>
      
      <div class="bg-security/10 p-3 rounded-lg border border-security/20">
        <h3 class="text-sm font-medium text-security mb-2">Verification Options</h3>
        <div class="space-y-2">
          <div class="flex items-center">
            <input class="form-checkbox" type="checkbox" v-model="options.deepScan" id="deepScan">
            <label class="form-check-label ml-2 text-sm text-modernity" for="deepScan">
              Deep scan (slower but more accurate)
            </label>
          </div>
          
          <div class="flex items-center">
            <input class="form-checkbox" type="checkbox" v-model="options.checkCertificateRevocation" id="checkRevocation">
            <label class="form-check-label ml-2 text-sm text-modernity" for="checkRevocation">
              Check certificate revocation
            </label>
          </div>
          
          <div class="flex items-center">
            <input class="form-checkbox" type="checkbox" v-model="options.checkTrustedRoots" id="checkTrustedRoots">
            <label class="form-check-label ml-2 text-sm text-modernity" for="checkTrustedRoots">
              Verify trusted root certificates
            </label>
          </div>
        </div>
      </div>
      
      <button 
        type="submit" 
        class="btn btn-security btn-md relative w-full"
        :disabled="isVerifying"
      >
        <span :class="{'opacity-0': isVerifying}" class="transition-opacity">
          <i class="fas fa-shield-alt mr-2"></i>Verify Signature
        </span>
        <div v-if="isVerifying" class="absolute inset-0 flex items-center justify-center">
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

    <div v-if="result !== null && !isVerifying" 
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
      
      <!-- Security Score -->
      <div v-if="result.securityScore !== undefined" class="mb-4">
        <h3 class="text-sm font-medium text-security mb-2">Security Score</h3>
        <div class="bg-security/10 p-2 rounded-lg">
          <div class="relative w-full h-4 bg-modernity/20 rounded overflow-hidden">
            <div class="absolute top-0 left-0 h-full transition-all duration-500"
                :style="`width: ${result.securityScore * 10}%`"
                :class="scoreProgressClass">
            </div>
          </div>
          <div class="mt-1 text-xs flex justify-between text-modernity/80">
            <span>0</span>
            <span>{{ result.securityScore }}/10</span>
            <span>10</span>
          </div>
          <p v-if="result.explanation?.securityScore?.interpretation" 
             class="text-xs mt-1 text-modernity">
            {{ result.explanation.securityScore.interpretation }}
          </p>
        </div>
      </div>
      
      <!-- File Info -->
      <div v-if="result.file" class="text-xs text-modernity/80 p-2 bg-security/10 rounded mb-4">
        <div><strong>File:</strong> {{ result.file.name }}</div>
        <div><strong>Size:</strong> {{ formatFileSize(result.file.size) }}</div>
        <div><strong>Type:</strong> {{ result.file.type }}</div>
        <div><strong>Last modified:</strong> {{ formatDate(result.file.lastModified) }}</div>
      </div>
      
      <!-- Certificate Info -->
      <div v-if="result.certificateInfo" class="mb-4">
        <details>
          <summary class="text-sm font-medium text-security cursor-pointer">Certificate Details</summary>
          <div class="mt-2 p-2 bg-security/10 rounded text-xs">
            <div class="grid grid-cols-3 gap-1 mb-1">
              <div class="font-semibold">Subject</div>
              <div class="col-span-2">{{ result.certificateInfo.subject }}</div>
            </div>
            <div class="grid grid-cols-3 gap-1 mb-1">
              <div class="font-semibold">Issuer</div>
              <div class="col-span-2">{{ result.certificateInfo.issuer }}</div>
            </div>
            <div v-if="result.certificateInfo.validityPeriod" class="grid grid-cols-3 gap-1 mb-1">
              <div class="font-semibold">Validity</div>
              <div class="col-span-2" :class="{ 'text-energy': !result.certificateInfo.validityPeriod.isValid }">
                {{ formatDate(result.certificateInfo.validityPeriod.notBefore) }} - 
                {{ formatDate(result.certificateInfo.validityPeriod.notAfter) }}
                <span v-if="!result.certificateInfo.validityPeriod.isValid" 
                      class="text-xs bg-energy/20 text-energy px-1 py-0.5 rounded ml-1">
                  Expired
                </span>
              </div>
            </div>
            <div v-if="result.certificateInfo.fingerprints?.sha256" class="grid grid-cols-3 gap-1 mb-1">
              <div class="font-semibold">SHA-256</div>
              <div class="col-span-2 font-mono text-2xs break-all">{{ result.certificateInfo.fingerprints.sha256 }}</div>
            </div>
            <div v-if="result.certificateInfo.keyStrength" class="grid grid-cols-3 gap-1 mb-1">
              <div class="font-semibold">Key Strength</div>
              <div class="col-span-2">
                {{ result.certificateInfo.keyStrength }} bits
                <span v-if="result.certificateInfo.keyStrength < 2048" 
                      class="text-xs bg-energy/20 text-energy px-1 py-0.5 rounded ml-1">
                  Weak
                </span>
              </div>
            </div>
            <div v-if="result.certificateInfo.isSelfSigned !== undefined" class="grid grid-cols-3 gap-1">
              <div class="font-semibold">Self-signed</div>
              <div class="col-span-2" :class="{ 'text-energy': result.certificateInfo.isSelfSigned }">
                {{ result.certificateInfo.isSelfSigned ? 'Yes' : 'No' }}
                <span v-if="result.certificateInfo.isSelfSigned" 
                      class="text-xs bg-energy/20 text-energy px-1 py-0.5 rounded ml-1">
                  Less secure
                </span>
              </div>
            </div>
          </div>
        </details>
      </div>
      
      <!-- Verification Methods -->
      <div v-if="result.explanation?.verificationMethods" class="mb-4">
        <details>
          <summary class="text-sm font-medium text-security cursor-pointer">Verification Methods</summary>
          <div class="mt-2 space-y-2">
            <div v-for="(method, key) in result.explanation.verificationMethods" :key="key"
                 class="p-2 rounded text-xs"
                 :class="method.result === 'Passed' ? 'bg-currency/10' : 'bg-energy/10'">
              <div class="flex justify-between">
                <span class="font-medium">{{ method.name }}</span>
                <span :class="method.result === 'Passed' ? 'text-currency' : 'text-energy'">
                  {{ method.result }}
                </span>
              </div>
              <p class="text-modernity mt-1">{{ method.description }}</p>
            </div>
          </div>
        </details>
      </div>
      
      <!-- Warnings -->
      <div v-if="result.warnings && result.warnings.length" class="mb-4">
        <details>
          <summary class="text-sm font-medium text-energy cursor-pointer">Warnings</summary>
          <div class="mt-2 p-2 bg-energy/10 rounded">
            <ul class="list-disc pl-4 space-y-1 text-xs text-modernity">
              <li v-for="(warning, index) in result.warnings" :key="index">
                {{ warning }}
              </li>
            </ul>
          </div>
        </details>
      </div>
      
      <!-- Recommendations -->
      <div v-if="result.recommendations && result.recommendations.length" class="mb-4">
        <details>
          <summary class="text-sm font-medium text-security cursor-pointer">Recommendations</summary>
          <div class="mt-2 p-2 bg-care/20 rounded">
            <ul class="list-disc pl-4 space-y-1 text-xs text-modernity">
              <li v-for="(recommendation, index) in result.recommendations" :key="index">
                {{ recommendation }}
              </li>
            </ul>
          </div>
        </details>
      </div>
      
      <!-- Fallback notice -->
      <div v-if="result.usingFallback" class="mt-4 p-2 bg-energy/10 rounded text-xs text-energy">
        Note: Using simplified verification due to unavailable advanced verification module.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'

const fileInput = ref(null)
const uploadForm = ref(null)
const isVerifying = ref(false)
const result = ref(null)
const error = ref(null)
const selectedFile = ref(null)
const options = ref({
  deepScan: false,
  checkCertificateRevocation: false,
  checkTrustedRoots: false
})

const onFileSelected = (event) => {
  selectedFile.value = event.target.files[0]
  result.value = null
  error.value = null
}

const verifyFile = async () => {
  if (!selectedFile.value) {
    error.value = "Please select a file to verify."
    return
  }
  
  try {
    isVerifying.value = true
    error.value = null
    result.value = null
    
    const formData = new FormData()
    formData.append('script', selectedFile.value)
    
    // Add options
    if (options.value.deepScan) {
      formData.append('deepScan', 'true')
    }
    
    if (options.value.checkCertificateRevocation) {
      formData.append('checkCertificateRevocation', 'true')
    }
    
    if (options.value.checkTrustedRoots) {
      formData.append('checkTrustedRoots', 'true')
    }
    
    const response = await fetch('/api/verify-advanced', {
      method: 'POST',
      body: formData
    })
    
    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || `Erreur ${response.status}: ${response.statusText}`)
    }
    
    result.value = await response.json()
    console.log('Verification result:', result.value)
  } catch (err) {
    console.error('Verification error:', err)
    error.value = err.message || "An error occurred during verification"
  } finally {
    isVerifying.value = false
  }
}

// Formatting helpers
const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const formatDate = (dateStr) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleString()
}

// Computed properties for styling
const scoreProgressClass = computed(() => {
  if (!result.value || !result.value.securityScore) return 'bg-modernity/50'
  
  const score = result.value.securityScore
  
  if (score >= 8) return 'bg-currency'
  if (score >= 5) return 'bg-care'
  return 'bg-energy'
})
</script>

<style scoped>
.text-2xs {
  font-size: 0.65rem;
}
</style>