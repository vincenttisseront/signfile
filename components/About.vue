<template>
  <div class="bg-care rounded-xl p-6 text-modernity">
    <h2 class="text-2xl font-bold mb-2 text-security">Script Signer &amp; Verifier</h2>
    <div class="mb-2 text-sm text-currency font-semibold">Version: 1.0.5</div>
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
      <span class="font-semibold text-currency">What's new:</span>
      <ul class="ml-4 mt-1 list-disc text-sm">
        <li><span class="font-semibold">1.0.5:</span> Okta authentication plugin: improved SSR/CSR safety, global Okta instance..</li>
        <li><span class="font-semibold">1.0.4:</span> Fixed SSR/CSR tab state and hydration issues, About/Sign Script tabs now render correctly after refresh and never mix content.</li>
        <li><span class="font-semibold">1.0.3:</span> Improved NPM package version detection: now reads the actual installed version, added loading/error indicators for version checks and improved UI for outdated packages.</li>
        <li><span class="font-semibold">1.0.2:</span> Show all NPM package versions and update status dynamically from package.json.</li>
        <li><span class="font-semibold">1.0.1:</span> Improved certificate info display, fixed password popup logic, removed unused popup, and improved file cleanup.</li>
        <li><span class="font-semibold">1.0.0:</span> Initial release: sign scripts, manage certificates, PowerShell and OpenSSL support.</li>
      </ul>
    </div>
    <div class="mt-6">
      <span class="font-semibold text-currency">Source &amp; License:</span> Private / Internal use
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
