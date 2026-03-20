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
const appVersion = useAppVersion()
</script>
