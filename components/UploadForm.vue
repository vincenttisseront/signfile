<template>
  <div>
    <!-- Use display CSS instead of v-if to prevent layout shifts during hydration -->
    <div 
      :class="{'opacity-100': hydratedOrSSR, 'opacity-0': !hydratedOrSSR}"
      class="max-w-3xl mx-auto space-y-8 transition-opacity duration-300"
    >
      <!-- Certificate upload step with consistent height -->
      <div v-if="!certFile || (passwordRequired && !passwordEntered)" class="min-h-[150px]">
        <form @submit.prevent class="space-y-6">
          <!-- Radio buttons to choose certificate source -->
          <div class="mb-2 flex gap-6 items-center">
            <label class="flex items-center gap-2 text-modernity">
              <input
                type="radio"
                name="certSource"
                value="upload"
                v-model="certSource"
                class="text-security focus:ring-security"
              />
              <span>Upload certificate</span>
            </label>
            <label class="flex items-center gap-2 text-modernity">
              <input
                type="radio"
                name="certSource"
                value="stored"
                v-model="certSource"
                class="text-security focus:ring-security"
              />
              <span>Use existing certificate</span>
            </label>
          </div>
          <div v-if="certSource === 'upload'" class="space-y-2">
            <label class="form-label text-security font-medium block" for="certFile">
              Upload Certificate (.pfx, .pem)
            </label>
            <div class="relative">
              <input
                id="certFile"
                type="file"
                accept=".pfx,.pem"
                @change="handleCertFile"
                :disabled="certSource !== 'upload'"
                class="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10 input-file"
              />
              <button
                type="button"
                class="btn btn-primary w-full text-left"
                :disabled="certSource !== 'upload'"
                tabindex="-1"
              >
                Select Certificate File
              </button>
            </div>
          </div>
          <div v-if="certSource === 'stored'" class="mt-2">            <label class="form-label" for="storedCert">Select a stored certificate</label>
            <div class="flex gap-2">
              <select
                id="storedCert"
                v-model="selectedStoredCert"
                @change="handleStoredCert"
                class="form-input"
              >
                <option value="">-- Select stored certificate --</option>
                <option v-for="cert in storedCerts" :key="cert" :value="cert">{{ cert }}</option>
              </select>
            </div>
          </div>
        </form>
      </div>
      <!-- Password popup -->      
      <div
        v-if="showPasswordPopup"
        class="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-md bg-modernity/20"
      >
        <div class="bg-care rounded-xl shadow-lg p-8 w-full max-w-xs border border-security/20">
          <h2 class="text-lg font-semibold mb-4 text-security">Certificate Password Required</h2>
          <input
            type="password"
            v-model="password"
            placeholder="Enter certificate password"
            class="form-input mb-4"
            @keyup.enter="submitPassword"
          />          
          <div class="flex justify-end gap-2">
            <button @click="cancelPassword" class="btn btn-outline btn-md">Cancel</button>
            <button @click="submitPassword" class="btn btn-primary btn-md">OK</button>
          </div>
          <div v-if="passwordError" class="text-energy text-xs mt-2">{{ passwordError }}</div>
        </div>
      </div>
      
      <!-- Script signing step -->
      <form
        v-if="(certFile && (!passwordRequired || passwordEntered) && !showPasswordPopup)
          || (selectedStoredCert && certSource === 'stored' && (!passwordRequired || passwordEntered) && !showPasswordPopup)"
        @submit.prevent="handleSubmit"
        class="space-y-6"
      >
        <div>
          <label class="block mb-1 font-medium text-security flex items-center gap-2" for="certFile">
            Certificate file (.pfx, .pem)
            <span class="ml-1 text-currency" title="Certificate loaded">
              <svg xmlns="http://www.w3.org/2000/svg" class="inline w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" fill="#64ffa2/20"/>
                <path stroke="#64ffa2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2l4-4"/>
              </svg>
            </span>
          </label>
          <div class="text-xs text-security/70 mt-1 flex items-center gap-2">
            <span class="inline-block w-2 h-2 bg-currency rounded-full"></span>
            <template v-if="certFile">
              Certificate loaded: {{ certFile?.name || '' }}
            </template>
            <template v-else-if="selectedStoredCert && certSource === 'stored'">
              Certificate loaded: {{ selectedStoredCert }}
            </template>
          </div>
          <!-- Unload and Save buttons -->
          <div v-if="(certFile || (selectedStoredCert && certSource === 'stored'))" class="flex gap-2 mt-2">
            <button type="button" class="btn btn-outline btn-sm" @click="showUnloadConfirm = true">Unload</button>
            <button
              v-if="certFile && certSource === 'upload' && certFile.name && !storedCerts.includes(certFile.name) && showSaveCertButton"
              type="button"
              class="btn btn-secondary btn-sm"
              @click="showSaveCertPopup = true"
            >
              Save
            </button>
          </div>
        </div>
        <div>
          <label class="block mb-1 font-medium text-security" for="scriptFile">Select script file to sign</label>
          <input
            id="scriptFile"
            type="file"
            accept=".txt,.js,.ts,.json,.ps1"
            @change="handleScriptFile"
            required
            class="form-input input-file"
          />
        </div>

        <div v-if="error" class="text-energy text-sm p-2 bg-energy/10 rounded-lg">{{ error }}</div>        
        <button
          type="submit"
          :disabled="!certFile || !scriptFile || loading"
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

      <!-- Logs below the form -->
      <div v-if="logs && logs.value" class="mt-6">
        <h3 class="text-sm font-semibold text-security mb-2">Signing Log</h3>
        <pre class="bg-modernity/5 border border-modernity/20 rounded-lg p-3 text-xs text-modernity whitespace-pre-wrap max-h-64 overflow-y-auto">{{ logs.value }}</pre>
      </div>

      <!-- Save cert confirmation popup -->
      <div
        v-if="showSaveCertPopup"
        class="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-md bg-modernity/20"
      >
        <div class="bg-care rounded-xl shadow-lg p-8 w-full max-w-xs flex flex-col items-center border border-security/20">
          <h2 class="text-lg font-semibold mb-4 text-security">Save Certificate</h2>
          <p class="mb-4 text-modernity text-sm text-center">
            Do you want to save this certificate to the server for future use?
          </p>
          <input
            v-model="saveCertName"
            type="text"
            class="w-full border border-security/30 rounded-lg p-2 mb-2 font-mono bg-care text-modernity focus:ring-2 focus:ring-security focus:border-security outline-none"
            :placeholder="certFile?.name"
          />
          <div class="text-xs text-security/70 mb-2 break-all">
            Actual filename: <span class="font-mono">{{ saveCertName || certFile?.name }}</span>
          </div>          
          <div class="flex gap-2 mt-2">
            <button @click="confirmSaveCert" class="btn btn-primary btn-md">Yes</button>
            <button @click="showSaveCertPopup = false" class="btn btn-outline btn-md">No</button>
          </div>
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
      <!-- Remove cert confirmation popup -->      
      <div
        v-if="showRemoveCertPopup"
        class="fixed inset-0 flex items-center justify-center z-50 backdrop-blur-md bg-modernity/20"
      >
        <div class="bg-care rounded-xl shadow-lg p-8 w-full max-w-xs flex flex-col items-center border border-security/20">
          <h2 class="text-lg font-semibold mb-4 text-energy">Remove Certificate</h2>
          <p class="mb-4 text-modernity text-sm text-center">
            Are you sure you want to remove this certificate from the server?<br>
            <span class="font-mono break-all">{{ selectedStoredCert }}</span>
          </p>          
          <div class="flex gap-2 mt-2">
            <button @click="confirmRemoveCert" class="btn btn-danger btn-md">Yes</button>
            <button @click="showRemoveCertPopup = false" class="btn btn-outline btn-md">No</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, computed, onMounted, nextTick } from 'vue'
