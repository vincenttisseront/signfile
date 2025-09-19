<template>
  <div class="p-4 rounded-lg border border-energy/20 bg-energy/5 mt-6">
    <h3 class="text-lg font-semibold text-energy mb-2">
      <div class="flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clip-rule="evenodd" />
        </svg>
        Troubleshooting Resources
      </div>
    </h3>
    
    <div class="space-y-3 text-sm">
      <div class="flex items-start">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-energy mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
        </svg>
        <div>
          <NuxtLink to="/download-guide" class="font-medium text-energy hover:underline">
            Download Troubleshooting Guide
          </NuxtLink>
          <p class="text-xs text-modernity mt-1">
            If you're experiencing issues with downloading signed files, our guide offers multiple solutions
            to ensure your downloads work across different browsers.
          </p>
        </div>
      </div>
      
      <div class="flex items-start">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-energy mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2h-1V9z" clip-rule="evenodd" />
        </svg>
        <div>
          <NuxtLink to="/download-test" class="font-medium text-energy hover:underline">
            Download Test Tools
          </NuxtLink>
          <p class="text-xs text-modernity mt-1">
            Try our testing tools to identify the best download method for your browser and environment.
          </p>
        </div>
      </div>
      
      <div class="flex items-start">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-energy mr-2 flex-shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clip-rule="evenodd" />
        </svg>
        <div>
          <NuxtLink to="/about" class="font-medium text-energy hover:underline">
            About SignFile
          </NuxtLink>
          <p class="text-xs text-modernity mt-1">
            Learn more about SignFile's capabilities, supported file types, and best practices for code signing.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// No additional logic needed for this component
</script>