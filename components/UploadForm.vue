<template>
  <div class="p-8 max-w-lg mx-auto bg-white rounded-2xl shadow-xl space-y-8 border border-gray-200">
    <!-- Certificate upload step -->
    <div v-if="!certFile || (passwordRequired && !passwordEntered)">
      <form @submit.prevent class="space-y-6">
        <!-- Radio buttons to choose certificate source -->
        <div class="mb-2 flex gap-6 items-center">
          <label class="flex items-center gap-2">
            <input
              type="radio"
              name="certSource"
              value="upload"
              v-model="certSource"
            />
            <span>Upload certificate</span>
          </label>
          <label class="flex items-center gap-2">
            <input
              type="radio"
              name="certSource"
              value="stored"
              v-model="certSource"
            />
            <span>Use existing certificate</span>
          </label>
        </div>
        <div v-if="certSource === 'upload'">
          <label class="block mb-1 font-medium text-gray-700" for="certFile">Certificate file (.pfx, .pem)</label>
          <input
            id="certFile"
            type="file"
            accept=".pfx,.pem"
            @change="handleCertFile"
            :disabled="certSource !== 'upload'"
            class="block w-full text-gray-700 file:bg-gray-100 file:border-0 file:rounded-lg file:px-4 file:py-2 file:text-blue-700 file:font-medium file:cursor-pointer"
          />
        </div>
        <div v-if="certSource === 'stored'" class="mt-2">
          <label class="block mb-1 font-medium text-gray-700" for="storedCert">Select a stored certificate</label>
          <div class="flex gap-2">
            <select
              id="storedCert"
              v-model="selectedStoredCert"
              @change="handleStoredCert"
              class="block w-full border border-gray-300 rounded-lg p-2 text-gray-700"
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
      class="fixed inset-0 flex items-center justify-center z-50"
      style="backdrop-filter: blur(6px); background: rgba(255,255,255,0.4);"
    >
      <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-xs">
        <h2 class="text-lg font-semibold mb-4 text-blue-700">Certificate Password Required</h2>
        <input
          type="password"
          v-model="password"
          placeholder="Enter certificate password"
          class="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none transition"
          @keyup.enter="submitPassword"
        />
        <div class="flex justify-end gap-2">
          <button @click="cancelPassword" class="px-4 py-2 rounded bg-gray-200 text-gray-700">Cancel</button>
          <button @click="submitPassword" class="px-4 py-2 rounded bg-blue-600 text-white font-semibold">OK</button>
        </div>
        <div v-if="passwordError" class="text-red-600 text-xs mt-2">{{ passwordError }}</div>
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
        <label class="block mb-1 font-medium text-gray-700 flex items-center gap-2" for="certFile">
          Certificate file (.pfx, .pem)
          <span class="ml-1 text-green-600" title="Certificate loaded">
            <svg xmlns="http://www.w3.org/2000/svg" class="inline w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" fill="#dcfce7"/>
              <path stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2l4-4"/>
            </svg>
          </span>
        </label>
        <div class="text-xs text-gray-500 mt-1 flex items-center gap-2">
          <span class="inline-block w-2 h-2 bg-green-400 rounded-full"></span>
          <template v-if="certFile">
            Certificate loaded: {{ certFile?.name || '' }}
          </template>
          <template v-else-if="selectedStoredCert && certSource === 'stored'">
            Certificate loaded: {{ selectedStoredCert }}
          </template>
          <!-- Unload/cancel/save/remove buttons for uploaded cert -->
          <template v-if="certFile">
            <button
              type="button"
              class="ml-2 text-red-600 underline"
              @click="showUnloadConfirm = true"
            >Unload</button>
            <button
              v-if="selectedStoredCert"
              type="button"
              class="ml-2 text-red-600 underline"
              @click="showRemoveCertPopup = true"
              title="Remove selected certificate"
            >Remove</button>
            <button
              type="button"
              class="ml-2 text-blue-600 underline"
              @click="cancelLoadedCert"
            >Cancel</button>
            <button
              v-if="showSaveCertButton"
              type="button"
              class="ml-2 text-green-600 underline"
              @click="showSaveCertPopup = true"
            >Save</button>
          </template>
          <!-- Unload/remove for stored cert -->
          <template v-else-if="selectedStoredCert && certSource === 'stored'">
            <button
              type="button"
              class="ml-2 text-red-600 underline"
              @click="clearStoredCert"
            >Unload</button>
            <button
              type="button"
              class="ml-2 text-red-600 underline"
              @click="showRemoveCertPopup = true"
              title="Remove selected certificate"
            >Remove</button>
          </template>
        </div>
        <div
          v-if="passwordRequired"
          class="mt-1 flex items-center gap-1"
        >
          <template v-if="passwordStatus === 'accepted'">
            <span class="text-green-600 text-xs flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" fill="#dcfce7"/>
                <path stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2l4-4"/>
              </svg>
              Password accepted
            </span>
          </template>
          <template v-else-if="passwordStatus === 'rejected'">
            <span class="text-red-600 text-xs flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <circle cx="12" cy="12" r="10" fill="#fee2e2"/>
                <path stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M15 9l-6 6m0-6l6 6"/>
              </svg>
              Password rejected
            </span>
          </template>
        </div>
      </div>
      <!-- Certificate info for stored cert (collapsible) -->
      <div
        v-if="selectedStoredCert && certSource === 'stored' && certInfo && certInfo.subject && certInfo.issuer"
        class="mt-3 p-3 bg-gray-50 rounded border border-gray-200 text-sm"
      >
        <div class="flex justify-between items-center mb-2">
          <span class="font-semibold text-blue-700">Certificate Information</span>
          <button
            @click="showCertDetails = !showCertDetails"
            class="text-sm text-blue-600 hover:underline"
          >
            {{ showCertDetails ? 'Hide details' : 'Show details' }}
          </button>
        </div>
        <Transition name="fade">
          <div v-if="showCertDetails" class="space-y-1">
            <div><span class="font-medium">Subject:</span> {{ certInfo.subject }}</div>
            <div><span class="font-medium">Issuer:</span> {{ certInfo.issuer }}</div>
            <div v-if="certInfo.validFrom"><span class="font-medium">Valid from:</span> {{ certInfo.validFrom }}</div>
            <div v-if="certInfo.validTo"><span class="font-medium">Valid to:</span> {{ certInfo.validTo }}</div>
            <div v-if="certInfo.serialNumber"><span class="font-medium">Serial:</span> {{ certInfo.serialNumber }}</div>
            <div v-if="certInfo.ca !== undefined"><span class="font-medium">CA:</span> {{ certInfo.ca ? 'Yes' : 'No' }}</div>
          </div>
        </Transition>
      </div>
      <div>
        <label class="block mb-1 font-medium text-gray-700" for="scriptFile">Script file</label>
        <input
          id="scriptFile"
          type="file"
          accept=".txt,.js,.ts,.json,.ps1"
          @change="handleScriptFile"
          required
          class="block w-full text-gray-700 file:bg-gray-100 file:border-0 file:rounded-lg file:px-4 file:py-2 file:text-blue-700 file:font-medium file:cursor-pointer"
        />
      </div>
      <button
        type="submit"
        class="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow transition"
      >
        Sign
      </button>
    </form>
    <!-- Save cert confirmation popup -->
    <div
      v-if="showSaveCertPopup"
      class="fixed inset-0 flex items-center justify-center z-50"
      style="backdrop-filter: blur(6px); background: rgba(255,255,255,0.4);"
    >
      <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-xs flex flex-col items-center">
        <h2 class="text-lg font-semibold mb-4 text-green-700">Save Certificate</h2>
        <p class="mb-4 text-gray-700 text-sm text-center">
          Do you want to save this certificate to the server for future use?
        </p>
        <input
          v-model="saveCertName"
          type="text"
          class="w-full border border-gray-300 rounded-lg p-2 mb-2 font-mono"
          :placeholder="certFile?.name"
        />
        <div class="text-xs text-gray-500 mb-2 break-all">
          Actual filename: <span class="font-mono">{{ saveCertName || certFile?.name }}</span>
        </div>
        <div class="flex gap-2 mt-2">
          <button @click="confirmSaveCert" class="px-4 py-2 rounded bg-green-600 text-white font-semibold">Yes</button>
          <button @click="showSaveCertPopup = false" class="px-4 py-2 rounded bg-gray-200 text-gray-700">No</button>
        </div>
      </div>
    </div>
    <!-- Unload confirm dialog -->
    <div
      v-if="showUnloadConfirm"
      class="fixed inset-0 flex items-center justify-center z-50"
      style="backdrop-filter: blur(6px); background: rgba(255,255,255,0.4);"
    >
      <div class="bg-white rounded-xl shadow-lg p-6 w-full max-w-xs">
        <h2 class="text-lg font-semibold mb-4 text-red-700">Unload Certificate</h2>
        <p class="mb-4 text-gray-700 text-sm">Are you sure you want to unload the current certificate?</p>
        <div class="flex justify-end gap-2">
          <button @click="showUnloadConfirm = false" class="px-4 py-2 rounded bg-gray-200 text-gray-700">Cancel</button>
          <button @click="confirmUnloadCert" class="px-4 py-2 rounded bg-red-600 text-white font-semibold">Unload</button>
        </div>
      </div>
    </div>
    <!-- Download popup -->
    <div
      v-if="showDownloadPopup"
      class="fixed inset-0 flex items-center justify-center z-50"
      style="backdrop-filter: blur(6px); background: rgba(255,255,255,0.4);"
    >
      <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-xs flex flex-col items-center">
        <h2 class="text-lg font-semibold mb-4 text-blue-700">Signed File Ready</h2>
        <p class="mb-4 text-gray-700 text-sm text-center">Your signed file is ready and will be saved to your device.</p>
        <button @click="closeDownloadPopup" class="px-4 py-2 rounded bg-blue-600 text-white font-semibold">OK</button>
      </div>
    </div>
    <!-- Remove cert confirmation popup -->
    <div
      v-if="showRemoveCertPopup"
      class="fixed inset-0 flex items-center justify-center z-50"
      style="backdrop-filter: blur(6px); background: rgba(255,255,255,0.4);"
    >
      <div class="bg-white rounded-xl shadow-lg p-8 w-full max-w-xs flex flex-col items-center">
        <h2 class="text-lg font-semibold mb-4 text-red-700">Remove Certificate</h2>
        <p class="mb-4 text-gray-700 text-sm text-center">
          Are you sure you want to remove this certificate from the server?<br>
          <span class="font-mono break-all">{{ selectedStoredCert }}</span>
        </p>
        <div class="flex gap-2 mt-2">
          <button @click="confirmRemoveCert" class="px-4 py-2 rounded bg-red-600 text-white font-semibold">Yes</button>
          <button @click="showRemoveCertPopup = false" class="px-4 py-2 rounded bg-gray-200 text-gray-700">No</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// filepath: c:\Users\vti\OneDrive - iBanFirst\Work in progress\Dev\SignFile\components\UploadForm.vue
