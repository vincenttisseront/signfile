<template>
  <div>
    <!-- Use display CSS instead of v-if to prevent layout shifts during hydration -->
    <div 
      :class="{'opacity-100': hydratedOrSSR, 'opacity-0': !hydratedOrSSR}"
      class="max-w-3xl mx-auto space-y-8 transition-opacity duration-300"
    >
      <!-- Certificate selection step with improved UI -->
      <div v-if="!selectedCertificate || (passwordRequired && !passwordEntered)" class="min-h-[150px]">
        <div class="bg-care p-4 rounded-lg border border-security/20 shadow-sm">
          <h2 class="text-lg font-semibold text-security mb-3 border-b border-security-30 pb-1">Select a certificate from the list below:</h2>
          
          <div v-if="loadingCerts" class="py-4 text-center">
            <div class="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-security mx-auto"></div>
            <p class="text-security mt-2 text-sm">Loading certificates...</p>
          </div>
          
          <div v-else-if="certificates.length === 0" class="p-4 text-center bg-security/5 rounded-md">
            <div class="text-3xl mb-2">📁</div>
            <p class="text-security">No certificates available</p>
            <p class="text-sm text-security-70 mt-1">Please upload certificates in the Admin section first</p>
            <NuxtLink to="/admin?section=certificates" class="btn btn-primary btn-sm mt-3">
              Go to Admin
            </NuxtLink>
          </div>
          
          <div v-else class="space-y-3">            
            <div class="grid gap-3">
              <div v-for="cert in certificates" :key="cert.name" 
                   class="border border-security/20 rounded-md p-2.5 cursor-pointer hover:bg-security/5 transition-colors"
                   :class="{'bg-security/10 border-security': selectedCertificate?.name === cert.name}"
                   @click="selectCertificate(cert)">
                <div class="flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <div class="text-security">🔐</div>
                    <div>
                      <div class="font-medium text-security">{{ cert.name }}</div>
                      <div class="text-xs text-security-70" v-if="cert.metadata">
                        <span v-if="cert.metadata.uploadedBy">Uploaded by: {{ cert.metadata.uploadedBy }}</span>
                        <span v-if="cert.metadata.uploadedAt"> · {{ formatDate(cert.metadata.uploadedAt) }}</span>
                      </div>
                    </div>
                  </div>
                  <div class="flex items-center">
                    <span v-if="selectedCertificate?.name === cert.name" class="text-currency">
                      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <!-- Password popup -->      
      <div
        v-if="showPasswordPopup"
        class="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-md bg-modernity/20"
      >
        <div class="bg-care rounded-xl shadow-lg p-6 w-full max-w-xs border border-security/20">
          <h2 class="text-lg font-semibold mb-4 text-security">Certificate Password Required</h2>
          <p class="mb-4 text-modernity text-sm">Please enter the password for this certificate to continue.</p>
          
          <div class="mb-5">
            <label class="form-label" for="certPassword">Password</label>
            <input
              id="certPassword"
              type="password"
              v-model="password"
              placeholder="Enter certificate password"
              class="form-input"
              @keyup.enter="submitPassword"
            />
            <div v-if="passwordError" class="text-energy text-xs mt-2">{{ passwordError }}</div>
          </div>
          
          <div class="flex justify-end gap-2">
            <button @click="cancelPassword" class="btn btn-outline btn-md">Cancel</button>
            <button @click="submitPassword" class="btn btn-primary btn-md">OK</button>
          </div>
        </div>
      </div>
      
      <!-- Script signing step -->
      <form
        v-if="selectedCertificate && (!passwordRequired || passwordEntered) && !showPasswordPopup"
        @submit.prevent="handleSubmit"
        class="space-y-6"
      >
        <div>
          <label class="block mb-1 font-medium text-security flex items-center gap-2">
            Certificate Selected
            <span class="ml-1 text-currency" title="Certificate loaded">
              <svg xmlns="http://www.w3.org/2000/svg" class="inline w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" fill="#64ffa2/20"/>
                <path stroke="#64ffa2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2l4-4"/>
              </svg>
            </span>
          </label>
          <div class="text-xs text-security/70 mt-1 flex items-center gap-2">
            <span class="inline-block w-2 h-2 bg-currency rounded-full"></span>
            <span>Certificate loaded: {{ selectedCertificate.name }}</span>
          </div>
          <!-- Unload button -->
          <div class="flex gap-2 mt-2">
            <button type="button" class="btn btn-outline btn-sm" @click="showUnloadConfirm = true">Unload</button>
          </div>
        </div>
        <div>
          <label class="block mb-1 font-medium text-security" for="scriptFile">Select script file to sign</label>
          <input
            id="scriptFile"
            type="file"
            accept=".txt,.js,.ts,.json,.ps1,.cmd"
            @change="handleScriptFile"
            required
            class="form-input input-file"
          />
        </div>

        <div v-if="error" class="text-energy text-sm p-2 bg-energy/10 rounded-lg">{{ error }}</div>        
        <button
          type="submit"
          :disabled="!scriptFile || loading"
          class="btn btn-primary btn-lg btn-full relative"
        >
          <span :class="{'opacity-0': loading}" class="transition-opacity">Sign Script</span>
          <div v-if="loading" class="absolute inset-0 flex items-center justify-center">
            <div class="flex items-center gap-2">
              <div class="animate-spin rounded-full h-4 w-4 border-2 border-care border-t-transparent"></div>
              <span>Signing...</span>
            </div>
          </div>
        </button>
      </form>
      
      <!-- Signing result -->
      <div v-if="signResult !== null" class="p-4 rounded-lg border mt-4" :class="signResult?.success ? 'border-currency bg-currency/5' : 'border-security bg-security/5'">
        <h3 class="text-lg font-semibold mb-2" :class="signResult?.success ? 'text-currency' : 'text-security'">
          {{ signResult?.success ? 'File Signed Successfully' : 'Signing Failed' }}
        </h3>
        <p class="text-sm text-modernity">{{ signResult?.message }}</p>
        <div v-if="signResult?.success" class="mt-4">
          <button @click="downloadSignedFile" class="btn btn-primary btn-md">
            Download Signed File
          </button>
        </div>
      </div>
      
      <!-- Unload confirm dialog -->      
      <div
        v-if="showUnloadConfirm"
        class="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-md bg-modernity/20"
      >
        <div class="bg-care rounded-xl shadow-lg p-6 w-full max-w-xs border border-security/20">
          <h2 class="text-lg font-semibold mb-4 text-energy">Unload Certificate</h2>
          <p class="mb-4 text-modernity text-sm">Are you sure you want to unload the current certificate?</p>          
          <div class="flex justify-end gap-2">
            <button @click="showUnloadConfirm = false" class="btn btn-outline btn-md">Cancel</button>
            <button @click="confirmUnloadCert" class="btn btn-danger btn-md">Unload</button>
          </div>
        </div>
      </div>      
      <!-- Download popup -->      
      <div
        v-if="showDownloadPopup"
        class="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-md bg-modernity/20"
      >
        <div class="bg-care rounded-xl shadow-lg p-8 w-full max-w-xs flex flex-col items-center border border-security/20">
          <h2 class="text-lg font-semibold mb-4 text-security">Signed File Ready</h2>
          <p class="mb-4 text-modernity text-sm text-center">Your signed file is ready and will be saved to your device.</p>
          <button @click="closeDownloadPopup" class="btn btn-primary btn-md">OK</button>
        </div>
      </div>      

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'

