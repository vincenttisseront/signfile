<template>
  <div class="p-4 bg-white rounded shadow mb-4">
    <h3 class="text-lg font-semibold mb-3">Direct Download Test</h3>
    
    <div class="mb-4">
      <label for="testFile" class="block text-sm font-medium mb-1">Select a file to test:</label>
      <input 
        type="file" 
        id="testFile" 
        ref="fileInput"
        class="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        @change="handleFileSelect"
      />
    </div>
    
    <div class="flex flex-wrap gap-2 mb-4">
      <button 
        @click="testDownloadMethod('iframe')" 
        class="btn btn-outline-primary"
        :disabled="!selectedFile"
      >
        Test iframe Download
      </button>
      
      <button 
        @click="testDownloadMethod('server-iframe')" 
        class="btn btn-outline-primary"
        :disabled="!selectedFile"
      >
        Test Server iframe
      </button>
      
      <button 
        @click="testDownloadMethod('anchor')" 
        class="btn btn-outline-secondary"
        :disabled="!selectedFile"
      >
        Test Anchor Element
      </button>
      
      <button 
        @click="testDownloadMethod('form')" 
        class="btn btn-outline-success"
        :disabled="!selectedFile"
      >
        Test Form Submission
      </button>
      
      <button 
        @click="testDownloadMethod('fetch')" 
        class="btn btn-outline-info"
        :disabled="!selectedFile"
      >
        Test Fetch API
      </button>
    </div>
    
    <div v-if="lastResult" class="mt-4 p-3 rounded" :class="resultClass">
      <h4 class="font-medium">Last Test Result:</h4>
      <p>{{ lastResult }}</p>
      <p v-if="lastError" class="text-red-700 mt-2">
        Error: {{ lastError }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { downloadFile } from '../utils/file-download';

const fileInput = ref(null);
const selectedFile = ref(null);
const lastResult = ref('');
const lastError = ref('');
const lastStatus = ref(''); // success, error, pending

// Computed class for result box
const resultClass = computed(() => {
  if (!lastStatus.value) return 'bg-gray-100';
  
  switch (lastStatus.value) {
    case 'success': return 'bg-green-50 border border-green-200';
    case 'error': return 'bg-red-50 border border-red-200';
    case 'pending': return 'bg-blue-50 border border-blue-200';
    default: return 'bg-gray-100';
  }
});

// Handle file selection
function handleFileSelect(event) {
  if (event.target.files && event.target.files.length > 0) {
    selectedFile.value = event.target.files[0];
    lastResult.value = `File selected: ${selectedFile.value.name} (${formatFileSize(selectedFile.value.size)})`;
    lastStatus.value = '';
    lastError.value = '';
  } else {
    selectedFile.value = null;
    lastResult.value = 'No file selected';
    lastStatus.value = '';
    lastError.value = '';
  }
}

// Test a download method
async function testDownloadMethod(method) {
  if (!selectedFile.value) {
    lastResult.value = 'No file selected';
    lastStatus.value = 'error';
    return;
  }
  
  lastResult.value = `Testing ${method} download for ${selectedFile.value.name}...`;
  lastStatus.value = 'pending';
  lastError.value = '';
  
  try {
    switch (method) {
      case 'iframe':
        await testIframeDownload();
        break;
      case 'server-iframe':
        await testServerIframeDownload();
        break;
      case 'anchor':
        await testAnchorDownload();
        break;
      case 'form':
        await testFormDownload();
        break;
      case 'fetch':
        await testFetchDownload();
        break;
      default:
        throw new Error(`Unknown download method: ${method}`);
    }
    
    lastResult.value = `${method} download test initiated for ${selectedFile.value.name}`;
    lastStatus.value = 'success';
  } catch (error) {
    console.error(`Download test error (${method}):`, error);
    lastResult.value = `${method} download test failed for ${selectedFile.value.name}`;
    lastError.value = error.message;
    lastStatus.value = 'error';
  }
}

// Test server-side iframe download
async function testServerIframeDownload() {
  // Create a FormData object
  const formData = new FormData();
  formData.append('file', selectedFile.value);
  
  try {
    // Send the file to the server first
    const uploadResponse = await fetch('/api/upload-for-download', {
      method: 'POST',
      body: formData
    });
    
    if (!uploadResponse.ok) {
      throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
    }
    
    const { fileId } = await uploadResponse.json();
    
    // Create an iframe that points to the server-side download endpoint
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = `/api/download-test?fileId=${fileId}`;
    document.body.appendChild(iframe);
    
    // Clean up after a delay
    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 5000);
  } catch (error) {
    console.error('Error in server iframe download:', error);
    throw error;
  }
  
  return true;
}

// Test iframe download
async function testIframeDownload() {
  // Create a URL for the file
  const url = URL.createObjectURL(selectedFile.value);
  
  // Create an iframe
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
  
  // Set the iframe source to the file URL
  iframe.src = url;
  
  // Clean up after a delay
  setTimeout(() => {
    document.body.removeChild(iframe);
    URL.revokeObjectURL(url);
  }, 5000);
  
  return true;
}

// Test anchor download
async function testAnchorDownload() {
  // Create a URL for the file
  const url = URL.createObjectURL(selectedFile.value);
  
  // Create an anchor element
  const link = document.createElement('a');
  link.href = url;
  link.download = selectedFile.value.name;
  document.body.appendChild(link);
  
  // Click the link
  link.click();
  
  // Clean up
  document.body.removeChild(link);
  
  // Revoke the URL after a delay
  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 5000);
  
  return true;
}

// Test form download
async function testFormDownload() {
  // Create a form
  const form = document.createElement('form');
  form.method = 'post';
  form.enctype = 'multipart/form-data';
  form.target = '_blank';
  form.action = '/api/download-test';
  
  // Add the file
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.name = 'file';
  
  // Set the file
  const dt = new DataTransfer();
  dt.items.add(selectedFile.value);
  fileInput.files = dt.files;
  
  form.appendChild(fileInput);
  
  // Add to document and submit
  document.body.appendChild(form);
  form.submit();
  
  // Clean up
  setTimeout(() => {
    document.body.removeChild(form);
  }, 1000);
  
  return true;
}

// Test fetch download
async function testFetchDownload() {
  // Create a FormData object
  const formData = new FormData();
  formData.append('file', selectedFile.value);
  
  // Use the built-in downloadFile utility
  return downloadFile(selectedFile.value, selectedFile.value.name);
}

// Helper function to format file size
function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' bytes';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}
</script>