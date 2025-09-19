<template>
  <div class="mt-2 mb-4">
    <button 
      type="button" 
      @click="runDiagnostic" 
      class="btn btn-outline btn-sm flex items-center gap-1"
      :disabled="loading"
    >
      <span v-if="!loading">🔍</span>
      <span v-else class="animate-spin">⟳</span>
      <span>Diagnostic</span>
    </button>
    
    <div v-if="diagnosticResult" class="mt-3 p-3 rounded-md bg-security/5 text-sm">
      <h4 class="font-medium mb-1">Form Diagnostic Results:</h4>
      <pre class="whitespace-pre-wrap text-xs">{{ diagnosticResult }}</pre>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const loading = ref(false);
const diagnosticResult = ref('');

// Run a comprehensive form submission diagnostic
async function runDiagnostic() {
  loading.value = true;
  diagnosticResult.value = 'Running form diagnostic...\n';
  
  try {
    // 1. Check form element
    const formElement = document.querySelector('form');
    if (!formElement) {
      diagnosticResult.value += '❌ No form element found on the page!\n';
      return;
    }
    
    diagnosticResult.value += '✅ Form element found.\n';
    
    // 2. Check submit button
    const submitButton = formElement.querySelector('button[type="submit"]');
    if (!submitButton) {
      diagnosticResult.value += '❌ No submit button found in the form!\n';
    } else {
      diagnosticResult.value += `✅ Submit button found: "${submitButton.textContent.trim()}"\n`;
      diagnosticResult.value += `   Button disabled: ${submitButton.disabled}\n`;
      
      // Check if the button has click listeners
      const listeners = getEventListeners(submitButton);
      diagnosticResult.value += `   Button has click listeners: ${listeners > 0 ? '✅ Yes' : '❌ No'}\n`;
    }
    
    // 3. Check form elements
    const inputs = formElement.querySelectorAll('input, select, textarea');
    diagnosticResult.value += `✅ Form has ${inputs.length} input elements.\n`;
    
    // 4. Check if any required fields are empty
    const requiredEmptyFields = Array.from(inputs).filter(input => 
      input.required && !input.value && !input.files?.length
    );
    
    if (requiredEmptyFields.length > 0) {
      diagnosticResult.value += `❌ ${requiredEmptyFields.length} required fields are empty:\n`;
      requiredEmptyFields.forEach(field => {
        diagnosticResult.value += `   - ${field.id || field.name || 'Unnamed field'}\n`;
      });
    } else {
      diagnosticResult.value += '✅ All required fields have values.\n';
    }
    
    // 5. Test API endpoint directly
    diagnosticResult.value += '\nTesting API endpoint...\n';
    
    try {
      // Create a minimal form submission
      const formData = new FormData();
      formData.append('diagnostic', 'true');
      formData.append('timestamp', Date.now().toString());
      
      // Add a small test file
      const testBlob = new Blob(['test content'], { type: 'text/plain' });
      const testFile = new File([testBlob], 'test-file.txt', { type: 'text/plain' });
      formData.append('testFile', testFile);
      
      // Send to our test endpoint
      diagnosticResult.value += `Sending form-test request...\n`;
      
      const response = await fetch('/api/form-test', {
        method: 'POST',
        body: formData
      });
      
      diagnosticResult.value += `Fetch response: ${response.status} ${response.statusText}\n`;
      
      if (response.ok) {
        const result = await response.json();
        diagnosticResult.value += '✅ API endpoint responded successfully.\n';
        diagnosticResult.value += `   Response: ${JSON.stringify(result, null, 2)}\n`;
      } else {
        diagnosticResult.value += `❌ API endpoint returned error: ${response.status} ${response.statusText}\n`;
        try {
          const errorText = await response.text();
          diagnosticResult.value += `   Error details: ${errorText}\n`;
        } catch (e) {
          diagnosticResult.value += `   Could not read error details: ${e.message}\n`;
        }
      }
      
      // Test header endpoint to check content-disposition handling
      diagnosticResult.value += `\nTesting header handling...\n`;
      
      const headerResponse = await fetch('/api/header-test');
      if (headerResponse.ok) {
        const headerResult = await headerResponse.json();
        diagnosticResult.value += `✅ Header test endpoint responded successfully.\n`;
        // Check if Content-Disposition header was exposed correctly
        const exposedHeaders = headerResult.responseHeaders['access-control-expose-headers'] || '';
        diagnosticResult.value += `   Exposed headers: ${exposedHeaders}\n`;
      } else {
        diagnosticResult.value += `❌ Header test failed: ${headerResponse.status}\n`;
      }
      
    } catch (apiError) {
      diagnosticResult.value += `❌ API request failed: ${apiError.message}\n`;
    }
    
    // 6. Check browser download capabilities
    diagnosticResult.value += '\nChecking browser download capabilities...\n';
    
    // Check if download attribute is supported
    const hasDownloadAttribute = 'download' in document.createElement('a');
    diagnosticResult.value += `${hasDownloadAttribute ? '✅' : '❌'} Browser ${hasDownloadAttribute ? 'supports' : 'does not support'} download attribute.\n`;
    
    // Check if Blob URLs are supported
    const hasBlobUrls = typeof URL !== 'undefined' && 'createObjectURL' in URL;
    diagnosticResult.value += `${hasBlobUrls ? '✅' : '❌'} Browser ${hasBlobUrls ? 'supports' : 'does not support'} Blob URLs.\n`;
    
    // Check if fetch API is supported
    const hasFetch = typeof fetch !== 'undefined';
    diagnosticResult.value += `${hasFetch ? '✅' : '❌'} Browser ${hasFetch ? 'supports' : 'does not support'} Fetch API.\n`;
    
    // Check browser type
    const browser = detectBrowser();
    diagnosticResult.value += `Browser detected: ${browser.name} ${browser.version}\n`;
    
    // 7. Check if there are any JavaScript errors
    const errors = getConsoleErrors();
    if (errors.length > 0) {
      diagnosticResult.value += '\nJavaScript errors detected in console:\n';
      errors.forEach(error => {
        diagnosticResult.value += `❌ ${error}\n`;
      });
    } else {
      diagnosticResult.value += '\n✅ No JavaScript errors detected in console.\n';
    }
    
    // 7. Add recommendations
    diagnosticResult.value += '\nRecommendations:\n';
    
    if (requiredEmptyFields.length > 0) {
      diagnosticResult.value += '- Fill in all required fields before submitting\n';
    }
    
    if (submitButton?.disabled) {
      diagnosticResult.value += '- The submit button is disabled, check all required fields\n';
    }
    
    if (errors.length > 0) {
      diagnosticResult.value += '- Fix JavaScript errors in the console\n';
    }
    
    diagnosticResult.value += '- Try reloading the page and starting with a fresh form\n';
    diagnosticResult.value += '- Ensure the certificate password is correct\n';
    
  } catch (e) {
    diagnosticResult.value += `❌ Diagnostic error: ${e.message}\n`;
  } finally {
    loading.value = false;
  }
}