interface Certificate {
  name: string;
  metadata?: {
    uploadedBy: string;
    uploadedAt: string;
    notes: string;
  }
}

// Basic UI state
const hydratedOrSSR = ref(typeof window === 'undefined')
const isHydrated = ref(false)
onMounted(() => {
  hydratedOrSSR.value = true
  isHydrated.value = true
})

// For logging
const logs = ref('')

// Certificate handling state
const certificates = ref<Certificate[]>([])
const selectedCertificate = ref<Certificate | null>(null)
const loadingCerts = ref(false)
const passwordRequired = ref(true)
const passwordEntered = ref(false)
const password = ref('')
const passwordError = ref('')
const showPasswordPopup = ref(false)

// Signing state
const scriptFile = ref<File | null>(null)
const signResult = ref<any>(null)
const error = ref('')
const loading = ref(false)
const showUnloadConfirm = ref(false)

// Store popup states
const showDownloadPopup = ref(false)
const downloadBlob = ref<Blob | null>(null)
const downloadFilename = ref('')
const isLoading = ref(false)
const passwordStatus = ref('') // '', 'accepted', 'rejected'

// Certificate Selection
function selectCertificate(cert: Certificate) {
  selectedCertificate.value = cert
  password.value = ''
  passwordEntered.value = false
  passwordError.value = ''
  showPasswordPopup.value = true
  logWithTimestamp(`Selected certificate: ${cert.name}`)
}

