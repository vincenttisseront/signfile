<template>
  <div class="p-6 max-w-6xl mx-auto bg-white rounded-2xl shadow-xl space-y-6">
    <div class="text-center">
      <h2 class="text-2xl font-bold text-blue-700">Script Signer &amp; Verifier</h2>
      <p class="text-sm text-gray-600">Version: 1.0.4</p>
    </div>
    <div class="overflow-x-auto">
      <table class="table-auto w-full border-separate border-spacing-y-6">
        <tbody>
          <tr class="align-top">
            <td class="w-full md:w-1/2 pr-6 space-y-6">
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
                  <li> Uses <a href="https://ebourg.github.io/jsign/" target="_blank" class="text-blue-600 underline">jsign</a> for signing </li>
                </ul>
              </div>
              <div>
                <span class="font-semibold">What's new:</span>
                <ul class="list-disc ml-6 text-sm text-gray-700">
                  <li><strong>1.0.4:</strong> Fixed SSR/CSR tab state and hydration issues, About/Sign Script tabs now render correctly after refresh and never mix content.</li>
                  <li><strong>1.0.3:</strong> Improved NPM package version detection: now reads the actual installed version, added loading/error indicators for version checks and improved UI for outdated packages.</li>
                  <li><strong>1.0.2:</strong> Show all NPM package versions and update status dynamically from <code>package.json</code>.</li>
                  <li><strong>1.0.1:</strong> Improved certificate info display, fixed password popup logic, removed unused popup, and improved file cleanup.</li>
                  <li><strong>1.0.0:</strong> Initial release: sign scripts, manage certificates, PowerShell and OpenSSL support.</li>
                </ul>
              </div>
            </td>
            <td class="align-top space-y-6" style="width: auto; min-width: 320px;">
              <div v-if="versions && versions.versions && versions.versions.jsign" class="space-y-1 text-sm bg-gray-50 p-4 rounded-xl shadow-sm border border-gray-200">
                <div>
                  <span class="font-semibold">jsign version:</span>
                  <span v-if="versions.versions.jsign.current && versions.versions.jsign.current !== 'Unavailable'">
                    {{ versions.versions.jsign.current }}
                    <span class="text-green-600"><svg class="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" fill="#dcfce7"></circle><path stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2l4-4"></path></svg></span>
                  </span>
                  <span v-else class="text-red-600">Unavailable (jsign not found in container)</span>
                </div>
                <div>
                  <span class="font-semibold">OpenSSL version:</span>
                  <span v-if="versions.versions.openssl.current">
                    {{ versions.versions.openssl.current }}
                    <span v-if="versions.versions.openssl.outdated" class="text-yellow-600"> ⚠ </span>
                    <span v-else class="text-green-600"><svg class="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" fill="#dcfce7"></circle><path stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2l4-4"></path></svg></span>
                    <span class="text-gray-500">(latest: {{ versions.versions.openssl.latest }})</span>
                  </span>
                  <span v-else>Loading...</span>
                </div>
                <div>
                  <span class="font-semibold">OpenJDK version:</span>
                  <span v-if="versions.versions.openjdk.current">
                    {{ versions.versions.openjdk.current }}
                    <span class="text-green-600"><svg class="inline w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><circle cx="12" cy="12" r="10" fill="#dcfce7"></circle><path stroke="#22c55e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2l4-4"></path></svg></span>
                  </span>
                  <span v-else>Loading...</span>
                </div>
                <div>
                  <span class="font-semibold">Base image:</span>
                  <span v-if="versions.baseImage">{{ versions.baseImage }}</span>
                  <span v-else>Loading...</span>
                </div>
                <div>
                  <span class="font-semibold">NPM Packages:</span>
                  <div class="ml-6 mt-2">
                    <div v-if="!npmPackages">
                      <span class="text-gray-400">Loading NPM packages...</span>
                    </div>
                    <div v-else-if="npmPackages.length === 0">
                      <span class="text-gray-400">No NPM packages found.</span>
                    </div>
                    <div v-else>
                      <div v-for="pkg in npmPackages" :key="pkg.name" :class="pkg.outdated ? 'bg-yellow-50 rounded-md px-2 py-1 mb-1' : 'mb-1'">
                        <span class="font-mono">{{ pkg.name }}</span>: {{ pkg.current }} <span class="text-gray-500">(latest: {{ pkg.latest }})</span>
                        <span v-if="pkg.outdated" class="text-yellow-600"> ⚠</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center text-gray-400 py-8">Loading version information...</div>
            </td>
          </tr>
        </tbody>
      </table>
      <div class="text-center">
        <div><span class="font-semibold">Source &amp; License:</span> Private / Internal use </div>
        <div class="text-xs text-gray-400 mt-4 text-center"> © {{ currentYear.value }} iBanFirst. All rights reserved. </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAsyncData } from '#app'

const { data, pending, error } = useAsyncData('about-versions', async () => {
  const res = await fetch('/api/packages-versions')
  if (!res.ok) throw new Error('Failed to fetch versions')
  return await res.json()
})

const versions = computed(() => data.value || {
  baseImage: '',
  versions: {
    jsign: { current: '', latest: '', outdated: false },
    openssl: { current: '', latest: '', outdated: false, latest: '' },
    openjdk: { current: '', latest: '', outdated: false }
  },
  npmPackages: []
})

const npmPackages = computed(() => {
  // Always return a fresh array, sorted alphabetically, and never fallback to [] if loading
  if (!data.value) return null
  if (!Array.isArray(data.value.npmPackages)) return null
  // Sort: outdated first, then alphabetically
  return [...data.value.npmPackages].sort((a, b) => {
    if (a.outdated && !b.outdated) return -1
    if (!a.outdated && b.outdated) return 1
    return a.name.localeCompare(b.name)
  })
})

const currentYear = useState('current-year', () => new Date().getFullYear())
</script>
