<template>
  <div class="p-8 max-w-lg mx-auto bg-white rounded-2xl shadow-xl space-y-6">
    <h2 class="text-2xl font-bold text-blue-700 mb-2">About This Application</h2>

    <div>
      <p>
        <span class="font-semibold">App:</span> Script Signer & Verifier<br>
        <span class="font-semibold">Version:</span> 1.0.0
      </p>
    </div>

    <div>
      <p>
        <span class="font-semibold">jsign version:</span>
        <span v-if="versions.versions.jsign.current">
          {{ versions.versions.jsign.current }}
          <span v-if="jsignStatus === 'latest'" title="Up to date" class="inline-block align-middle ml-1 text-green-600">
            <svg class="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" fill="#dcfce7"/>
              <path stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2l4-4"/>
            </svg>
          </span>
          <span v-else-if="jsignStatus === 'outdated'" title="Update available" class="inline-block align-middle ml-1 text-yellow-500">
            <svg class="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" fill="#fef9c3"/>
              <path stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01"/>
            </svg>
            <span class="ml-1 text-xs">Latest: {{ versions.versions.jsign.latest }}</span>
          </span>
        </span>
        <span v-else>Loading...</span>
      </p>

      <p>
        <span class="font-semibold">OpenSSL version:</span>
        <span v-if="versions.versions.openssl.current">
          {{ versions.versions.openssl.current }}
          <span v-if="opensslStatus === 'latest'" title="Up to date" class="inline-block align-middle ml-1 text-green-600">
            <svg class="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" fill="#dcfce7"/>
              <path stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2l4-4"/>
            </svg>
          </span>
          <span v-else-if="opensslStatus === 'outdated'" title="Update available" class="inline-block align-middle ml-1 text-yellow-500">
            <svg class="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" fill="#fef9c3"/>
              <path stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01"/>
            </svg>
            <span class="ml-1 text-xs">Latest: {{ versions.versions.openssl.latest }}</span>
          </span>
        </span>
        <span v-else>Loading...</span>
      </p>

      <p>
        <span class="font-semibold">OpenJDK version:</span>
        <span v-if="versions.versions.openjdk.current">
          {{ versions.versions.openjdk.current }}
          <span v-if="openjdkStatus === 'latest'" title="Up to date" class="inline-block align-middle ml-1 text-green-600">
            <svg class="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" fill="#dcfce7"/>
              <path stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2l4-4"/>
            </svg>
          </span>
          <span v-else-if="openjdkStatus === 'outdated'" title="Update available" class="inline-block align-middle ml-1 text-yellow-500">
            <svg class="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <circle cx="12" cy="12" r="10" fill="#fef9c3"/>
              <path stroke="#eab308" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01"/>
            </svg>
            <span class="ml-1 text-xs">Latest: {{ versions.versions.openjdk.latest }}</span>
          </span>
        </span>
        <span v-else>Loading...</span>
      </p>

      <p>
        <span class="font-semibold">Base image:</span>
        <span v-if="versions.baseImage">{{ versions.baseImage }}</span>
        <span v-else>Loading...</span>
      </p>
    </div>

    <div>
      <span class="font-semibold">Developers:</span>
      <ul class="list-disc ml-6">
        <li>CyberSecurity Team</li>
      </ul>
    </div>

    <div>
      <span class="font-semibold">Supported File Extensions:</span>
      <ul class="list-disc ml-6">
        <li>.ps1 (PowerShell scripts)</li>
        <li>.js, .ts (JavaScript/TypeScript)</li>
        <li>.json (JSON files)</li>
        <li>.txt (Text files)</li>
      </ul>
    </div>

    <div>
      <span class="font-semibold">Supported Certificate Formats:</span>
      <ul class="list-disc ml-6">
        <li>.pfx (PKCS#12)</li>
        <li>.pem (PEM X.509)</li>
      </ul>
    </div>

    <div>
      <span class="font-semibold">Features:</span>
      <ul class="list-disc ml-6">
        <li>Sign scripts with X.509 certificates</li>
        <li>Verify script signatures</li>
        <li>Store and manage certificates securely</li>
        <li>Supports PowerShell signature blocks</li>
        <li>Uses <a href="https://ebourg.github.io/jsign/" target="_blank" class="text-blue-600 underline">jsign</a> for signing</li>
      </ul>
    </div>

    <div>
      <span class="font-semibold">Source & License: </span>
      <span>Private / Internal use</span>
    </div>

    <div class="text-xs text-gray-400 mt-4 text-center">
      &copy; {{ new Date().getFullYear() }} iBanFirst. All rights reserved.
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'

const versions = ref({
  baseImage: '',
  versions: {
    jsign: { current: '', latest: '', outdated: false },
    openssl: { current: '', latest: '', outdated: false },
    openjdk: { current: '', latest: '', outdated: false }
  }
})

const jsignStatus = computed(() => {
  return versions.value.versions.jsign.outdated ? 'outdated' : 'latest'
})
const opensslStatus = computed(() => {
  return versions.value.versions.openssl.outdated ? 'outdated' : 'latest'
})
const openjdkStatus = computed(() => {
  return versions.value.versions.openjdk.outdated ? 'outdated' : 'latest'
})

onMounted(async () => {
  try {
    const res = await fetch('/api/packages-versions')
    if (res.ok) {
      const data = await res.json()
      versions.value = data
    }
  } catch {
    // fallback on failure
    versions.value = {
      baseImage: '',
      versions: {
        jsign: { current: 'Unavailable', latest: '', outdated: false },
        openssl: { current: 'Unavailable', latest: '', outdated: false },
        openjdk: { current: 'Unavailable', latest: '', outdated: false }
      }
    }
  }
})

</script>
