<template>
  <div class="mt-4 p-4 bg-security/5 rounded-lg">
    <h3 class="text-lg font-medium mb-2">File Download Diagnostic</h3>
    <p class="text-sm mb-3">Use these buttons to test file downloads directly:</p>
    
    <div class="flex flex-wrap gap-2">
      <button 
        @click="testDownload('txt')" 
        class="btn btn-outline btn-sm"
        :disabled="loading"
      >
        Test Text Download
      </button>
      
      <button 
        @click="testDownload('cmd')" 
        class="btn btn-outline btn-sm"
        :disabled="loading"
      >
        Test CMD Download
      </button>
      
      <a 
        href="/api/file-download-test?type=txt" 
        download="test.txt"
        class="btn btn-outline btn-sm"
        target="_blank"
      >
        Direct Link (TXT)
      </a>
      
      <a 
        href="/api/file-download-test?type=cmd" 
        download="test.cmd"
        class="btn btn-outline btn-sm"
        target="_blank"
      >
        Direct Link (CMD)
      </a>
    </div>
    
    <div v-if="result" class="mt-3 p-3 bg-security/10 rounded-md text-sm">
      <pre class="whitespace-pre-wrap text-xs">{{ result }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const loading = ref(false);
const result = ref('');

async function testDownload(fileType) {
  loading.value = true;
  result.value = `Testing ${fileType} file download...\n`;
  
  try {
    // Log start of test
    result.value += `Fetching /api/file-download-test?type=${fileType}\n`;
    
    // Fetch the file
    const response = await fetch(`/api/file-download-test?type=${fileType}`);
    
    // Log response details
    result.value += `Response status: ${response.status} ${response.statusText}\n`;
    result.value += 'Response headers:\n';
    
    response.headers.forEach((value, key) => {
      result.value += `- ${key}: ${value}\n`;
    });
    
    if (response.ok) {
      // Get the blob
      const blob = await response.blob();
      result.value += `Received file: ${blob.size} bytes, type: ${blob.type}\n`;
      
      // Get filename from Content-Disposition
      let filename = `test.${fileType}`;
      const disposition = response.headers.get('Content-Disposition');
      if (disposition) {
        const match = disposition.match(/filename="(.+?)"/);
        if (match) filename = match[1];
      }
      
      // Create object URL
      const url = URL.createObjectURL(blob);
      result.value += `Created blob URL: ${url}\n`;
      
      // Create and trigger download
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      
      result.value += `Triggering download of ${filename}...\n`;
      
      // Try multiple download methods
      try {
        a.click();
        result.value += '✅ Download triggered via click()\n';
        
        const clickEvent = new MouseEvent('click', {
          view: window,
          bubbles: true,
          cancelable: false
        });
        a.dispatchEvent(clickEvent);
        result.value += '✅ Download triggered via dispatchEvent()\n';
      } catch (err) {
        result.value += `❌ Error triggering download: ${err}\n`;
      }
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        result.value += '✅ Download link removed and URL revoked\n';
      }, 100);
      
      result.value += '✅ Download test completed\n';
    } else {
      result.value += '❌ Failed to fetch file\n';
      try {
        const errorText = await response.text();
        result.value += `Error details: ${errorText}\n`;
      } catch (e) {
        result.value += `Could not read error details: ${e}\n`;
      }
    }
  } catch (error) {
    result.value += `❌ Error during test: ${error.message}\n`;
  } finally {
    loading.value = false;
  }
}
</script>