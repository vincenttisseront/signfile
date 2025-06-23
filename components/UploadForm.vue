<template>
  <div class="p-8 max-w-lg mx-auto bg-white rounded-2xl shadow-xl space-y-8 border border-gray-200">
    <!-- Certificate upload step -->
    <div v-if="!certFile || (passwordRequired && !passwordEntered)">
      <form @submit.prevent class="space-y-6">
        <div>
          <label class="block mb-1 font-medium text-gray-700" for="certFile">Certificate file (.pfx, .pem)</label>
          <input
            id="certFile"
            type="file"
            accept=".pfx,.pem"
            @change="handleCertFile"
            required
            class="block w-full text-gray-700 file:bg-gray-100 file:border-0 file:rounded-lg file:px-4 file:py-2 file:text-blue-700 file:font-medium file:cursor-pointer"
          />
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
    <form v-if="certFile && (!passwordRequired || passwordEntered) && !showPasswordPopup" @submit.prevent="handleSubmit" class="space-y-6">
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
          Certificate loaded: {{ certFile.name }}
          <!-- Unload button -->
          <button
            type="button"
            class="ml-2 text-red-600 underline"
            @click="showUnloadConfirm = true"
          >Unload</button>
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
  </div>
</template>

<script setup>
// filepath: c:\Users\vti\OneDrive - iBanFirst\Work in progress\Dev\SignFile\components\UploadForm.vue
import { ref, inject } from 'vue'

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

function logWithTimestamp(message) {
  const now = new Date()
  const timestamp = now.toLocaleTimeString()
  if (logs) logs.value += `[${timestamp}] ${message}\n`
}

function handleScriptFile(event) {
  scriptFile.value = event.target.files[0]
  logWithTimestamp(`Selected script file: ${scriptFile.value?.name}`)
}

function handleCertFile(event) {
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
      showPasswordPopup.value = true
      logWithTimestamp('Certificate is a .pfx file. Please enter password.')
    } else {
      passwordRequired.value = false
      passwordEntered.value = true
      logWithTimestamp('Certificate is not password protected.')
    }
  }
  reader.readAsArrayBuffer(file)
}

function clearCert() {
  certFile.value = null
  certFileData.value = null
  password.value = ''
  showPasswordPopup.value = false
  passwordRequired.value = false
  passwordEntered.value = false
  passwordError.value = ''
  showUnloadConfirm.value = false
  logWithTimestamp('Certificate cleared.')
  // Reload the GUI (reset state)
  setTimeout(() => window.location.reload(), 100)
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
  formData.append('certificate', new File([certFileData.value], certFile.value.name))
  if (password.value) {
    formData.append('password', password.value)
    logWithTimestamp('Certificate password included in request.')
  }

  logWithTimestamp('Uploading files for signing...')
  let response
  try {
    response = await fetch('/api/sign', {
      method: 'POST',
      body: formData
    })
    logWithTimestamp('Waiting for server response...')
    if (response.ok && response.headers.get('Content-Disposition')) {
      // Get filename from Content-Disposition
      const disposition = response.headers.get('Content-Disposition')
      let filename = 'signedfile.sig'
      if (disposition) {
        const match = disposition.match(/filename="(.+?)"/)
        if (match) filename = match[1]
      }
      const blob = await response.blob()
      // Save blob and filename for popup
      downloadBlob.value = blob
      downloadFilename.value = filename
      showDownloadPopup.value = true
      // Trigger download immediately
      triggerDownload(blob, filename)
      logWithTimestamp('Signed file downloaded.')
      // Only show "Password accepted" if password was required and accepted
      if (passwordRequired.value) {
        passwordEntered.value = true
        passwordStatus.value = 'accepted'
      }
    } else {
      // Try to parse error
      let result
      try { result = await response.json() } catch {}
      logWithTimestamp(`Error from server: ${result?.error || result?.message || response.statusText}`)
      // If password error, reset passwordEntered so "Password accepted" is not shown
      if (result?.error && result.error.toLowerCase().includes('password')) {
        passwordEntered.value = false
        passwordStatus.value = 'rejected'
        password.value = ''
        showPasswordPopup.value = true
        passwordError.value = 'Invalid password. Please try again.'
      }
    }
  } catch (err) {
    logWithTimestamp(`Network or server error: ${err}`)
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
</script>