import { useUIState } from '@/stores/uiState'

const uiState = useUIState()
// Improve hydration handling to prevent layout shifts
const hydratedOrSSR = computed(() => uiState.hydrated || process.server)
// Initialize in true state for SSR, will switch if needed on client
const isHydrated = ref(process.server)

// Detect hydration completion
onMounted(() => {
  // Use nextTick to ensure DOM is fully updated before detecting hydration state
  nextTick(() => {
    setTimeout(() => {
      isHydrated.value = true
    }, 50) // Small delay to ensure hydration is complete
  })
})

// Remove certFile from Pinia, use a local ref for the File object
const certFile = ref(null)
const password = computed({
  get: () => uiState.password,
  set: (val) => uiState.setPassword(val)
})
const certSource = computed({
  get: () => uiState.certSource,
  set: (val) => uiState.setCertSource(val)
})
const selectedStoredCert = computed({
  get: () => uiState.selectedStoredCert,
  set: (val) => uiState.setSelectedStoredCert(val)
})
const storedCerts = computed({
  get: () => uiState.storedCerts,
  set: (val) => uiState.setStoredCerts(val)
})
const passwordRequired = computed({
  get: () => uiState.passwordRequired,
  set: (val) => uiState.setPasswordRequired(val)
})
const passwordEntered = computed({
  get: () => uiState.passwordEntered,
  set: (val) => uiState.setPasswordEntered(val)
})