// Format date for better display
function formatDate(dateString: string) {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString(undefined, { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  } catch (e) {
    return dateString
  }
}

watch(passwordRequired, (val) => {
  if (val && !passwordEntered.value && selectedCertificate.value) {
    showPasswordPopup.value = true
  }
})

function logWithTimestamp(message: string) {
  const now = new Date()
  const timestamp = now.toLocaleTimeString()
  logs.value += `[${timestamp}] ${message}\n`
}

function handleScriptFile(event: Event) {
  const target = event.target as HTMLInputElement
  scriptFile.value = target.files ? target.files[0] : null
  error.value = ''
  if (scriptFile.value) {
    logWithTimestamp(`Selected script file: ${scriptFile.value.name}`)
  }
}



function cancelPassword() {
  clearCert()
}

function submitPassword() {
  if (!password.value) {
    passwordError.value = 'Password is required.'
    logWithTimestamp('Password entry is empty.')
    return
  }
  showPasswordPopup.value = false
  passwordEntered.value = true
  passwordError.value = ''
  passwordStatus.value = '' // reset status, will be set after validation
  logWithTimestamp('Password entered for certificate.')
  // Immediately validate password by signing an empty file
  validateCertificatePassword()
}

async function validateCertificatePassword() {
  logWithTimestamp('Validating certificate password...')
  const formData = new FormData()
  if (selectedCertificate.value) {
    formData.append('storedCert', selectedCertificate.value.name)
  }
  formData.append('password', password.value)

  try {
    const response = await fetch('/api/sign', {
      method: 'POST',
      body: formData
    })
    const result = await response.json()
    if (response.ok) {
      passwordStatus.value = 'accepted'
      logWithTimestamp('Password accepted for certificate.')
    } else {
      passwordStatus.value = 'rejected'
      passwordEntered.value = false
      password.value = ''
      showPasswordPopup.value = true
      passwordError.value = 'Invalid password. Please try again.'
      logWithTimestamp(`Password rejected: ${result.error || result.message || response.statusText}`)
    }
  } catch (err) {
    passwordStatus.value = 'rejected'
    passwordEntered.value = false
    password.value = ''
    showPasswordPopup.value = true
    passwordError.value = 'Network error. Please try again.'
    logWithTimestamp(`Password validation error: ${err}`)
  }
}

async function handleSubmit() {
  if (!selectedCertificate.value) {
    error.value = 'Please select a certificate.'
    logWithTimestamp('No certificate selected.')
    return
  }
  if (!scriptFile.value) {
    error.value = 'Please select a script file to sign.'
    logWithTimestamp('No script file selected.')
    return
  }
  error.value = ''

  logWithTimestamp('Preparing files for signing...')
  const formData = new FormData()
  formData.append('script', scriptFile.value)
  if (selectedCertificate.value) {
    formData.append('storedCert', selectedCertificate.value.name)
    logWithTimestamp(`Using certificate: ${selectedCertificate.value.name}`)
  }
  if (password.value) {
    formData.append('password', password.value)
    logWithTimestamp('Certificate password included in request.')
  }

  logWithTimestamp('Uploading files for signing...')
  isLoading.value = true
  let response
  try {
    response = await fetch('/api/sign', {
      method: 'POST',
      body: formData
    })
    logWithTimestamp('Waiting for server response...')
    const contentType = response.headers.get('Content-Type') || ''
    const disposition = response.headers.get('Content-Disposition')

    if (response.ok && (disposition || contentType.includes('application/octet-stream'))) {
      const blob = await response.blob()
      let filename = 'signedfile.sig'

      const match = disposition?.match(/filename="(.+?)"/)
      if (match) filename = match[1]

      downloadBlob.value = blob
      downloadFilename.value = filename
      showDownloadPopup.value = true
      triggerDownload(blob, filename)
      logWithTimestamp('Signed file downloaded.')

      // Reset the script file input after successful signing
      scriptFile.value = null
      
      // Reset the file input element
      const scriptFileInput = document.getElementById('scriptFile') as HTMLInputElement;
      if (scriptFileInput) {
        scriptFileInput.value = '';
      }
      
      if (passwordRequired.value) {
        passwordEntered.value = true
        passwordStatus.value = 'accepted'
      }

    } else {
      // Try to parse JSON or fallback to raw text
      let result: { error?: string } = {}
      try {
        const content = await response.text()
        result = contentType.includes('application/json') ? JSON.parse(content) : { error: content }
      } catch {
        result = { error: 'Unexpected response from server.' }
      }

      logWithTimestamp(`Error from server: ${result?.error || response.statusText}`)

      if (result?.error?.toLowerCase().includes('password')) {
        passwordEntered.value = false
        passwordStatus.value = 'rejected'
        password.value = ''
        showPasswordPopup.value = true
        passwordError.value = 'Invalid password. Please try again.'
      }
    }
  } catch (err) {
    logWithTimestamp(`Network or server error: ${err}`)
  } finally {
    isLoading.value = false
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function closeDownloadPopup() {
  showDownloadPopup.value = false;
  downloadBlob.value = null;
  downloadFilename.value = '';
  
  // Add success message to indicate the file was signed successfully
  signResult.value = {
    success: true,
    message: 'Your file was signed successfully. You can now sign another file.'
  };
  
  // Clear the script file input to make it clear the user needs to select another file
  scriptFile.value = null;
  
  // Reset the file input element
  const scriptFileInput = document.getElementById('scriptFile') as HTMLInputElement;
  if (scriptFileInput) {
    scriptFileInput.value = '';
  }
}

function confirmUnloadCert() {
  showUnloadConfirm.value = false
  clearCert()
}

function clearCert(): void {
  password.value = ''
  passwordEntered.value = false
  passwordError.value = ''
  passwordRequired.value = true
  showPasswordPopup.value = false
  showUnloadConfirm.value = false
  selectedCertificate.value = null
  logWithTimestamp('Certificate unloaded.')
}

function downloadSignedFile() {
  if (downloadBlob.value) {
    triggerDownload(downloadBlob.value, downloadFilename.value)
  }
}

// Fetch available certificates on component mount
async function fetchCerts(): Promise<void> {
  loadingCerts.value = true
  try {
    const response = await fetch('/api/certs')
    if (response.ok) {
      const data = await response.json()
      certificates.value = data.certificates || []
      logWithTimestamp(`Loaded ${certificates.value.length} certificates.`)
    } else {
      logWithTimestamp('Failed to load available certificates.')
    }
  } catch (err) {
    logWithTimestamp(`Error loading certificates: ${err}`)
  } finally {
    loadingCerts.value = false
  }
}

// Initialize on mount
onMounted(() => {
  fetchCerts()
})
</script>