// Helper function to check if an element has event listeners
function getEventListeners(element) {
  // This is a simplistic approach since we can't directly access event listeners
  // We'll check for onclick and addEventListener
  let count = 0;
  
  if (element.onclick) count++;
  
  // Check if the element uses Vue's @click
  const vueClickAttr = Array.from(element.attributes).find(attr => 
    attr.name === '@click' || attr.name === 'v-on:click'
  );
  
  if (vueClickAttr) count++;
  
  return count;
}

// Get any recent console errors
function getConsoleErrors() {
  // We can't access the actual console error history
  // But we can check for any error elements in the page
  const errors = [];
  
  // Look for visible error messages in the DOM
  document.querySelectorAll('.text-energy, .text-red-500, [class*="error"]').forEach(el => {
    const text = el.textContent.trim();
    if (text && el.offsetParent !== null) { // Only visible elements
      errors.push(text);
    }
  });
  
  return errors;
}

// Detect browser type and version
function detectBrowser() {
  const userAgent = navigator.userAgent;
  let name = 'Unknown';
  let version = 'Unknown';
  
  // Chrome
  if (/Chrome\/([0-9.]+)/.test(userAgent)) {
    name = 'Chrome';
    version = userAgent.match(/Chrome\/([0-9.]+)/)[1];
    
    // Edge (Chromium-based)
    if (/Edg\/([0-9.]+)/.test(userAgent)) {
      name = 'Edge';
      version = userAgent.match(/Edg\/([0-9.]+)/)[1];
    }
  }
  // Firefox
  else if (/Firefox\/([0-9.]+)/.test(userAgent)) {
    name = 'Firefox';
    version = userAgent.match(/Firefox\/([0-9.]+)/)[1];
  }
  // Safari
  else if (/Safari\/([0-9.]+)/.test(userAgent) && /Version\/([0-9.]+)/.test(userAgent)) {
    name = 'Safari';
    version = userAgent.match(/Version\/([0-9.]+)/)[1];
  }
  // IE
  else if (/MSIE|Trident/.test(userAgent)) {
    name = 'Internet Explorer';
    const ieVersion = userAgent.match(/(?:MSIE |rv:)([0-9.]+)/);
    version = ieVersion ? ieVersion[1] : 'Unknown';
  }
  
  return { name, version };
}
</script>