<template>
  <div class="p-8 max-w-lg mx-auto bg-white rounded-2xl shadow-xl space-y-6 border border-gray-200">
    <h2 class="text-xl font-semibold text-blue-700">Inspect File Signature</h2>
    <form @submit.prevent class="space-y-4">
      <div>
        <label class="block mb-1 font-medium text-gray-700" for="script">Upload Script File</label>
        <input
          id="script"
          type="file"
          accept=".txt,.js,.ts,.json,.ps1"
          @change="handleScriptFile"
          required
          class="block w-full text-gray-700 file:bg-gray-100 file:border-0 file:rounded-lg file:px-4 file:py-2 file:text-blue-700 file:font-medium file:cursor-pointer"
        />
      </div>
    </form>

    <div v-if="loading" class="text-blue-600 text-sm mt-4">Analyzing file...</div>

    <div v-if="result !== null && !loading" class="mt-6 border-t pt-4">
      <template v-if="result.verified">
        <div class="text-green-600 font-semibold text-lg">
          Verification: ✔ Valid Signature
        </div>
        <div class="text-sm mt-3 space-y-1">
          <div><strong>Subject:</strong> {{ result.certificate.subject }}</div>
          <div><strong>Issuer:</strong> {{ result.certificate.issuer }}</div>
          <div><strong>Serial:</strong> {{ result.certificate.serial }}</div>
          <div><strong>Fingerprint:</strong> {{ result.certificate.fingerprint }}</div>
          <div><strong>Algorithm:</strong> {{ result.certificate.algorithm }}</div>
        </div>
      </template>
      <template v-else>
        <div class="text-red-600 font-semibold text-lg">
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

  // Try to extract signature and certificate from the script file
  const { signature, certificate } = await extractSignatureAndCert(file)
  if (!signature || !certificate) {
    result.value = { verified: false }
    loading.value = false
    return
  }

  // Prepare form data for backend verification
  const formData = new FormData()
  formData.append('script', file)
  formData.append('signature', signature)
  formData.append('certificate', new File([certificate], 'cert.pem'))

  // Call backend verify endpoint
  const res = await fetch('/api/verify', {
    method: 'POST',
    body: formData
  })
  result.value = await res.json()
  loading.value = false
}

// Try to extract signature and certificate from the script file
async function extractSignatureAndCert(file) {
  const text = await file.text()
  // Try PowerShell signature block first (for .ps1 files)
  // PowerShell signature block format:
  // # SIG # Begin signature block
  // ...base64 signature...
  // # SIG # End signature block
  let signature = null
  let certificate = null

  // Try PowerShell signature block
  const psSigMatch = text.match(/# SIG # Begin signature block[\r\n]+([\s\S]+?)# SIG # End signature block/)
  if (psSigMatch) {
    // Remove all "# SIG #" and whitespace, join base64 lines
    const base64Lines = psSigMatch[1]
      .split('\n')
      .map(line => line.replace(/^# SIG #/, '').replace(/[\r\n]/g, '').trim())
      .filter(Boolean)
    signature = base64Lines.join('')
    // Try to extract embedded certificate (if present)
    // Not always possible, so fallback to null
    // (Backend should handle signature/cert extraction for PS1)
  }

  // Fallback to PEM blocks (for text-based signatures)
  if (!signature) {
    const sigMatch = text.match(/-----BEGIN SIGNATURE-----\s*([\s\S]+?)\s*-----END SIGNATURE-----/)
    signature = sigMatch ? sigMatch[1].replace(/\s+/g, '') : null
  }
  if (!certificate) {
    const certMatch = text.match(/-----BEGIN CERTIFICATE-----[\s\S]+?-----END CERTIFICATE-----/)
    certificate = certMatch ? certMatch[0] : null
  }

  return { signature, certificate }
}
</script>
