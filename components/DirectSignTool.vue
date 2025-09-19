<template>
  <div class="p-4 bg-white rounded shadow mb-4">
    <h3 class="font-bold text-lg mb-3">Direct Sign and Download Tool</h3>
    <p class="text-sm mb-4">This tool provides a direct download method that bypasses client-side JavaScript processing.</p>
    
    <form 
      ref="directForm"
      action="/api/sign" 
      method="POST" 
      enctype="multipart/form-data"
      target="_blank"
      @submit="onFormSubmit"
      class="space-y-4"
    >
      <div>
        <label for="direct-certificate" class="block text-sm font-medium mb-1">Certificate:</label>
        <select 
          id="direct-certificate" 
          name="storedCert" 
          class="form-select w-full"
          v-model="selectedCert"
          required
        >
          <option value="">-- Select Certificate --</option>
          <option v-for="cert in certificates" :key="cert" :value="cert">
            {{ cert }}
          </option>
        </select>
      </div>
      
      <div>
        <label for="direct-password" class="block text-sm font-medium mb-1">Certificate Password:</label>
        <input 
          id="direct-password" 
          type="password" 
          name="password" 
          class="form-input w-full"
          v-model="password"
          required
        />
      </div>
      
      <div>
        <label for="direct-file" class="block text-sm font-medium mb-1">File to Sign:</label>
        <input 
          id="direct-file" 
          type="file" 
          name="script" 
          class="form-input w-full"
          @change="handleFileChange"
          required
        />
      </div>
      
      <div class="flex justify-between items-center">
        <button 
          type="submit" 
          class="btn btn-primary"
          :disabled="!isFormValid || isSubmitting"
        >
          <span v-if="isSubmitting">Signing...</span>
          <span v-else>Sign and Download</span>
        </button>
        
        <div v-if="isSubmitting" class="ml-3 text-sm text-gray-600">
          <span class="inline-block animate-spin mr-1">↻</span> 
          Processing - A download dialog should appear shortly...
        </div>
        
        <button 
          type="button" 
          class="btn btn-outline-secondary"
          @click="testHeaders"
          :disabled="isSubmitting"
        >
          Test Headers
        </button>
      </div>
    </form>
    
    <div v-if="headerInfo" class="mt-4 p-3 bg-blue-50 rounded text-sm">
      <h4 class="font-medium mb-2">Header Test Results:</h4>
      <pre class="text-xs whitespace-pre-wrap">{{ headerInfo }}</pre>
    </div>
    
    <div v-if="formResult" class="mt-4 p-3 rounded text-sm" :class="formResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'">
      <h4 class="font-medium mb-1">Form Submission Result:</h4>
      <div>{{ formResult.message }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';

const certificates = ref([]);
const selectedCert = ref('');
const password = ref('');
const selectedFile = ref(null);
const directForm = ref(null);
const headerInfo = ref('');
const isSubmitting = ref(false);
const formResult = ref(null);

// Check if form is valid
const isFormValid = computed(() => {
  return selectedCert.value && password.value && selectedFile.value;
});

// Handle file selection
function handleFileChange(event) {
  if (event.target.files && event.target.files.length > 0) {
    selectedFile.value = event.target.files[0];
  } else {
    selectedFile.value = null;
  }
}

// Handle form submission
const onFormSubmit = async (event) => {
  // Don't prevent default - let the form submit normally to the target="_blank"
  
  isSubmitting.value = true;
  formResult.value = null;
  
  try {
    // Log submission details for debugging
    console.log('Form submission started', {
      certificate: selectedCert.value,
      file: selectedFile.value ? {
        name: selectedFile.value.name,
        type: selectedFile.value.type,
        size: selectedFile.value.size
      } : null
    });
    
    // The form will submit to a new tab via target="_blank"
    // Set a timeout to reset the submitting state
    setTimeout(() => {
      isSubmitting.value = false;
      formResult.value = {
        success: true,
        message: 'Form submitted. Check for a download in the new tab or download dialog.'
      };
    }, 3000);
    
  } catch (error) {
    console.error('Error during form submission:', error);
    isSubmitting.value = false;
    formResult.value = {
      success: false,
      message: `Error: ${error.message}`
    };
  }
};

// Test browser header handling
async function testHeaders() {
  try {
    headerInfo.value = 'Testing header handling...';
    
    const response = await fetch('/api/header-test');
    if (!response.ok) {
      headerInfo.value = `Error: ${response.status} ${response.statusText}`;
      return;
    }
    
    const data = await response.json();
    
    // Format the result
    headerInfo.value = JSON.stringify(data, null, 2);
  } catch (error) {
    headerInfo.value = `Error: ${error.message}`;
  }
}

// Fetch available certificates
async function fetchCertificates() {
  try {
    const response = await fetch('/api/certs');
    if (!response.ok) {
      console.error('Failed to fetch certificates:', response.status);
      return;
    }
    
    const certs = await response.json();
    certificates.value = certs || [];
    
    if (certificates.value.length > 0) {
      selectedCert.value = certificates.value[0];
    }
  } catch (error) {
    console.error('Error fetching certificates:', error);
  }
}

// Initialize on mount
onMounted(() => {
  fetchCertificates();
});
</script>

<style scoped>
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.animate-spin {
  animation: spin 1s linear infinite;
}
</style>