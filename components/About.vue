<template>
  <div class="max-w-3xl mx-auto text-modernity">
    <h2 class="text-2xl font-bold mb-2 text-security h-[32px]">Script Signer &amp; Verifier</h2>
    <div class="mb-2 text-sm text-currency font-semibold">{{ appVersion.versionWithLabel() }}</div>
    <div class="mb-4">
      <span class="font-semibold text-currency">Developers:</span>
      <span class="ml-2">CyberSecurity Team</span>
    </div>
    <div class="mb-4">
      <span class="font-semibold text-currency">Version Information:</span>
      <div class="ml-4 mt-1 space-y-2">
        <ul class="list-disc pl-4 space-y-1 text-sm">
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