const logs = inject('logs', null)
const passwordError = ref('')
const showUnloadConfirm = ref(false)
const passwordStatus = ref('') // '', 'accepted', 'rejected'
const showDownloadPopup = ref(false)
const downloadBlob = ref(null)
const downloadFilename = ref('')
const isLoading = ref(false)
const showSaveCertButton = ref(false)
const showSaveCertPopup = ref(false)
const saveCertName = ref('')
const certInfo = ref(null)
const showCertDetails = ref(false)
const showRemoveCertPopup = ref(false)
const showPasswordPopup = ref(false)
const error = ref('')
const scriptFile = ref(null)
const signResult = ref(null)
const loading = ref(false)

watch(certSource, (val) => {
  if (val === 'upload') {
    selectedStoredCert.value = ''
    certFile.value = null
    password.value = ''
    passwordEntered.value = false
    passwordError.value = ''
    passwordRequired.value = false
    showPasswordPopup.value = false
    logWithTimestamp('Switched to upload certificate.')
  } else if (val === 'stored') {
    certFile.value = null
    password.value = ''
    passwordEntered.value = false
    passwordError.value = ''
    passwordRequired.value = false
    showPasswordPopup.value = false
    logWithTimestamp('Switched to stored certificate.')
  }
})

// Watch for certFile changes (uploaded cert)
watch(certFile, (val, oldVal) => {
  if (val && val !== oldVal && certSource.value === 'upload') {
    password.value = ''
    passwordEntered.value = false
    passwordError.value = ''
    passwordRequired.value = true
    showPasswordPopup.value = true
    logWithTimestamp('Certificate file selected, password popup shown.')
  }
})

// Watch for selectedStoredCert changes (stored cert)
watch(selectedStoredCert, (val, oldVal) => {
  if (val && val !== oldVal && certSource.value === 'stored') {
    password.value = ''
    passwordEntered.value = false
    passwordError.value = ''
    passwordRequired.value = true
    showPasswordPopup.value = true
    logWithTimestamp('Stored certificate selected, password popup shown.')
  }
})

// Always show password popup when certFile or selectedStoredCert changes and password is required
watch([certFile, selectedStoredCert, certSource], ([file, stored, source]) => {
  if ((file && source === 'upload') || (stored && source === 'stored')) {
    passwordEntered.value = false
    passwordError.value = ''
    if (passwordRequired.value) {
      showPasswordPopup.value = true
    }
  }
})

watch(certFile, (val) => {
  // Show save button only if a cert is loaded, not already in storedCerts, and certSource is 'upload'
  if (
    val &&
    val.name &&
    !storedCerts.value.includes(val.name) &&
    certSource.value === 'upload'
  ) {
    showSaveCertButton.value = true
  } else {
    showSaveCertButton.value = false
  }
})

watch(passwordRequired, (val) => {
  if (val && !passwordEntered.value) {
    showPasswordPopup.value = true
  }
})

function logWithTimestamp(message) {
  const now = new Date()
  const timestamp = now.toLocaleTimeString()
  if (logs) logs.value += `[${timestamp}] ${message}\n`
}

function handleScriptFile(event) {
  scriptFile.value = event.target.files[0]
  error.value = ''
  logWithTimestamp(`Selected script file: ${scriptFile.value?.name}`)
}