import { ref, inject, onMounted, watch } from 'vue'

const scriptFile = ref(null)
const certFile = ref(null)
const certFileData = ref(null)
const password = ref('')
const showPasswordPopup = ref(false)
const passwordRequired = ref(false)
const passwordEntered = ref(false)
const logs = inject('logs', null)
const passwordError = ref('')
const showUnloadConfirm = ref(false)
const passwordStatus = ref('') // '', 'accepted', 'rejected'
const showDownloadPopup = ref(false)
const downloadBlob = ref(null)
const downloadFilename = ref('')
const isLoading = ref(false)

const storedCerts = ref([])
const selectedStoredCert = ref('')
const certSource = ref('upload')
const showSaveCertButton = ref(false)
const showSaveCertPopup = ref(false)
const saveCertName = ref('')
const certInfo = ref(null)
const showCertDetails = ref(false)
const showRemoveCertPopup = ref(false)

onMounted(async () => {
  // Fetch stored certs from backend
  try {
    const res = await fetch('/api/certs')
    if (res.ok) {
      storedCerts.value = await res.json()
    }
  } catch (e) {
    // ignore
  }
})

function logWithTimestamp(message) {
  const now = new Date()
  const timestamp = now.toLocaleTimeString()
  if (logs) logs.value += `[${timestamp}] ${message}\n`
}

