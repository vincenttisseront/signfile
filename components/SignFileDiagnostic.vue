<template>
  <div class="bg-security/5 p-4 rounded-lg mt-4">
    <h3 class="text-lg font-semibold mb-2 text-security">Diagnostic Tools</h3>
    
    <div class="space-y-4">
      <div>
        <button @click="testButtonClick" class="btn btn-primary btn-sm">
          Test Button Click
        </button>
        <span v-if="testButtonClicked" class="ml-2 text-currency">✓ Button click works</span>
      </div>
      
      <div>
        <button @click="testFormSubmission" class="btn btn-primary btn-sm">
          Test Form Submit
        </button>
        <span v-if="formSubmitStatus" class="ml-2" :class="formSubmitStatus === 'success' ? 'text-currency' : 'text-energy'">
          {{ formSubmitStatus === 'success' ? '✓ Form submission works' : '✗ Form submission failed' }}
        </span>
      </div>
      
      <div>
        <button @click="testApiConnection" class="btn btn-primary btn-sm">
          Test API Connection
        </button>
        <span v-if="apiStatus" class="ml-2" :class="apiStatus === 'success' ? 'text-currency' : 'text-energy'">
          {{ apiStatus === 'success' ? '✓ API connection works' : '✗ API connection failed' }}
        </span>
      </div>
      
      <div>
        <button @click="testScriptFileHandling" class="btn btn-primary btn-sm">
          Test File Handling
        </button>
        <span v-if="fileHandlingStatus" class="ml-2" :class="fileHandlingStatus === 'success' ? 'text-currency' : 'text-energy'">
          {{ fileHandlingStatus === 'success' ? '✓ File handling works' : '✗ File handling failed' }}
        </span>
      </div>
      
      <div v-if="diagnosticResult" class="mt-4 p-3 bg-security/10 rounded text-sm">
        <h4 class="font-semibold mb-1">Diagnostic Results:</h4>
        <pre class="whitespace-pre-wrap">{{ diagnosticResult }}</pre>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const testButtonClicked = ref(false);
const formSubmitStatus = ref(null);
const apiStatus = ref(null);
const fileHandlingStatus = ref(null);
const diagnosticResult = ref('');

// Test basic button click functionality
function testButtonClick() {
  testButtonClicked.value = true;
  diagnosticResult.value = 'Button click test successful. UI events are working.';
}

// Test form submission
async function testFormSubmission() {
  try {
    // Create a simple form element and submit it
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = '/api/health'; // Use a simple endpoint for testing
    document.body.appendChild(form);
    
    // Track form submission
    const formSubmitPromise = new Promise((resolve) => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        resolve(true);
      });
    });
    
    // Submit the form
    form.dispatchEvent(new Event('submit'));
    
    // Check if the form submission event was triggered
    const wasSubmitted = await formSubmitPromise;
    
    // Clean up
    document.body.removeChild(form);
    
    if (wasSubmitted) {
      formSubmitStatus.value = 'success';
      diagnosticResult.value = 'Form submission test successful. Form events are working.';
    } else {
      formSubmitStatus.value = 'error';
      diagnosticResult.value = 'Form submission test failed. Form events may not be triggering.';
    }
  } catch (error) {
    formSubmitStatus.value = 'error';
    diagnosticResult.value = `Form submission test error: ${error.message}`;
  }
}

// Test API connection
async function testApiConnection() {
  try {
    const startTime = Date.now();
    const response = await fetch('/api/health');
    const endTime = Date.now();
    
    if (response.ok) {
      const data = await response.json();
      apiStatus.value = 'success';
      diagnosticResult.value = `API connection successful in ${endTime - startTime}ms.\nResponse: ${JSON.stringify(data, null, 2)}`;
    } else {
      apiStatus.value = 'error';
      diagnosticResult.value = `API connection failed with status ${response.status}.\nResponse: ${await response.text()}`;
    }
  } catch (error) {
    apiStatus.value = 'error';
    diagnosticResult.value = `API connection error: ${error.message}`;
  }
}

// Test file handling
function testScriptFileHandling() {
  try {
    // Create a test file (text blob)
    const testContent = 'Test script file content';
    const testBlob = new Blob([testContent], { type: 'text/plain' });
    const testFile = new File([testBlob], 'test-script.cmd', { type: 'text/plain' });
    
    // Verify File object properties
    if (testFile && testFile.name && testFile.size > 0) {
      fileHandlingStatus.value = 'success';
      diagnosticResult.value = `File handling test successful.\nCreated test file: ${testFile.name}\nSize: ${testFile.size} bytes\nType: ${testFile.type}`;
      
      // Check FormData functionality
      try {
        const formData = new FormData();
        formData.append('script', testFile);
        formData.append('test', 'value');
        
        // Verify FormData contains the file
        if (formData.has('script') && formData.has('test')) {
          diagnosticResult.value += '\n\nFormData test successful. FormData can properly contain files.';
        } else {
          diagnosticResult.value += '\n\nWarning: FormData test partially failed. FormData may not be working correctly.';
        }
      } catch (formError) {
        diagnosticResult.value += `\n\nFormData test error: ${formError.message}`;
      }
    } else {
      fileHandlingStatus.value = 'error';
      diagnosticResult.value = 'File handling test failed. Could not create a valid File object.';
    }
  } catch (error) {
    fileHandlingStatus.value = 'error';
    diagnosticResult.value = `File handling error: ${error.message}`;
  }
}
</script>