function handleStoredCert() {
  if (selectedStoredCert.value) {
    certFile.value = {
      name: selectedStoredCert.value,
      data: '',
      type: 'pfx',
    }
    passwordRequired.value = true
    passwordEntered.value = false
    passwordError.value = ''
    showPasswordPopup.value = true // <-- Force popup for stored cert too
  } else {
    certFile.value = null
    password.value = ''
    passwordEntered.value = false
    passwordError.value = ''
    passwordRequired.value = false
    showPasswordPopup.value = false
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
  if (selectedStoredCert.value && certSource.value === 'stored') {
    formData.append('storedCert', selectedStoredCert.value)
  } else {
    formData.append('certificate', certFile.value) // Use File object
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
  if (!certFile.value && !selectedStoredCert.value) {
    error.value = 'Please select or load a certificate.'
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
  if (selectedStoredCert.value) {
    formData.append('storedCert', selectedStoredCert.value)
    logWithTimestamp(`Using stored certificate: ${selectedStoredCert.value}`)
  } else {
    formData.append('certificate', certFile.value) // Use File object
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

      if (passwordRequired.value) {
        passwordEntered.value = true
        passwordStatus.value = 'accepted'
      }

    } else {
      // Try to parse JSON or fallback to raw text
      let result = {}
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

function triggerDownload(blob, filename) {
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
  showDownloadPopup.value = false
  downloadBlob.value = null
  downloadFilename.value = ''
}

function confirmUnloadCert() {
  clearCert()
}

async function removeStoredCert() {
  if (!selectedStoredCert.value) return
  if (!confirm(`Are you sure you want to remove certificate "${selectedStoredCert.value}"?`)) return
  try {
    const res = await fetch(`/api/certs?name=${encodeURIComponent(selectedStoredCert.value)}`, { method: 'DELETE' })
    if (res.ok) {
      storedCerts.value = storedCerts.value.filter(c => c !== selectedStoredCert.value)
      logWithTimestamp(`Removed stored certificate: ${selectedStoredCert.value}`)
      selectedStoredCert.value = ''
    } else {
      logWithTimestamp(`Failed to remove certificate: ${selectedStoredCert.value}`)
    }
  } catch (e) {
    logWithTimestamp(`Error removing certificate: ${e}`)
  }
}

async function confirmRemoveCert() {
  showRemoveCertPopup.value = false
  if (!selectedStoredCert.value) return
  try {
    const res = await fetch(`/api/certs?name=${encodeURIComponent(selectedStoredCert.value)}`, { method: 'DELETE' })
    if (res.ok) {
      storedCerts.value = storedCerts.value.filter(c => c !== selectedStoredCert.value)
      logWithTimestamp(`Removed stored certificate: ${selectedStoredCert.value}`)
      selectedStoredCert.value = ''
      // Also clear loaded state if this cert was loaded
      clearStoredCert()
    } else {
      logWithTimestamp(`Failed to remove certificate: ${selectedStoredCert.value}`)
    }
  } catch (e) {
    logWithTimestamp(`Error removing certificate: ${e}`)
  }
}

function cancelLoadedCert() {
  certFile.value = null
  password.value = ''
  passwordEntered.value = false
  passwordError.value = ''
  passwordRequired.value = false
  showUnloadConfirm.value = false
  showPasswordPopup.value = false
  // Remove this line to avoid switching to stored certs:
  // certSource.value = 'stored'
  logWithTimestamp('Cancelled loaded certificate.');
}

// Add this function to your <script setup> block:
function clearCert() {
  certFile.value = null
  password.value = ''
  passwordEntered.value = false
  passwordError.value = ''
  passwordRequired.value = false
  showPasswordPopup.value = false
  showUnloadConfirm.value = false
  logWithTimestamp('Certificate cleared.')
}

// Save certificate to container
async function saveCertToContainer() {
  if (!certFile.value) return
  try {
    logWithTimestamp(`Attempting to save certificate "${saveCertName.value || certFile.value.name}" to container...`)
    const formData = new FormData()
    // Use the custom name if provided, otherwise the original file name
    const filename = saveCertName.value?.trim() || certFile.value.name
    formData.append('certificate', certFile.value, filename)
    const res = await fetch('/api/certs', {
      method: 'POST',
      body: formData
    })
    const result = await res.json().catch(() => ({}))
    if (res.ok && result.ok) {
      logWithTimestamp(`Server reports certificate "${filename}" saved successfully.`)
      // Refresh the storedCerts list from backend
      try {
        const certsRes = await fetch('/api/certs')
        if (certsRes.ok) {
          storedCerts.value = await certsRes.json()
          logWithTimestamp('Stored certificates list refreshed.')
        } else {
          logWithTimestamp('Saved cert, but failed to refresh stored certs list (bad response).')
        }
      } catch (e) {
        logWithTimestamp('Saved cert, but failed to refresh stored certs list (exception).')
      }
      showSaveCertButton.value = false
    } else {
      logWithTimestamp(`Failed to save certificate "${filename}" to container. Server response: ${result?.error || res.statusText}`)
    }
  } catch (e) {
    logWithTimestamp(`Error saving certificate: ${e}`)
  }
}

async function confirmSaveCert() {
  showSaveCertPopup.value = false
  await saveCertToContainer()
}

function handleCertFile(event) {
  const file = event.target.files[0]
  if (!file) return
  certFile.value = file // Store the File object only in this ref
  passwordRequired.value = true
  passwordEntered.value = false
  passwordError.value = ''
  showPasswordPopup.value = true
}
</script>