function handleScriptFile(event) {
  scriptFile.value = event.target.files[0]
  logWithTimestamp(`Selected script file: ${scriptFile.value?.name}`)
}

function handleStoredCert() {
  if (!selectedStoredCert.value) {
    certFile.value = null
    certFileData.value = null
    password.value = ''
    passwordEntered.value = false
    passwordError.value = ''
    passwordRequired.value = false
    showPasswordPopup.value = false
    logWithTimestamp('Stored certificate selection cleared.')
    return
  }
  certFile.value = null
  certFileData.value = null
  password.value = ''
  passwordEntered.value = false
  passwordError.value = ''
  passwordRequired.value = true
  // Ensure the password popup is shown immediately after selecting a stored cert
  setTimeout(() => { showPasswordPopup.value = true }, 0)
  logWithTimestamp(`Selected stored certificate: ${selectedStoredCert.value}`)
}

// Called when user clicks "Cancel" in password popup
function cancelPassword() {
  clearCert()
}

// Called when user clicks "OK" in password popup
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
  // Do NOT send script field at all for password check
  formData.append('certificate', new File([certFileData.value], certFile.value.name))
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
  if (!scriptFile.value) {
    logWithTimestamp('No script file selected.')
    return
  }
  logWithTimestamp('Preparing files for signing...')
  const formData = new FormData()
  formData.append('script', scriptFile.value)
  if (selectedStoredCert.value) {
    formData.append('storedCert', selectedStoredCert.value)
    logWithTimestamp(`Using stored certificate: ${selectedStoredCert.value}`)
  } else {
    formData.append('certificate', new File([certFileData.value], certFile.value.name))
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
  certFileData.value = null
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
  certFileData.value = null
  password.value = ''
  passwordEntered.value = false
  passwordError.value = ''
  passwordRequired.value = false
  showPasswordPopup.value = false
  showUnloadConfirm.value = false
  logWithTimestamp('Certificate cleared.')
}

