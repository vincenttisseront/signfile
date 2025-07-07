<template>
  <div class="p-4 rounded-lg border border-security-20 bg-care shadow-sm">
    <h2 class="text-xl font-semibold mb-4 text-security border-b border-security-30 pb-2">NPM Package Management</h2>
    <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
      <div class="flex items-center gap-3">
        <button @click="fetchPackages"
          class="bg-security text-care hover-bg-security-80 transition-colors duration-200 px-4 py-1.5 rounded font-medium flex items-center gap-2"
          :disabled="loadingPackages">
          <svg v-if="!loadingPackages" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
          </svg>
          <span v-if="!loadingPackages">Refresh Packages</span>
          <span v-else class="flex items-center gap-2">
            <span class="inline-block h-4 w-4 border-2 border-t-transparent border-care animate-spin rounded-full"></span>
            Loading...
          </span>
        </button>
        
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input 
            type="checkbox" 
            v-model="includePrerelease"
            @change="fetchPackages"
            class="form-checkbox h-4 w-4 text-security rounded border-security-30 focus:ring-security" 
          />
          <span class="text-sm" :class="includePrerelease ? 'text-security-80 font-medium' : 'text-modernity-80'">
            Include pre-release versions
            <span class="bg-yellow-100 text-yellow-800 text-[10px] px-1 py-0.5 rounded font-medium ml-1">ALPHA/BETA/RC</span>
          </span>
        </label>

        <label class="flex items-center gap-2 cursor-pointer select-none ml-4">
          <input 
            type="checkbox" 
            v-model="showDebugInfo"
            class="form-checkbox h-4 w-4 text-energy rounded border-energy-30 focus:ring-energy" 
          />
          <span class="text-xs text-modernity-70">
            Show debug info
          </span>
        </label>
      </div>
      
      <div class="flex items-center gap-2 text-xs text-modernity-70">
        <div class="flex items-center">
          <span class="inline-block w-3 h-3 bg-[#fffde0] mr-1 border border-security-10"></span>
          <span>Needs update</span>
        </div>
        <div class="flex items-center ml-2">
          <span class="inline-block w-3 h-3 bg-security-5 mr-1 border border-security-10"></span>
          <span>Up to date</span>
        </div>
        <div class="flex items-center ml-2">
          <span class="inline-block px-1 bg-yellow-100 text-yellow-800 text-[10px] font-medium rounded border border-yellow-200 mr-1">BETA</span>
          <span>Pre-release version</span>
        </div>
        <div v-if="!loadingPackages && npmPackages.length > 0" class="ml-2 px-2 py-0.5 rounded-full bg-security-10">
          {{ npmPackages.filter(p => p.outdated).length }} / {{ npmPackages.length }} need updates
        </div>
      </div>
    </div>
    <div class="min-h-[100px] relative">
      <div v-if="loadingPackages" class="absolute inset-0 flex items-center justify-center bg-care-50 backdrop-blur-sm rounded">
        <div class="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-security"></div>
      </div>
      <div v-else class="border border-gray-300 rounded-lg overflow-hidden">
        <table class="w-full">
          <thead>
            <tr class="bg-security-10 border-b border-gray-300">
              <th class="py-2 px-3 text-left text-xs font-medium text-modernity-80 uppercase tracking-wider">Package</th>
              <th class="py-2 px-3 text-left text-xs font-medium text-modernity-80 uppercase tracking-wider w-1/6">Current</th>
              <th class="py-2 px-3 text-left text-xs font-medium text-modernity-80 uppercase tracking-wider w-1/6">Latest</th>
              <th class="py-2 px-3 text-left text-xs font-medium text-modernity-80 uppercase tracking-wider w-1/6">Repository</th>
              <th v-if="showDebugInfo" class="py-2 px-3 text-left text-xs font-medium text-modernity-80 uppercase tracking-wider w-24">Debug</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pkg in sortedPackages" :key="pkg.name"
              :class="[
                'border-b border-gray-300 last:border-b-0',
                pkg.outdated ? 'bg-[#fffde0]' : 'bg-security-5'
              ]">
              <td class="py-1.5 px-3">
                <div class="flex items-center gap-2">
                  <span v-if="pkg.outdated" class="text-energy text-lg">⚠️</span>
                  <span v-else class="text-green-600 text-lg">✅</span>
                  <span class="font-mono text-modernity font-medium">{{ pkg.name }}</span>
                </div>
              </td>
              <td class="py-1.5 px-3 text-xs text-modernity-80 font-mono">
                {{ pkg.current }}
              </td>
              <td class="py-1.5 px-3 text-xs font-mono" :class="pkg.outdated ? 'text-energy-80 font-medium' : 'text-modernity-60'">
                <span>{{ pkg.latest || '-' }}<span v-if="pkg.latestReleaseDate"> ({{ new Date(pkg.latestReleaseDate).toLocaleDateString() }})</span></span>
                <span v-if="pkg.isPrerelease" class="ml-1 px-1 py-0.5 rounded text-[10px] bg-yellow-100 text-yellow-800 font-medium">
                  BETA
                </span>
              </td>
              <td class="py-1.5 px-3 text-xs">
                <a v-if="getRepoUrl(pkg.name)" 
                   :href="getRepoUrl(pkg.name)" 
                   target="_blank"
                   rel="noopener noreferrer" 
                   class="text-security hover:text-security-75 transition-colors flex items-center gap-1">
                  <svg v-if="getRepoUrl(pkg.name).includes('github.com')" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 576 512" fill="currentColor">
                    <path d="M288 32c-80.8 0-145.5 36.8-192.6 80.6C48.6 156 17.3 208 2.5 243.7c-3.3 7.9-3.3 16.7 0 24.6C17.3 304 48.6 356 95.4 399.4C142.5 443.2 207.2 480 288 480s145.5-36.8 192.6-80.6c46.8-43.5 78.1-95.4 93-131.1c3.3-7.9 3.3-16.7 0-24.6c-14.9-35.7-46.2-87.7-93-131.1C433.5 68.8 368.8 32 288 32zM144 256a144 144 0 1 1 288 0 144 144 0 1 1 -288 0zm144-64c0 35.3-28.7 64-64 64c-7.1 0-13.9-1.2-20.3-3.3c-5.5-1.8-11.9 1.6-11.7 7.4c.3 6.9 1.3 13.8 3.2 20.7c13.7 51.2 66.4 81.6 117.6 67.9s81.6-66.4 67.9-117.6c-11.1-41.5-47.8-69.4-88.6-71.1c-5.8-.2-9.2 6.1-7.4 11.7c2.1 6.4 3.3 13.2 3.3 20.3z"/>
                  </svg>
                  {{ pkg.repository?.includes('github.com') ? 'View on GitHub' : 'View on npm' }}
                </a>
                <span v-else class="text-modernity-30 italic">Not available</span>
              </td>
              <td v-if="showDebugInfo" class="py-1.5 px-3 text-xs">
                <pre class="text-xs text-modernity-50">{{ pkg }}</pre>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="npmPackages.length === 0" class="text-modernity-70 italic text-center py-4">
          No packages loaded. Click "Refresh Packages" to load data.
        </div>
        <div v-if="errorMessage" class="bg-energy/10 border border-energy text-energy p-3 mt-4 rounded-md text-sm">
          <strong>Error:</strong> {{ errorMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PackageManagement',
  data() {
    return {
      npmPackages: [],
      loadingPackages: false,
      includePrerelease: false,
      showDebugInfo: false,
      errorMessage: null
    }
  },
  computed: {
    sortedPackages() {
      return [...this.npmPackages].sort((a, b) => {
        // Sort outdated packages first
        if (a.outdated && !b.outdated) return -1;
        if (!a.outdated && b.outdated) return 1;
        
        // Then alphabetically by name
        return a.name.localeCompare(b.name);
      });
    }
  },
  mounted() {
    this.fetchPackages();
  },
  methods: {
    async fetchPackages() {
      this.loadingPackages = true;
      this.errorMessage = null;
      
      try {
        const response = await fetch(`/api/packages-versions?includePrerelease=${this.includePrerelease}`);
        
        if (!response.ok) {
          throw new Error(`Error loading package data: ${response.status}`);
        }
        
        const data = await response.json();
        // The API returns npmPackages, not packages
        this.npmPackages = data.npmPackages || [];
        
        if (!this.npmPackages || this.npmPackages.length === 0) {
          console.warn('No packages were returned from the server.');
          // Only set an error if we genuinely think there's an issue
          if (response.ok && data && !data.npmPackages) {
            this.errorMessage = "Server response is missing the expected data structure. Check the server logs for details.";
          }
        }
      } catch (error) {
        console.error('Error loading package info:', error);
        this.errorMessage = error instanceof Error ? error.message : 'Unknown error loading package data';
      } finally {
        this.loadingPackages = false;
      }
    },
    
    getRepoUrl(packageName) {
      const pkg = this.npmPackages.find(p => p.name === packageName);
      if (!pkg || !pkg.repository) return null;
      
      return pkg.repository;
    },
    
    async updatePackage(packageName) {
      if (!confirm(`Are you sure you want to update ${packageName}?`)) {
        return;
      }
      
      try {
        const response = await fetch('/api/npm-update', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            packageName: packageName
          })
        });
        
        if (!response.ok) {
          throw new Error(`Error updating package: ${response.status}`);
        }
        
        const result = await response.json();
        alert(`Package update ${result.success ? 'succeeded' : 'failed'}: ${result.message}`);
        
        if (result.success) {
          await this.fetchPackages();
        }
      } catch (error) {
        console.error('Error updating package:', error);
        alert(`Failed to update package: ${error.message}`);
      }
    }
  }
}
</script>
