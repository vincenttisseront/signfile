<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <h2 class="text-xl font-semibold text-security border-b border-security/30 pb-2 mb-4">Inspect File Signature</h2>
    <form @submit.prevent class="space-y-4">
      <div>        <label class="form-label" for="script">Upload Script File</label>
        <input
          id="script"
          type="file"
          accept=".txt,.js,.ts,.json,.ps1,.cmd"
          @change="handleScriptFile"
          required
          class="form-input input-file"
        />
      </div>
    </form>

    <div v-if="loading" class="text-security text-sm mt-4 flex items-center gap-2">
      <svg class="animate-spin h-4 w-4 text-security" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Analyzing file...
    </div>

    <div v-if="result !== null && !loading" class="p-4 rounded-lg border border-security/20 bg-care shadow-sm mt-6 border-t border-security/30 pt-4">
      <template v-if="result.verified">
        <div class="text-currency font-semibold text-lg flex items-center gap-2 mb-3">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="10" fill="#64ffa2/20"/>
            <path stroke="#64ffa2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2l4-4"/>
          </svg>
          Verification: Valid Signature
        </div>
        <div class="p-4 bg-security/5 rounded-lg space-y-2 text-sm">
          <div><span class="font-medium text-currency">Subject:</span> <span class="text-modernity">{{ result.certificate.subject }}</span></div>
          <div><span class="font-medium text-currency">Issuer:</span> <span class="text-modernity">{{ result.certificate.issuer }}</span></div>
          <div><span class="font-medium text-currency">Serial:</span> <span class="text-modernity">{{ result.certificate.serial }}</span></div>
          <div><span class="font-medium text-currency">Fingerprint:</span> <span class="text-modernity">{{ result.certificate.fingerprint }}</span></div>
          <div><span class="font-medium text-currency">Algorithm:</span> <span class="text-modernity">{{ result.certificate.algorithm }}</span></div>
        </div>
      </template>
      <template v-else>
        <div class="text-energy font-semibold text-lg flex items-center gap-2">
          <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <circle cx="12" cy="12" r="10" fill="#ff5249/20"/>
            <path stroke="#ff5249" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
          There is no signature on this file
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const scriptFile = ref(null)
const result = ref(null)
const loading = ref(false)

async function handleScriptFile(event) {
  const file = event.target.files[0]
  scriptFile.value = file
  result.value = null
  if (!file) return

  loading.value = true

  // Only send the .ps1 file to backend, let backend handle verification
  const formData = new FormData()
  formData.append('script', file)

  const res = await fetch('/api/verify', {
    method: 'POST',
    body: formData
  })

  result.value = await res.json()
  loading.value = false
}
</script>
