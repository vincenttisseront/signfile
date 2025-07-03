<template>
  <div class="max-w-3xl mx-auto text-modernity">
    <h2 class="text-2xl font-bold mb-2 text-security h-[32px]">Script Signer &amp; Verifier</h2>
    <div class="mb-2 text-sm text-currency font-semibold">{{ appVersion.versionWithLabel() }}</div>
    <div class="mb-4">
      <span class="font-semibold text-currency">Developers:</span>
      <span class="ml-2">CyberSecurity Team</span>
    </div>
    <div class="mb-4">
      <span class="font-semibold text-currency">Supported File Extensions:</span>
      <ul class="ml-4 mt-1 list-disc text-sm">
        <li>.ps1 (PowerShell scripts)</li>
        <li>.js, .ts (JavaScript/TypeScript)</li>
        <li>.json (JSON files)</li>
        <li>.txt (Text files)</li>
      </ul>
    </div>
    <div class="mb-4">
      <span class="font-semibold text-currency">Supported Certificate Formats:</span>
      <ul class="ml-4 mt-1 list-disc text-sm">
        <li>.pfx (PKCS#12)</li>
        <li>.pem (PEM X.509)</li>
      </ul>
    </div>
    <div class="mb-4">
      <span class="font-semibold text-currency">Features:</span>
      <ul class="ml-4 mt-1 list-disc text-sm">
        <li>Sign scripts with X.509 certificates</li>
        <li>Verify script signatures</li>
        <li>Store and manage certificates securely</li>
        <li>Supports PowerShell signature blocks</li>
        <li>Uses jsign for signing</li>
      </ul>
    </div>
    <div class="mb-4">
      <span class="font-semibold text-currency">Version Information:</span>
      <div class="ml-4 mt-1 space-y-2">
        <ul class="list-disc pl-4 space-y-1 text-sm">
          <li><span class="font-semibold">1.0.7:</span> Updated Okta authentication to use Authorization Code flow with PKCE for improved security and compatibility. Added centralized version management.</li>
          <li><span class="font-semibold">1.0.6:</span> Modernized layout with fullscreen design and left sidebar navigation. Moved authentication to the sidebar for global access. Unified CSS, fixed Tailwind integration, and improved responsive design.</li>
          <li><span class="font-semibold">1.0.5:</span> Okta authentication plugin: improved SSR/CSR safety, global Okta instance, and window.__oktaAuth fallback for debugging. Refactored plugin initialization and error handling.</li>
          <li><span class="font-semibold">1.0.4:</span> Added stored certificate management, certificate password validation, and user feedback improvements.</li>
          <li><span class="font-semibold">1.0.3:</span> Fixed compatibility issues with different certificate types and added better error handling.</li>
          <li><span class="font-semibold">1.0.2:</span> Improved security features and certificate validation.</li>
          <li><span class="font-semibold">1.0.1:</span> Added support for more script types and improved UI.</li>
          <li><span class="font-semibold">1.0.0:</span> Initial release with basic signing and verification features.</li>
        </ul>
      </div>
    </div>
    <div class="mt-6">
      <span class="font-semibold text-currency">Source &amp; License:</span> Private / Internal use
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useAsyncData } from '#app'
import { useAppVersion } from '~/composables/useAppVersion'

// Get the app version from the composable
const appVersion = useAppVersion()

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
