<template>
  <div class="p-4 bg-gray-100 rounded-lg max-w-md mx-auto my-4">
    <h2 class="text-lg font-bold mb-4">Download Test Tool</h2>
    <p class="mb-4 text-sm">
      Use this tool to test file download capabilities in different browsers.
      This helps verify that HTTP headers are properly configured.
    </p>
    
    <div class="mb-4">
      <label class="block text-sm font-medium text-gray-700">File Type</label>
      <select v-model="selectedType" class="mt-1 block w-full p-2 border border-gray-300 rounded-md">
        <option value="txt">Text File (.txt)</option>
        <option value="cmd">Command Script (.cmd)</option>
        <option value="ps1">PowerShell Script (.ps1)</option>
      </select>
    </div>
    
    <div class="flex flex-col space-y-2">
      <button 
        @click="downloadDirectly" 
        class="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
      >
        Direct Download
      </button>
      
      <button 
        @click="downloadWithAnchor" 
        class="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
      >
        Download with Anchor Element
      </button>
      
      <button 
        @click="downloadWithIframe" 
        class="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded"
      >
        Download with iframe
      </button>
      
      <button 
        @click="downloadWithFetch" 
        class="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded"
      >
        Download with Fetch API
      </button>
    </div>
    
    <!-- Hidden iframe for downloads -->
    <iframe 
      ref="downloadFrame" 
      style="display:none;" 
      width="0" 
      height="0" 
      frameborder="0"
    ></iframe>
    
    <!-- Status display -->
    <div class="mt-4 p-2 border rounded bg-white">
      <p class="font-medium">Last Action:</p>
      <p class="text-sm" v-if="lastAction">{{ lastAction }}</p>
      <p class="text-sm text-gray-500" v-else>No actions performed yet</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const selectedType = ref('txt')
const downloadFrame = ref(null)
const lastAction = ref('')

// Direct window.location approach
function downloadDirectly() {
  lastAction.value = `Direct download started for ${selectedType.value} file`
  window.location.href = `/api/download-test?type=${selectedType.value}`
}

// Using anchor element
function downloadWithAnchor() {
  lastAction.value = `Anchor element download started for ${selectedType.value} file`
  const link = document.createElement('a')
  link.href = `/api/download-test?type=${selectedType.value}`
  link.setAttribute('download', `test-file.${selectedType.value}`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// Using iframe
function downloadWithIframe() {
  lastAction.value = `iframe download started for ${selectedType.value} file`
  if (downloadFrame.value) {
    downloadFrame.value.src = `/api/download-test?type=${selectedType.value}`
  }
}

// Using Fetch API
async function downloadWithFetch() {
  lastAction.value = `Fetch API download started for ${selectedType.value} file`
  try {
    const response = await fetch(`/api/download-test?type=${selectedType.value}`)
    if (!response.ok) throw new Error('Network response was not ok')
    
    const blob = await response.blob()
    const contentDisposition = response.headers.get('Content-Disposition')
    let filename = 'downloaded-file'
    
    // Try to extract filename from Content-Disposition header
    if (contentDisposition) {
      const filenameMatch = contentDisposition.match(/filename="(.+)"/)
      if (filenameMatch && filenameMatch[1]) {
        filename = filenameMatch[1]
      }
    } else {
      filename = `test-file.${selectedType.value}`
    }
    
    // Create URL and download
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    
    // Cleanup
    window.URL.revokeObjectURL(url)
    document.body.removeChild(link)
    
    lastAction.value += ' - completed successfully'
  } catch (error) {
    console.error('Download failed:', error)
    lastAction.value += ` - failed: ${error.message}`
  }
}
</script>