// Watch for certSource changes to reset state
watch(certSource, (val) => {
  if (val === 'upload') {
    selectedStoredCert.value = ''
    certFile.value = null
    certFileData.value = null
    password.value = ''
    passwordEntered.value = false
    passwordError.value = ''
    passwordRequired.value = false
    showPasswordPopup.value = false
    showStoredCertInfoPopup.value = false
    storedCertInfo.value = null
    storedCertInfoLoading.value = false
    logWithTimestamp('Switched to upload certificate.')
  } else if (val === 'stored') {
    certFile.value = null
    certFileData.value = null
    password.value = ''
    passwordEntered.value = false
    passwordError.value = ''
    passwordRequired.value = false
    showPasswordPopup.value = false
    showStoredCertInfoPopup.value = false
    storedCertInfo.value = null
    storedCertInfoLoading.value = false
    logWithTimestamp('Switched to stored certificate.')
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
  if (certSource.value !== 'upload') return
  selectedStoredCert.value = ''
  const file = event.target.files[0]
  if (!file) return
  certFile.value = file
  certFileData.value = null
  password.value = ''
  passwordEntered.value = false
  passwordError.value = ''
  logWithTimestamp('Reading certificate file...')
  const reader = new FileReader()
  reader.onload = async () => {
    certFileData.value = reader.result
    logWithTimestamp(`Loaded certificate file: ${certFile.value?.name}`)
    // Always require password for .pfx, let backend validate
    if (certFile.value.name.endsWith('.pfx')) {
      passwordRequired.value = true
      setTimeout(() => { showPasswordPopup.value = true }, 0)
      logWithTimestamp('Certificate is a .pfx file. Please enter password.')
    } else {
      passwordRequired.value = false
      passwordEntered.value = true
      logWithTimestamp('Certificate is not password protected.')
    }
  }
  reader.readAsArrayBuffer(file)
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
