<template>
  <div class="p-4 rounded-lg border border-security-20 bg-care shadow-sm">
    <h2 class="text-xl font-semibold mb-4 text-security border-b border-security-30 pb-2">System &amp; Version Info</h2>
    <div class="flex flex-col md:flex-row items-center gap-3 mb-6">
      <div class="bg-currency-10 px-3 py-2 rounded-lg inline-flex items-center">
        <span class="font-bold text-currency">App Version:</span>
        <span class="ml-2 text-modernity font-mono">{{ appVersion.version }}</span>
      </div>
      <button @click="fetchSystemInfo" class="btn btn-secondary btn-sm" :disabled="loadingSystem">
        <span v-if="!loadingSystem">Refresh System Info</span>
        <span v-else class="flex items-center gap-2">
          <span class="inline-block h-4 w-4 border-2 border-t-transparent border-care animate-spin rounded-full"></span>
          Loading...
        </span>
      </button>
    </div>
    <div class="min-h-[100px] relative">
      <div v-if="loadingSystem" class="absolute inset-0 flex items-center justify-center bg-care-50 backdrop-blur-sm rounded">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-security"></div>
      </div>
      <div v-else-if="adminVersions">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div class="p-2 rounded bg-security-5"><span class="font-semibold text-currency">jsign version:</span> <span
              class="ml-2">{{ adminVersions?.versions?.jsign?.current || 'N/A' }}</span></div>
          <div class="p-2 rounded bg-security-5"><span class="font-semibold text-currency">OpenSSL version:</span>
            <span class="ml-2">{{ adminVersions?.versions?.openssl?.current || 'N/A' }}</span>
            <span class="text-xs text-security" v-if="adminVersions?.versions?.openssl?.latest">(latest: {{ adminVersions.versions.openssl.latest }})</span>
          </div>
          <div class="p-2 rounded bg-security-5"><span class="font-semibold text-currency">OpenJDK version:</span>
            <span class="ml-2">{{ adminVersions?.versions?.openjdk?.current || 'N/A' }}</span>
          </div>
          <div class="p-2 rounded bg-security-5"><span class="font-semibold text-currency">Base image:</span> <span
              class="ml-2">{{ adminVersions?.baseImage || 'N/A' }}</span></div>
        </div>
      </div>
      <div v-else class="text-security-50 italic text-center py-4">No system information available. Click "Refresh System Info" to load data.</div>
    </div>
  </div>
</template>

<script>
import { useAppVersion } from '~/composables/useAppVersion';

export default {
  name: 'SystemInfo',
  setup() {
    const appVersion = useAppVersion();
    return {
      appVersion
    };
  },
  data() {
    return {
      adminVersions: null,
      loadingSystem: false
    }
  },
  mounted() {
    this.fetchSystemInfo();
  },
  methods: {
    async fetchSystemInfo() {
      this.loadingSystem = true;
      try {
        // Fixed: Use the correct API endpoint for system information
        const response = await fetch('/api/packages-versions');
        if (!response.ok) {
          throw new Error(`Error loading system data: ${response.status}`);
        }
        
        const data = await response.json();
        this.adminVersions = data;
      } catch (error) {
        console.error('Error loading system info:', error);
      } finally {
        this.loadingSystem = false;
      }
    }
  }
}
</script>
